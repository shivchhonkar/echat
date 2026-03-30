import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export function createUserSocket(sessionId) {
  return io(SOCKET_URL, {
    auth: { role: "user", sessionId },
    reconnection: true,
    transports: ["websocket", "polling"]
  });
}

export function createAdminSocket(token) {
  return io(SOCKET_URL, {
    auth: { role: "admin", token },
    reconnection: true,
    transports: ["websocket", "polling"]
  });
}
