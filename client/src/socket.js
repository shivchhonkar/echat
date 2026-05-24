import { io } from "socket.io-client";

/** Undefined = same origin (Vite proxies /socket.io → backend) */
function resolveSocketUrl() {
  const raw = import.meta.env.VITE_SOCKET_URL;
  if (raw === undefined || raw === "") return undefined;
  return String(raw).replace(/\/$/, "");
}

const SOCKET_URL = resolveSocketUrl();

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
