import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";
    socket = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}
