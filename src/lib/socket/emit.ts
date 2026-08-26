import type { Server } from "socket.io";

declare global {
  var __io: Server | undefined;
}

export function getIo(): Server | undefined {
  return globalThis.__io;
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  const io = getIo();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToUsers(
  userIds: string[],
  event: string,
  payload: unknown,
): void {
  const io = getIo();
  if (!io) return;

  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}
