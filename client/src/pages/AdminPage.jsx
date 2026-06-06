import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SOCKET_EVENTS } from "@echat/shared/events";
import { adminLogin, getMessages, getSessions, getTenantAdminMessages, markTenantAdminMessageRead, uploadAttachment } from "../api";
import { createAdminSocket } from "../socket";
import MessageList from "../components/MessageList";
import { createScreenShareViewer } from "../utils/screenShare";
import { createVoiceCallManager } from "../utils/voiceCall";
import VoiceCallBar from "../components/VoiceCallBar";
import IncomingCallPanel from "../components/IncomingCallPanel";
import { startIncomingCallRingtone, stopIncomingCallRingtone } from "../utils/callRingtone";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminTopBar from "../components/admin/AdminTopBar";
import CampaignManagerPanel from "../components/admin/CampaignManagerPanel";
import {
  countOnlineSessions,
  filterSessions,
  formatSessionTime,
  getAvatarHue,
  getInitials,
  getPagePath,
  getWebsiteFromUrl,
} from "../utils/adminSessionFormat";
import { isKnownAdminPath, normalizeAdminPath, pathToAdminSection } from "../utils/adminRoutes";
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
  const location = useLocation();
  const navigate = useNavigate();
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
  const [sessionSearch, setSessionSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const adminSection = useMemo(
    () => pathToAdminSection(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    const path = normalizeAdminPath(location.pathname);
    if (path.startsWith("/admin") && !isKnownAdminPath(path)) {
      navigate("/admin", { replace: true });
    }
  }, [location.pathname, navigate]);
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
  const pendingVoiceIceRef = useRef([]);
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
    pendingVoiceIceRef.current = [];
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
      const bufferedIce = [...pendingVoiceIceRef.current];
      pendingVoiceIceRef.current = [];
      await manager?.handleOffer({ sessionId: call.sessionId, offer: call.offer });
      await manager?.flushExternalIce?.(bufferedIce);
      await manager?.attachRemoteAudio?.();
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
      const sid = payload?.sessionId;
      if (!sid) return;
      if (
        incomingVoiceCallRef.current &&
        String(incomingVoiceCallRef.current.sessionId) === String(sid)
      ) {
        pendingVoiceIceRef.current.push(payload);
        return;
      }
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || String(sid) !== String(activeSessionId)) return;
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
    setLoginLoading(true);
    try {
      const { token: newToken } = await adminLogin(email, password, tenantSlug);
      localStorage.setItem("admin_token", newToken);
      localStorage.setItem("admin_tenant_slug", tenantSlug);
      setToken(newToken);
      toast.success("Admin login successful");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
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

  const filteredSessions = useMemo(
    () => filterSessions(sessions, sessionSearch),
    [sessions, sessionSearch]
  );
  const onlineCount = useMemo(() => countOnlineSessions(sessions), [sessions]);
  const unreadNoticeCount = useMemo(
    () => adminNotices.filter((n) => !n.read).length,
    [adminNotices]
  );

  useEffect(() => {
    loadAdminNotices();
  }, [token]);

  if (!token) {
    return (
      <div className="admin-auth-wrap">
        <Header />
        <main className="admin-auth-main">
          <section className="admin-auth-hero" aria-hidden="false">
            <div className="admin-auth-hero-badge">Tenant workspace</div>
            <h1 className="admin-auth-hero-title">Sign in to your support console</h1>
            <p className="admin-auth-hero-text">
              Manage live chats, voice calls, screen sharing, and promotional campaigns from one admin dashboard.
            </p>
            <ul className="admin-auth-hero-list">
              <li>Real-time active user inbox</li>
              <li>Voice calling and customer screen view</li>
              <li>SMS and WhatsApp campaign manager</li>
            </ul>
          </section>

          <form className="admin-auth-card" onSubmit={handleLogin}>
            <div className="admin-auth-card-head">
              <span className="admin-auth-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10M7 12h6" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <h2 className="admin-auth-card-title">Admin login</h2>
                <p className="admin-auth-card-subtitle">Use your tenant slug and admin credentials.</p>
              </div>
            </div>

            <div className="admin-auth-field">
              <label htmlFor="admin-tenant-slug">Tenant slug</label>
              <input
                id="admin-tenant-slug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="e.g. default or testme1"
                autoComplete="organization"
                required
              />
            </div>

            <div className="admin-auth-field">
              <label htmlFor="admin-email">Admin email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="admin-auth-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-auth-password-wrap">
                <input
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="admin-auth-password-toggle"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-auth-submit" disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className="admin-auth-divider">
              <span>New here?</span>
            </div>

            <div className="admin-auth-links">
              <a className="admin-auth-link" href="/signup">Create new tenant</a>
              <a className="admin-auth-link" href="/super-admin">Platform admin</a>
              <a className="admin-auth-link muted-link" href="/">Back to home</a>
            </div>
          </form>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="admin-console">
      <AdminSidebar
        activeCount={onlineCount}
        collapsed={sidebarCollapsed}
        activeSection={adminSection}
      />
      <div className="admin-console-main">
        <AdminTopBar
          noticeCount={unreadNoticeCount || adminNotices.length}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onSignOut={() => setConfirmSignout(true)}
        />

        <div className="admin-workspace-head">
          <div className="admin-workspace-title">
            <span className="admin-workspace-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10M7 12h6" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h2 className="admin-workspace-heading">Tenant Admin Console</h2>
              <p>Workspace: {tenantSlug}</p>
            </div>
          </div>
          <div className="admin-workspace-actions">
            <button type="button" className="admin-btn-outline" onClick={loadSessions}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
            <button type="button" className="admin-btn-outline danger" onClick={() => setConfirmSignout(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign out
            </button>
          </div>
        </div>

        {adminSection.startsWith("campaign-") ? (
          <CampaignManagerPanel section={adminSection} token={token} />
        ) : (
        <div className="admin-console-body">
          <aside className="admin-users-panel">
            <div className="admin-users-head">
              <h3>Active users</h3>
              <button type="button" className="admin-icon-btn primary" onClick={loadSessions} aria-label="Refresh users">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
                  <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="admin-users-search-row">
              <div className="admin-users-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search by name, email or phone..."
                />
              </div>
              <span className="admin-online-count">{onlineCount} Online</span>
            </div>
            <div className="admin-users-list">
              {filteredSessions.length === 0 ? (
                <p className="admin-users-empty">No active users match your search.</p>
              ) : (
                filteredSessions.map((s) => {
                  const hue = getAvatarHue(s.name);
                  const isOnline = s.status === "online";
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => openSession(s)}
                      className={`admin-user-card ${sessionId === s._id ? "active" : ""}`}
                    >
                      <div className="admin-user-card-top">
                        <span
                          className="admin-user-avatar"
                          style={{ background: `hsl(${hue} 72% 46%)` }}
                          aria-hidden="true"
                        >
                          {getInitials(s.name)}
                        </span>
                        <div className="admin-user-card-main">
                          <div className="admin-user-card-name">
                            <span className="admin-user-name">{s.name}</span>
                            <span className={`admin-user-status ${isOnline ? "online" : ""}`}>
                              <span className="admin-user-status-dot" aria-hidden="true" />
                              {isOnline ? "Online" : s.status || "Offline"}
                            </span>
                          </div>
                          <p className="admin-user-email">{s.email || "No email"}</p>
                          {s.phone ? <p className="admin-user-phone">{s.phone}</p> : null}
                          <p className="admin-user-site">{getWebsiteFromUrl(s.pageUrl)}</p>
                        </div>
                        {s.unreadCount > 0 ? <span className="admin-user-unread">{s.unreadCount}</span> : null}
                      </div>
                      <div className="admin-user-card-meta">
                        <span>Page: {getPagePath(s.pageUrl)} | Source: Direct</span>
                        <span>{formatSessionTime(s.lastSeenAt || s.createdAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="admin-chat-panel">
            {adminNotices.length > 0 ? (
              <div className="admin-notice-list">
                {adminNotices.slice(0, 3).map((n) => (
                  <div key={n._id} className={`admin-notice ${n.read ? "read" : ""}`}>
                    <div>
                      <span className="admin-notice-subject">{n.subject}</span>
                      <p>{n.message}</p>
                    </div>
                    {!n.read ? (
                      <button type="button" onClick={() => markTenantAdminMessageRead(token, n._id).then(loadAdminNotices)}>
                        Mark read
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <header className="admin-chat-head">
              {selectedSession ? (
                <div className="admin-chat-head-info">
                  <div className="admin-chat-head-title">
                    <span className="admin-chat-customer-name">
                      {selectedSession.name}
                      {selectedSession.email ? ` (${selectedSession.email})` : ""}
                    </span>
                    <span className="admin-chat-online-pill">
                      <span className="admin-online-dot" aria-hidden="true" />
                      {selectedSession.status === "online" ? "Online" : selectedSession.status || "Offline"}
                    </span>
                  </div>
                  <div className="admin-chat-meta">
                    <span>Chrome</span>
                    <span>Windows</span>
                    <span>Pune, India</span>
                    <span>IP: —</span>
                  </div>
                </div>
              ) : (
                <div className="admin-chat-head-info">
                  <p className="admin-chat-empty-title">Select a conversation</p>
                  <p className="admin-chat-head-hint">Choose an active user to start chatting.</p>
                </div>
              )}
              <div className="admin-chat-head-actions">
                {!voiceCallActive ? (
                  <button
                    type="button"
                    className="admin-btn-outline admin-call-btn"
                    onClick={startVoiceCall}
                    disabled={!sessionId}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path
                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Call
                  </button>
                ) : null}
                {screenViewing ? (
                  <button type="button" className="admin-btn-outline danger" onClick={stopScreenView}>
                    Stop screen
                  </button>
                ) : null}
                <button type="button" className="admin-btn-outline admin-more-btn" aria-label="More options">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={!selectedSession}
                  onClick={() => setShowUserDetails((v) => !v)}
                >
                  User Details
                </button>
              </div>
            </header>

            {showUserDetails && selectedSession ? (
              <div className="admin-user-details-strip">
                <span><span className="admin-detail-label">Email:</span> {selectedSession.email || "—"}</span>
                <span><span className="admin-detail-label">Phone:</span> {selectedSession.phone || "—"}</span>
                <span><span className="admin-detail-label">Page:</span> {selectedSession.pageUrl || "—"}</span>
                <button type="button" className="admin-user-details-close" onClick={() => setShowUserDetails(false)}>
                  Close
                </button>
              </div>
            ) : null}

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

            <MessageList
              messages={messages}
              me="user"
              variant="adminConsole"
              agentName="Admin"
              typingText={typing ? `${selectedSession?.name || "User"} is typing...` : ""}
            />

            <form className="admin-compose" onSubmit={sendMessage}>
              <input
                ref={fileInputRef}
                type="file"
                className="chat-file-input"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                onChange={handleFileSelect}
              />
              <div className="admin-compose-toolbar">
                <button
                  type="button"
                  className="admin-compose-icon-btn"
                  disabled={!sessionId || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" className="admin-compose-icon-btn" aria-label="Emoji" disabled={!sessionId}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="admin-compose-hint">Press / for shortcuts</span>
              </div>
              <textarea
                disabled={!sessionId || uploading}
                value={text}
                onChange={(e) => onType(e.target.value)}
                placeholder={
                  uploading
                    ? "Uploading..."
                    : selectedSession
                      ? `Reply to ${selectedSession.name}...`
                      : "Select a conversation"
                }
                rows={2}
              />
              <div className="admin-compose-actions">
                <button
                  type="button"
                  className="admin-btn-outline"
                  disabled={!sessionId}
                  onClick={() => toast.info("Canned responses coming soon")}
                >
                  Insert Canned Response
                </button>
                <button type="submit" className="admin-btn-primary send" disabled={!sessionId || uploading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Send
                </button>
              </div>
            </form>
          </main>
        </div>
        )}
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
