import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";
    socket = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      // Backoff: 5s initial -> caps at 60s (1/min) after ~3 failures.
      // 1 min flat is too slow for mandatory chat after transient blip;
      // exponential backoff gives spam reduction without 60s cold-start wait.
      reconnectionDelay: 5000,
      reconnectionDelayMax: 60000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });
  }
  return socket;
}
