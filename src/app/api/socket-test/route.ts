import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { emitToUser, getIo } from "@/lib/socket/emit";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const io = getIo();

  if (!io) {
    return Response.json(
      { error: "io-missing: globalThis.__io is not set" },
      { status: 500 },
    );
  }

  emitToUser(session.user.id, "test:ping", {
    at: Date.now(),
    clientsConnected: io.engine.clientsCount,
  });

  return Response.json({
    ok: true,
    userId: session.user.id,
    clientsConnected: io.engine.clientsCount,
  });
}
