import { useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@echat/shared/events";
import { adminLogin, getMessages, getSessions, getTenantAdminMessages, markTenantAdminMessageRead } from "../api";
import { createAdminSocket } from "../socket";
import MessageList from "../components/MessageList";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { toast } from "../utils/toast";

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

  const sessionId = selectedSession?._id;

  useEffect(() => {
    if (!token) return;
    loadSessions();
    const socket = createAdminSocket(token);
    socketRef.current = socket;

    socket.on(SOCKET_EVENTS.USER_CONNECTED, loadSessions);
    socket.on(SOCKET_EVENTS.USER_DISCONNECTED, loadSessions);
    socket.on(SOCKET_EVENTS.UNREAD_COUNTS, loadSessions);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg) => {
      if (!sessionId || String(msg.sessionId) !== String(sessionId)) {
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

    return () => socket.close();
  }, [token, sessionId]);

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
    setSelectedSession(session);
    try {
      const data = await getMessages(session._id, token);
      setMessages(data);
      socketRef.current?.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId: session._id });
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
          <h2>Admin Login</h2>
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
        </header>
        <MessageList messages={messages} me="admin" typingText={typing ? "User is typing..." : ""} />
        <form className="chat-compose" onSubmit={sendMessage}>
          <input
            disabled={!sessionId}
            value={text}
            onChange={(e) => onType(e.target.value)}
            placeholder={sessionId ? "Reply to customer..." : "Select a conversation"}
          />
          <button disabled={!sessionId}>Send</button>
        </form>
      </main>
      </div>

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
