import mongoose from "mongoose";
import { SOCKET_EVENTS } from "@echat/shared/events";
import { UserSession } from "./models/UserSession.js";
import { Message } from "./models/Message.js";
import { verifySocketAdminToken } from "./middleware/auth.js";
import { formatCallLogMessage, resolveCallStatus } from "./utils/callLog.js";

function roomFor(sessionId) {
  return `session:${sessionId}`;
}

export function registerSocket(io) {
  io.adminSocketsByTenant = new Map();
  io.voiceCallState = new Map();

  async function persistVoiceCallLog(sessionId, reason = "hangup") {
    const key = String(sessionId);
    const state = io.voiceCallState.get(key);
    if (!state) return;
    io.voiceCallState.delete(key);

    if (!mongoose.Types.ObjectId.isValid(sessionId)) return;
    const session = await UserSession.findById(sessionId).select("tenantId");
    if (!session?.tenantId) return;

    const endedAt = new Date();
    const answeredAt = state.answeredAt ? new Date(state.answeredAt) : null;
    const startedAt = state.offeredAt ? new Date(state.offeredAt) : endedAt;
    const status = resolveCallStatus(state, reason);
    const durationSeconds = answeredAt
      ? Math.max(0, Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000))
      : 0;

    const callLog = {
      status,
      durationSeconds,
      initiatedBy: state.initiatedBy || "user",
      startedAt,
      answeredAt,
      endedAt
    };

    const created = await Message.create({
      tenantId: session.tenantId,
      sessionId,
      sender: callLog.initiatedBy,
      messageType: "call",
      message: formatCallLogMessage(callLog),
      callLog,
      readByAdmin: true
    });

    io.to(roomFor(sessionId)).emit(SOCKET_EVENTS.NEW_MESSAGE, created);
    io.to(`tenant:${String(session.tenantId)}`).emit(SOCKET_EVENTS.UNREAD_COUNTS, { sessionId });
  }

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
      const { sessionId: sid, message = "", messageType = "text", attachment } = payload ?? {};
      if (!sid || !mongoose.Types.ObjectId.isValid(sid)) return;

      const hasText = !!String(message).trim();
      const hasAttachment = !!attachment?.url;
      if (!hasText && !hasAttachment) return;

      const sender = role === "admin" ? "admin" : "user";
      const session = await UserSession.findById(sid).select("tenantId");
      if (!session?.tenantId) return;
      const tenantId = String(session.tenantId);

      const resolvedType = hasAttachment ? attachment.messageType || messageType || "file" : "text";
      const created = await Message.create({
        tenantId,
        sessionId: sid,
        sender,
        messageType: resolvedType,
        message: hasText ? String(message).trim() : "",
        attachment: hasAttachment
          ? {
              url: attachment.url,
              filename: attachment.filename || "",
              mimeType: attachment.mimeType || "",
              size: Number(attachment.size) || 0
            }
          : undefined,
        readByAdmin: sender === "admin"
      });

      io.to(roomFor(sid)).emit(SOCKET_EVENTS.NEW_MESSAGE, created);
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.UNREAD_COUNTS, { sessionId: sid });
    });

    const relayScreenShareToTenant = async (event, payload) => {
      const { sessionId: sid } = payload ?? {};
      if (!sid || !mongoose.Types.ObjectId.isValid(sid)) return;
      const session = await UserSession.findById(sid).select("tenantId");
      if (!session?.tenantId) return;
      socket.to(`tenant:${String(session.tenantId)}`).emit(event, payload);
    };

    socket.on(SOCKET_EVENTS.SCREEN_SHARE_OFFER, (payload) => {
      if (role !== "user") return;
      relayScreenShareToTenant(SOCKET_EVENTS.SCREEN_SHARE_OFFER, payload);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_ANSWER, (payload) => {
      if (role !== "admin") return;
      relayScreenShareToTenant(SOCKET_EVENTS.SCREEN_SHARE_ANSWER, payload);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_ICE, (payload) => {
      relayScreenShareToTenant(SOCKET_EVENTS.SCREEN_SHARE_ICE, payload);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_STOP, (payload) => {
      if (role !== "user") return;
      relayScreenShareToTenant(SOCKET_EVENTS.SCREEN_SHARE_STOP, payload);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_REQUEST, (payload) => {
      if (role !== "admin") return;
      const { sessionId: sid } = payload ?? {};
      if (!sid) return;
      socket.to(roomFor(sid)).emit(SOCKET_EVENTS.SCREEN_SHARE_REQUEST, payload);
    });

    const relayVoiceToTenant = async (event, payload) => {
      const { sessionId: sid } = payload ?? {};
      if (!sid || !mongoose.Types.ObjectId.isValid(sid)) return;
      const session = await UserSession.findById(sid).select("tenantId");
      if (!session?.tenantId) return;
      socket.to(`tenant:${String(session.tenantId)}`).emit(event, payload);
    };

    socket.on(SOCKET_EVENTS.VOICE_CALL_OFFER, (payload) => {
      const { sessionId: sid, callerRole = "user" } = payload ?? {};
      if (sid && mongoose.Types.ObjectId.isValid(sid)) {
        const key = String(sid);
        const existing = io.voiceCallState.get(key);
        io.voiceCallState.set(key, {
          initiatedBy: callerRole === "admin" ? "admin" : "user",
          offeredAt: existing?.offeredAt || Date.now(),
          answeredAt: existing?.answeredAt || null
        });
      }
      relayVoiceToTenant(SOCKET_EVENTS.VOICE_CALL_OFFER, payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_ANSWER, (payload) => {
      const { sessionId: sid } = payload ?? {};
      if (sid) {
        const state = io.voiceCallState.get(String(sid));
        if (state && !state.answeredAt) {
          state.answeredAt = Date.now();
          io.voiceCallState.set(String(sid), state);
        }
      }
      relayVoiceToTenant(SOCKET_EVENTS.VOICE_CALL_ANSWER, payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_ICE, (payload) => {
      relayVoiceToTenant(SOCKET_EVENTS.VOICE_CALL_ICE, payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_END, async (payload) => {
      const { sessionId: sid, reason = "hangup" } = payload ?? {};
      if (sid) {
        await persistVoiceCallLog(sid, reason);
      }
      relayVoiceToTenant(SOCKET_EVENTS.VOICE_CALL_END, payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_MUTE_STATE, (payload) => {
      relayVoiceToTenant(SOCKET_EVENTS.VOICE_MUTE_STATE, payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_REMOTE_MUTE, (payload) => {
      if (role !== "admin") return;
      relayVoiceToTenant(SOCKET_EVENTS.VOICE_REMOTE_MUTE, payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_REQUEST, (payload) => {
      if (role !== "admin") return;
      const { sessionId: sid } = payload ?? {};
      if (!sid) return;
      socket.to(roomFor(sid)).emit(SOCKET_EVENTS.VOICE_CALL_REQUEST, payload);
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
