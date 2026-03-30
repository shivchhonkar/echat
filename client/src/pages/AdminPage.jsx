import { useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@wechat/shared/events";
import { adminLogin, getMessages, getSessions } from "../api";
import { createAdminSocket } from "../socket";
import MessageList from "../components/MessageList";

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

  async function handleLogin(e) {
    e.preventDefault();
    const { token: newToken } = await adminLogin(email, password, tenantSlug);
    localStorage.setItem("admin_token", newToken);
    localStorage.setItem("admin_tenant_slug", tenantSlug);
    setToken(newToken);
  }

  async function openSession(session) {
    setSelectedSession(session);
    const data = await getMessages(session._id, token);
    setMessages(data);
    socketRef.current?.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId: session._id });
    loadSessions();
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !sessionId) return;
    socketRef.current?.emit(SOCKET_EVENTS.SEND_MESSAGE, { sessionId, message: text.trim() });
    setText("");
    socketRef.current?.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: false });
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

  if (!token) {
    return (
      <div className="admin-login">
        <form className="panel" onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          <p className="muted">For a specific business tenant</p>
          <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Tenant slug (e.g. default)" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
          <button>Login</button>
          <a className="text-link" href="/signup">Create new tenant</a>
          <a className="text-link" href="/super-admin">Open platform admin</a>
        </form>
      </div>
    );
  }

  return (
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
  );
}
