import mongoose from "mongoose";
import { SOCKET_EVENTS } from "@wechat/shared/events";
import { UserSession } from "./models/UserSession.js";
import { Message } from "./models/Message.js";
import { verifySocketAdminToken } from "./middleware/auth.js";

function roomFor(sessionId) {
  return `session:${sessionId}`;
}

export function registerSocket(io) {
  io.adminSockets = new Set();

  const broadcastAdminStatus = () => {
    const online = io.adminSockets.size > 0;
    io.emit(SOCKET_EVENTS.ADMIN_STATUS, { online });
  };

  io.on("connection", (socket) => {
    const role = socket.handshake.auth?.role || "user";
    const token = socket.handshake.auth?.token;
    const sessionId = socket.handshake.auth?.sessionId;

    if (role === "admin") {
      if (!verifySocketAdminToken(token)) {
        socket.disconnect(true);
        return;
      }
      io.adminSockets.add(socket.id);
      broadcastAdminStatus();
    }

    if (role === "user" && sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      socket.join(roomFor(sessionId));
      UserSession.findByIdAndUpdate(sessionId, { socketId: socket.id, status: "online" }).catch(() => null);
      io.to([...io.adminSockets]).emit(SOCKET_EVENTS.USER_CONNECTED, { sessionId });
    }

    socket.on(SOCKET_EVENTS.START_SESSION, async (payload) => {
      const { sessionId: sid } = payload ?? {};
      if (!sid || !mongoose.Types.ObjectId.isValid(sid)) return;
      socket.join(roomFor(sid));
      await UserSession.findByIdAndUpdate(sid, {
        socketId: socket.id,
        status: "online",
        pageUrl: payload.pageUrl ?? ""
      });
      io.to([...io.adminSockets]).emit(SOCKET_EVENTS.USER_CONNECTED, { sessionId: sid });
    });

    socket.on(SOCKET_EVENTS.JOIN_SESSION, async ({ sessionId: sid }) => {
      if (role !== "admin" || !sid) return;
      socket.join(roomFor(sid));
      await Message.updateMany({ sessionId: sid, sender: "user", readByAdmin: false }, { $set: { readByAdmin: true } });
    });

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload) => {
      const { sessionId: sid, message } = payload ?? {};
      if (!sid || !message?.trim() || !mongoose.Types.ObjectId.isValid(sid)) return;

      const sender = role === "admin" ? "admin" : "user";
      const created = await Message.create({
        sessionId: sid,
        sender,
        message: message.trim(),
        readByAdmin: sender === "admin"
      });

      io.to(roomFor(sid)).emit(SOCKET_EVENTS.NEW_MESSAGE, created);
      io.to([...io.adminSockets]).emit(SOCKET_EVENTS.UNREAD_COUNTS, { sessionId: sid });
    });

    socket.on(SOCKET_EVENTS.TYPING, ({ sessionId: sid, isTyping }) => {
      if (!sid) return;
      socket.to(roomFor(sid)).emit(SOCKET_EVENTS.TYPING, {
        sessionId: sid,
        sender: role === "admin" ? "admin" : "user",
        isTyping: !!isTyping
      });
    });

    socket.on("disconnect", async () => {
      if (role === "admin") {
        io.adminSockets.delete(socket.id);
        broadcastAdminStatus();
      } else {
        const session = await UserSession.findOneAndUpdate(
          { socketId: socket.id },
          { status: "offline", socketId: "", lastSeenAt: new Date() },
          { new: true }
        );
        if (session) {
          io.to([...io.adminSockets]).emit(SOCKET_EVENTS.USER_DISCONNECTED, { sessionId: String(session._id) });
        }
      }
    });
  });
}
