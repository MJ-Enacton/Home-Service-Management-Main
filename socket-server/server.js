import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { neon } from "@neondatabase/serverless";

const SOCKET_PORT = Number(process.env.SOCKET_PORT) || 5000;
// Render (and most hosts) inject PORT for the public listener. SOCKET_PORT
// remains the local-dev override. APP_PORT is deliberately separate so a
// host-provided PORT never corrupts the localhost CORS fallback below.
const LISTEN_PORT = Number(process.env.PORT) || SOCKET_PORT;
const APP_PORT = Number(process.env.APP_PORT) || 3000;
const INTERNAL_SECRET =
  process.env.SOCKET_INTERNAL_SECRET || "dev-secret-change-in-production";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.SOCKET_INTERNAL_SECRET
) {
  console.error(
    "[socket] Missing SOCKET_INTERNAL_SECRET in production — refusing to start.",
  );
  process.exit(1);
}

// SOCKET_CORS_ORIGIN (comma-separated, preferred) with SOCKET_URL (single,
// legacy) fallback so existing deploys keep working.
const allowedOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : process.env.SOCKET_URL
    ? [process.env.SOCKET_URL]
    : [`http://localhost:${APP_PORT}`];

const sql = neon(process.env.DATABASE_URL);

async function getUserFromRequest(req) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, ...value] = cookie.trim().split("=");
      return [key, decodeURIComponent(value.join("="))];
    }),
  );

  const rawToken = cookies["better-auth.session_token"];

  if (!rawToken) {
    return null;
  }

  const token = rawToken.split(".")[0];

  try {
    const rows = await sql`
      SELECT
        s.user_id AS "userId",
        u.name AS "name",
        u.role AS "role"
      FROM "session" s
      JOIN "user" u ON u.id = s.user_id
      WHERE
        s.token = ${token}
        AND s.expires_at > NOW()
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch (error) {
    console.error("[socket] Session lookup failed:", error);
    return null;
  }
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/internal/emit") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const { secret, event, payload, userId, userIds } = JSON.parse(body);

      if (secret !== INTERNAL_SECRET) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      if (userId) {
        io.to(`user:${userId}`).emit(event, payload);
      } else if (userIds && Array.isArray(userIds)) {
        const unique = [...new Set(userIds)];
        for (const id of unique) {
          io.to(`user:${id}`).emit(event, payload);
        }
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "userId or userIds required" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error("[socket] Internal emit error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", connections: io.engine.clientsCount }),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    const user = await getUserFromRequest(socket.request);

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;
    socket.join(`user:${user.userId}`);

    next();
  } catch (error) {
    console.error("[socket] Authentication failed:", error);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;

  console.log(`[socket] connected: user=${user.userId} (${user.role})`);

  socket.on("chat:typing", async (payload) => {
    try {
      const bookingId = payload?.bookingId;
      const isTyping = payload?.isTyping;
      if (typeof bookingId !== "string" || typeof isTyping !== "boolean")
        return;

      const rows = await sql`
        SELECT
          customer_id AS "customerId",
          provider_id AS "providerId"
        FROM bookings
        WHERE id = ${bookingId}
          AND status IN ('confirmed', 'in_progress')
        LIMIT 1
      `;

      const booking = rows[0];
      if (!booking) return;
      if (
        booking.customerId !== user.userId &&
        booking.providerId !== user.userId
      )
        return;

      const counterpartyId =
        booking.customerId === user.userId
          ? booking.providerId
          : booking.customerId;

      io.to(`user:${counterpartyId}`).emit("chat:typing", {
        bookingId,
        isTyping,
        userId: user.userId,
        userName: user.name,
      });
    } catch (error) {
      console.error("[socket] typing relay failed:", error);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: user=${user.userId}, reason=${reason}`);
  });
});

httpServer.listen(LISTEN_PORT, () => {
  console.log(`> Socket.IO running on http://localhost:${LISTEN_PORT}`);
});
