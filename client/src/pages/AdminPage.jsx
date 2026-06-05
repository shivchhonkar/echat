import { useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@echat/shared/events";
import { adminLogin, getMessages, getSessions, getTenantAdminMessages, markTenantAdminMessageRead, uploadAttachment } from "../api";
import { createAdminSocket } from "../socket";
import MessageList from "../components/MessageList";
import { createScreenShareViewer } from "../utils/screenShare";
import { createVoiceCallManager } from "../utils/voiceCall";
import VoiceCallBar, { VoiceCallStartButton } from "../components/VoiceCallBar";
import IncomingCallPanel from "../components/IncomingCallPanel";
import { startIncomingCallRingtone, stopIncomingCallRingtone } from "../utils/callRingtone";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { toast } from "../utils/toast";

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

async function requestElementFullscreen(element) {
  if (element.requestFullscreen) return element.requestFullscreen();
  if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
  throw new Error("Fullscreen is not supported");
}

async function exitDocumentFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
}

function FullscreenEnterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FullscreenExitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 9H5V5M15 5h4v4M5 15v4h4M19 15v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function notifySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // ignore
  }
}

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [tenantSlug, setTenantSlug] = useState(localStorage.getItem("admin_tenant_slug") || "default");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [adminNotices, setAdminNotices] = useState([]);
  const [confirmSignout, setConfirmSignout] = useState(false);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);
  const screenVideoRef = useRef(null);
  const screenSharePanelRef = useRef(null);
  const screenShareRef = useRef(null);
  const voiceCallRef = useRef(null);
  const remoteVoiceAudioRef = useRef(null);
  const sessionIdRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [screenViewing, setScreenViewing] = useState(false);
  const [screenShareFullscreen, setScreenShareFullscreen] = useState(false);
  const [voiceCallActive, setVoiceCallActive] = useState(false);
  const [selfVoiceMuted, setSelfVoiceMuted] = useState(false);
  const [remoteVoiceMuted, setRemoteVoiceMuted] = useState(false);
  const [customerMutedByAdmin, setCustomerMutedByAdmin] = useState(false);
  const [incomingVoiceCall, setIncomingVoiceCall] = useState(null);
  const incomingVoiceCallRef = useRef(null);
  const voiceCallActiveRef = useRef(false);
  const sessionsRef = useRef([]);

  const sessionId = selectedSession?._id;
  sessionIdRef.current = sessionId;
  incomingVoiceCallRef.current = incomingVoiceCall;
  voiceCallActiveRef.current = voiceCallActive;
  sessionsRef.current = sessions;

  function ensureVoiceCallManager(activeSessionId) {
    const socket = socketRef.current;
    if (!socket || !activeSessionId) return null;
    if (!voiceCallRef.current) {
      voiceCallRef.current = createVoiceCallManager(socket, activeSessionId, "admin", {
        onActiveChange: setVoiceCallActive,
        onSelfMuteChange: setSelfVoiceMuted,
        onRemoteMuteChange: setRemoteVoiceMuted,
        getRemoteAudioEl: () => remoteVoiceAudioRef.current,
      });
    }
    return voiceCallRef.current;
  }

  function dismissIncomingCall() {
    stopIncomingCallRingtone();
    setIncomingVoiceCall(null);
  }

  function endVoiceCall() {
    voiceCallRef.current?.endCall();
    voiceCallRef.current = null;
    setVoiceCallActive(false);
    setSelfVoiceMuted(false);
    setRemoteVoiceMuted(false);
    setCustomerMutedByAdmin(false);
  }

  function handleVoiceCallOffer(payload) {
    if (payload?.callerRole !== "user") return;
    if (voiceCallActiveRef.current) return;
    if (incomingVoiceCallRef.current) {
      if (String(payload?.sessionId) === String(incomingVoiceCallRef.current.sessionId)) {
        setIncomingVoiceCall((prev) => (prev ? { ...prev, offer: payload.offer } : prev));
      }
      return;
    }

    const offerSessionId = payload?.sessionId;
    if (!offerSessionId) return;
    const caller = sessionsRef.current.find((s) => String(s._id) === String(offerSessionId));
    setIncomingVoiceCall({
      sessionId: offerSessionId,
      offer: payload.offer,
      callerName: caller?.name || "Customer",
    });
  }

  async function acceptIncomingCall() {
    const call = incomingVoiceCallRef.current;
    if (!call) return;
    dismissIncomingCall();

    try {
      const session = sessionsRef.current.find((s) => String(s._id) === String(call.sessionId));
      if (session && String(sessionIdRef.current) !== String(call.sessionId)) {
        setSelectedSession(session);
        sessionIdRef.current = session._id;
        const data = await getMessages(session._id, token);
        setMessages(data);
        socketRef.current?.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId: session._id });
      }

      voiceCallRef.current = null;
      const manager = ensureVoiceCallManager(call.sessionId);
      await manager?.handleOffer({ sessionId: call.sessionId, offer: call.offer });
      toast.success("Voice call connected");
    } catch (err) {
      endVoiceCall();
      toast.error(err.message || "Could not join voice call");
    }
  }

  function declineIncomingCall() {
    const call = incomingVoiceCallRef.current;
    if (!call) return;
    dismissIncomingCall();
    socketRef.current?.emit(SOCKET_EVENTS.VOICE_CALL_END, { sessionId: call.sessionId, reason: "declined" });
  }

  async function startVoiceCall() {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return toast.error("Select a conversation first");
    if (voiceCallActive || incomingVoiceCall) return;
    try {
      endVoiceCall();
      const manager = ensureVoiceCallManager(activeSessionId);
      await manager?.startCall();
      toast.success("Voice call started");
    } catch (err) {
      endVoiceCall();
      toast.error(err.message || "Could not start voice call");
    }
  }

  function toggleSelfVoiceMute() {
    voiceCallRef.current?.toggleSelfMute();
  }

  function toggleCustomerVoiceMute() {
    const nextMuted = !customerMutedByAdmin;
    voiceCallRef.current?.adminMuteCustomer(nextMuted);
    setCustomerMutedByAdmin(nextMuted);
  }

  async function handleScreenShareOffer(payload) {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;

    setScreenViewing(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const socket = socketRef.current;
    if (!socket) return;

    screenShareRef.current?.stop();
    screenShareRef.current = createScreenShareViewer(
      socket,
      activeSessionId,
      () => screenVideoRef.current,
      setScreenViewing
    );

    try {
      await screenShareRef.current.handleOffer(payload);
      await screenShareRef.current.attachStream?.();
    } catch {
      screenShareRef.current?.stop();
      screenShareRef.current = null;
      setScreenViewing(false);
      toast.error("Could not connect to screen share");
    }
  }

  useEffect(() => {
    if (!token) return;
    loadSessions();
    const socket = createAdminSocket(token);
    socketRef.current = socket;

    socket.on(SOCKET_EVENTS.USER_CONNECTED, loadSessions);
    socket.on(SOCKET_EVENTS.USER_DISCONNECTED, loadSessions);
    socket.on(SOCKET_EVENTS.UNREAD_COUNTS, loadSessions);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(msg.sessionId) !== String(activeSessionId)) {
        notifySound();
        loadSessions();
        return;
      }
      setMessages((prev) => [...prev, msg]);
      if (msg.sender === "user") notifySound();
    });
    socket.on(SOCKET_EVENTS.TYPING, ({ sender, isTyping }) => {
      if (sender === "user") setTyping(!!isTyping);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_OFFER, (payload) => {
      handleScreenShareOffer(payload);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_ICE, (payload) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;
      screenShareRef.current?.handleIce(payload);
    });
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_STOP, (payload) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;
      screenShareRef.current?.stop();
      screenShareRef.current = null;
      setScreenViewing(false);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_OFFER, (payload) => {
      handleVoiceCallOffer(payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_ANSWER, (payload) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;
      voiceCallRef.current?.handleAnswer(payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_ICE, (payload) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;
      voiceCallRef.current?.handleIce(payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_CALL_END, (payload) => {
      const endedSessionId = payload?.sessionId;
      if (
        incomingVoiceCallRef.current &&
        String(incomingVoiceCallRef.current.sessionId) === String(endedSessionId)
      ) {
        dismissIncomingCall();
        return;
      }
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(endedSessionId) !== String(activeSessionId)) return;
      voiceCallRef.current?.endCall(false);
      voiceCallRef.current = null;
      setVoiceCallActive(false);
      setSelfVoiceMuted(false);
      setRemoteVoiceMuted(false);
      setCustomerMutedByAdmin(false);
    });
    socket.on(SOCKET_EVENTS.VOICE_MUTE_STATE, (payload) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;
      voiceCallRef.current?.handleRemoteMuteState(payload);
    });
    socket.on(SOCKET_EVENTS.VOICE_REMOTE_MUTE, (payload) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(payload?.sessionId) !== String(activeSessionId)) return;
      setCustomerMutedByAdmin(!!payload?.muted);
    });

    return () => {
      screenShareRef.current?.stop();
      screenShareRef.current = null;
      dismissIncomingCall();
      endVoiceCall();
      socket.close();
    };
  }, [token]);

  useEffect(() => {
    if (!incomingVoiceCall) {
      stopIncomingCallRingtone();
      return undefined;
    }
    startIncomingCallRingtone();
    return () => stopIncomingCallRingtone();
  }, [incomingVoiceCall]);

  useEffect(() => {
    if (!screenViewing) return;
    screenShareRef.current?.attachStream?.();
  }, [screenViewing]);

  useEffect(() => {
    function syncFullscreenState() {
      setScreenShareFullscreen(getFullscreenElement() === screenSharePanelRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    if (screenViewing) return;
    if (getFullscreenElement() === screenSharePanelRef.current) {
      exitDocumentFullscreen().catch(() => null);
    }
    setScreenShareFullscreen(false);
  }, [screenViewing]);

  async function exitScreenShareFullscreen() {
    if (getFullscreenElement() === screenSharePanelRef.current) {
      await exitDocumentFullscreen().catch(() => null);
    }
    setScreenShareFullscreen(false);
  }

  async function toggleScreenShareFullscreen() {
    const panel = screenSharePanelRef.current;
    if (!panel || !screenViewing) return;
    try {
      if (getFullscreenElement() === panel) {
        await exitDocumentFullscreen();
        setScreenShareFullscreen(false);
      } else {
        await requestElementFullscreen(panel);
        setScreenShareFullscreen(true);
      }
    } catch {
      toast.error("Fullscreen is not available in this browser");
    }
  }

  async function loadSessions() {
    if (!token) return;
    const data = await getSessions(token);
    setSessions(data);
  }

  async function loadAdminNotices() {
    if (!token) return;
    const data = await getTenantAdminMessages(token);
    setAdminNotices(data);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!tenantSlug.trim()) return toast.error("Tenant slug is required");
    if (!email.trim()) return toast.error("Email is required");
    if (!password.trim()) return toast.error("Password is required");
    try {
      const { token: newToken } = await adminLogin(email, password, tenantSlug);
      localStorage.setItem("admin_token", newToken);
      localStorage.setItem("admin_tenant_slug", tenantSlug);
      setToken(newToken);
      toast.success("Admin login successful");
    } catch (err) {
      toast.error(err.message || "Login failed");
    }
  }

  function handleSignout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_tenant_slug");
    socketRef.current?.close();
    setToken("");
    setSelectedSession(null);
    setMessages([]);
    setSessions([]);
    setConfirmSignout(false);
    toast.success("Signed out successfully");
  }

  async function openSession(session) {
    await exitScreenShareFullscreen();
    screenShareRef.current?.stop();
    screenShareRef.current = null;
    setScreenViewing(false);
    dismissIncomingCall();
    endVoiceCall();
    setSelectedSession(session);
    try {
      const data = await getMessages(session._id, token);
      setMessages(data);
      socketRef.current?.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId: session._id });
      socketRef.current?.emit(SOCKET_EVENTS.SCREEN_SHARE_REQUEST, { sessionId: session._id });
      socketRef.current?.emit(SOCKET_EVENTS.VOICE_CALL_REQUEST, { sessionId: session._id });
      loadSessions();
    } catch {
      toast.error("Failed to open conversation");
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!sessionId) return toast.error("Select a conversation first");
    if (!text.trim()) return toast.error("Message cannot be empty");
    socketRef.current?.emit(SOCKET_EVENTS.SEND_MESSAGE, { sessionId, message: text.trim() });
    setText("");
    socketRef.current?.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: false });
    toast.success("Message sent");
  }

  function onType(value) {
    setText(value);
    if (!sessionId) return;
    socketRef.current?.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: false });
    }, 800);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !sessionId || !socketRef.current) return;
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file, sessionId, { token });
      socketRef.current.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        sessionId,
        message: text.trim() || "",
        messageType: uploaded.messageType,
        attachment: uploaded
      });
      setText("");
      toast.success("File sent");
    } catch (err) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function stopScreenView() {
    await exitScreenShareFullscreen();
    screenShareRef.current?.stop();
    screenShareRef.current = null;
    setScreenViewing(false);
  }

  const activeLabel = useMemo(
    () => (selectedSession ? `${selectedSession.name}${selectedSession.email ? ` (${selectedSession.email})` : ""}` : "Select a chat"),
    [selectedSession]
  );

  useEffect(() => {
    loadAdminNotices();
  }, [token]);

  if (!token) {
    return (
      <div className="admin-auth-wrap">
        <Header />
        <form className="panel admin-auth-panel" onSubmit={handleLogin}>
          <h2 className="font-normal" style={{ fontSize: "24px", fontWeight: "500" }}>Admin Login</h2>
          <p className="muted">Access your tenant support inbox with slug-based login.</p>
          <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Tenant slug (e.g. default)" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
          <button className="primary-cta">Login</button>
          <div className="admin-auth-links">
            <a className="text-link" href="/signup">Create new tenant</a>
            <a className="text-link" href="/super-admin">Open platform admin</a>
            <a className="text-link" href="/">Back to home</a>
          </div>
        </form>
        <Footer />
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-topbar">
        <div>
          <strong>Tenant Admin Console</strong>
          <p className="muted">Workspace: {tenantSlug}</p>
        </div>
        <div className="actions">
          <button onClick={loadSessions}>Refresh</button>
          <button
            className="danger"
            onClick={() => setConfirmSignout(true)}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="admin-layout">
      <aside className="sessions-panel">
        <div className="sessions-head">
          <h3>Active users</h3>
          <button onClick={loadSessions}>Refresh</button>
        </div>
        <div className="sessions-list">
          {sessions.map((s) => (
            <button
              key={s._id}
              onClick={() => openSession(s)}
              className={`session-item ${sessionId === s._id ? "active" : ""}`}
            >
              <div>
                <strong>{s.name}</strong>
                <p>{s.email || "No email"}{s.phone ? ` • ${s.phone}` : ""} • {s.status}</p>
                <small>{s.pageUrl || "Unknown page"}</small>
              </div>
              {s.unreadCount > 0 ? <span className="badge">{s.unreadCount}</span> : null}
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-panel">
        {adminNotices.length > 0 ? (
          <div className="admin-notice-list">
            {adminNotices.slice(0, 3).map((n) => (
              <div key={n._id} className={`admin-notice ${n.read ? "read" : ""}`}>
                <div>
                  <strong>{n.subject}</strong>
                  <p>{n.message}</p>
                </div>
                {!n.read ? (
                  <button onClick={() => markTenantAdminMessageRead(token, n._id).then(loadAdminNotices)}>
                    Mark read
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <header className="chat-head">
          <strong>{activeLabel}</strong>
          <div className="chat-head-actions">
            {!voiceCallActive ? (
              <VoiceCallStartButton onClick={startVoiceCall} disabled={!sessionId} />
            ) : null}
            {screenViewing ? (
              <button type="button" className="screen-share-stop-btn" onClick={stopScreenView}>
                Stop screen view
              </button>
            ) : null}
          </div>
        </header>
        <audio ref={remoteVoiceAudioRef} autoPlay playsInline className="voice-call-audio-sink" />
        <VoiceCallBar
          inCall={voiceCallActive}
          selfMuted={selfVoiceMuted}
          remoteMuted={remoteVoiceMuted}
          isAdmin
          remoteLabel={selectedSession?.name || "Customer"}
          customerMutedByAdmin={customerMutedByAdmin}
          onToggleSelfMute={toggleSelfVoiceMute}
          onToggleCustomerMute={toggleCustomerVoiceMute}
          onEndCall={endVoiceCall}
        />
        <div
          ref={screenSharePanelRef}
          className={screenViewing ? "admin-screen-share-panel" : "admin-screen-share-video-mount"}
        >
          <div
            className="admin-screen-share-stage"
            onDoubleClick={screenViewing ? toggleScreenShareFullscreen : undefined}
          >
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className={screenViewing ? "admin-screen-share-video" : "admin-screen-share-video-sink"}
            />
            {screenViewing ? (
              <div className="admin-screen-share-toolbar">
                <span>Live screen from customer</span>
                <button
                  type="button"
                  className="admin-screen-share-fullscreen-btn"
                  onClick={toggleScreenShareFullscreen}
                  onDoubleClick={(e) => e.stopPropagation()}
                  aria-label={screenShareFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  title={screenShareFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (double-click video)"}
                >
                  {screenShareFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <MessageList messages={messages} me="admin" typingText={typing ? "User is typing..." : ""} />
        <form className="chat-compose admin-chat-compose" onSubmit={sendMessage}>
          <input
            ref={fileInputRef}
            type="file"
            className="chat-file-input"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="admin-compose-attach"
            disabled={!sessionId || uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            📎
          </button>
          <input
            disabled={!sessionId || uploading}
            value={text}
            onChange={(e) => onType(e.target.value)}
            placeholder={uploading ? "Uploading..." : sessionId ? "Reply to customer..." : "Select a conversation"}
          />
          <button disabled={!sessionId || uploading}>Send</button>
        </form>
      </main>
      </div>

      {incomingVoiceCall ? (
        <IncomingCallPanel
          callerName={incomingVoiceCall.callerName}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      ) : null}

      {confirmSignout ? (
        <div className="modal-backdrop" onClick={() => setConfirmSignout(false)}>
          <div className="panel confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sign out</h3>
            <p className="muted">Do you want to sign out from tenant admin?</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmSignout(false)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleSignout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
