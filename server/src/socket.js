import mongoose from "mongoose";
import { SOCKET_EVENTS } from "@wechat/shared/events";
import { UserSession } from "./models/UserSession.js";
import { Message } from "./models/Message.js";
import { verifySocketAdminToken } from "./middleware/auth.js";

function roomFor(sessionId) {
  return `session:${sessionId}`;
}

export function registerSocket(io) {
  io.adminSocketsByTenant = new Map();

  const broadcastAdminStatus = (tenantId) => {
    const online = (io.adminSocketsByTenant.get(String(tenantId))?.size ?? 0) > 0;
    io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.ADMIN_STATUS, { online });
  };

  io.on("connection", (socket) => {
    const role = socket.handshake.auth?.role || "user";
    const token = socket.handshake.auth?.token;
    const sessionId = socket.handshake.auth?.sessionId;
    let adminTenantId = null;

    if (role === "admin") {
      const payload = verifySocketAdminToken(token);
      if (!payload || !payload.tenantId) {
        socket.disconnect(true);
        return;
      }
      adminTenantId = String(payload.tenantId);
      const current = io.adminSocketsByTenant.get(adminTenantId) || new Set();
      current.add(socket.id);
      io.adminSocketsByTenant.set(adminTenantId, current);
      socket.join(`tenant:${adminTenantId}`);
      broadcastAdminStatus(adminTenantId);
    }

    if (role === "user" && sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      socket.join(roomFor(sessionId));
      UserSession.findByIdAndUpdate(sessionId, { socketId: socket.id, status: "online" })
        .then((session) => {
          if (!session?.tenantId) return;
          socket.join(`tenant:${String(session.tenantId)}`);
          io.to(`tenant:${String(session.tenantId)}`).emit(SOCKET_EVENTS.USER_CONNECTED, { sessionId });
          broadcastAdminStatus(String(session.tenantId));
        })
        .catch(() => null);
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
      const session = await UserSession.findById(sid).select("tenantId");
      if (session?.tenantId) {
        const tenantId = String(session.tenantId);
        socket.join(`tenant:${tenantId}`);
        io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.USER_CONNECTED, { sessionId: sid });
      }
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
      const session = await UserSession.findById(sid).select("tenantId");
      if (!session?.tenantId) return;
      const tenantId = String(session.tenantId);
      const created = await Message.create({
        tenantId,
        sessionId: sid,
        sender,
        message: message.trim(),
        readByAdmin: sender === "admin"
      });

      io.to(roomFor(sid)).emit(SOCKET_EVENTS.NEW_MESSAGE, created);
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.UNREAD_COUNTS, { sessionId: sid });
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
        if (!adminTenantId) return;
        const set = io.adminSocketsByTenant.get(adminTenantId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) io.adminSocketsByTenant.delete(adminTenantId);
          else io.adminSocketsByTenant.set(adminTenantId, set);
        }
        broadcastAdminStatus(adminTenantId);
      } else {
        const session = await UserSession.findOneAndUpdate(
          { socketId: socket.id },
          { status: "offline", socketId: "", lastSeenAt: new Date() },
          { new: true }
        );
        if (session) {
          io.to(`tenant:${String(session.tenantId)}`).emit(SOCKET_EVENTS.USER_DISCONNECTED, { sessionId: String(session._id) });
        }
      }
    });
  });
}
