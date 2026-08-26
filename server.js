import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import next from "next";
import { neon } from "@neondatabase/serverless";

// Two DIFFERENT ports in ONE process:
//   - Next.js app  -> PORT        (default 3000)
//   - Socket.IO    -> SOCKET_PORT (default 5000)
const APP_PORT = Number(process.env.PORT) || 3000;
const SOCKET_PORT = Number(process.env.SOCKET_PORT) || 5000;

const allowedOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [`http://localhost:${APP_PORT}`];

const sql = neon(process.env.DATABASE_URL);

// --------------------
// Session
// --------------------

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

  // Cookie format is "<token>.<signature>" (signed by better-auth).
  // Only the token part is stored in the database.
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

// --------------------
// Next.js app (APP_PORT)
// --------------------

const dev = process.argv.includes("--dev");
const app = next({ dev });

await app.prepare();

const handle = app.getRequestHandler();

const appHttpServer = createServer((req, res) => handle(req, res));

appHttpServer.listen(APP_PORT, () => {
  console.log(
    `> Next.js running on http://localhost:${APP_PORT} (${dev ? "development" : "production"})`,
  );
});

// --------------------
// HTTP + Socket.IO (SOCKET_PORT)
// --------------------

const socketHttpServer = createServer();

const io = new Server(socketHttpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// --------------------
// Authentication
// --------------------

io.use(async (socket, next) => {
  try {
    const user = await getUserFromRequest(socket.request);

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;

    // Private room for this user
    socket.join(`user:${user.userId}`);

    next();
  } catch (error) {
    console.error("[socket] Authentication failed:", error);

    next(new Error("Unauthorized"));
  }
});

// --------------------
// Connections
// --------------------

io.on("connection", (socket) => {
  const user = socket.data.user;

  console.log(`[socket] connected: user=${user.userId} (${user.role})`);

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: user=${user.userId}, reason=${reason}`);
  });
});

// Make Socket.IO accessible from other server-side code
globalThis.__io = io;

socketHttpServer.listen(SOCKET_PORT, () => {
  console.log(`> Socket.IO running on http://localhost:${SOCKET_PORT}`);
});
