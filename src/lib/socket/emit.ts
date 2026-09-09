const SOCKET_INTERNAL_URL =
  process.env.SOCKET_INTERNAL_URL || "http://localhost:5000";
const INTERNAL_SECRET =
  process.env.SOCKET_INTERNAL_SECRET || "dev-secret-change-in-production";

async function internalEmit(payload: {
  event: string;
  payload: unknown;
  userId?: string;
  userIds?: string[];
}) {
  try {
    const response = await fetch(`${SOCKET_INTERNAL_URL}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: INTERNAL_SECRET,
        ...payload,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("[socket] Failed to emit:", error);
    }
  } catch (error) {
    console.error("[socket] Internal emit request failed:", error);
  }
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  internalEmit({ event, payload, userId });
}

export function emitToUsers(
  userIds: string[],
  event: string,
  payload: unknown,
): void {
  internalEmit({ event, payload, userIds });
}
