import { useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@wechat/shared/events";
import { createUserSocket } from "../socket";
import { getAdminStatus, getMessages, startSession } from "../api";
import MessageList from "../components/MessageList";

export default function WidgetPage() {
  const tenantKey = useMemo(
    () => window.WeChatSupportConfig?.tenantKey || import.meta.env.VITE_TENANT_KEY || "default-key",
    []
  );
  const STORAGE_KEY = `support_widget_session:${tenantKey}`;
  const [open, setOpen] = useState(true);
  const [sessionId, setSessionId] = useState(localStorage.getItem(STORAGE_KEY) || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adminOnline, setAdminOnline] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    getAdminStatus(tenantKey).then((r) => setAdminOnline(!!r.online)).catch(() => null);
  }, [tenantKey]);

  useEffect(() => {
    if (!sessionId) return;
    getMessages(sessionId, null, tenantKey).then(setMessages).catch(() => setMessages([]));

    const socket = createUserSocket(sessionId);
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on(SOCKET_EVENTS.ADMIN_STATUS, ({ online }) => setAdminOnline(online));
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg) => {
      if (String(msg.sessionId) !== String(sessionId)) return;
      setMessages((prev) => [...prev, msg]);
    });
    socket.on(SOCKET_EVENTS.TYPING, ({ sender, isTyping }) => {
      if (sender === "admin") setTyping(!!isTyping);
    });

    socket.emit(SOCKET_EVENTS.START_SESSION, { sessionId, pageUrl: window.location.href });
    return () => socket.close();
  }, [sessionId, tenantKey]);

  const canStart = useMemo(() => name.trim().length > 1, [name]);

  async function handleStart(e) {
    e.preventDefault();
    if (!canStart) return;
    const result = await startSession({ name, email, phone, pageUrl: window.location.href, tenantKey });
    const sid = String(result.sessionId);
    localStorage.setItem(STORAGE_KEY, sid);
    setSessionId(sid);
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !socketRef.current || !sessionId) return;
    socketRef.current.emit(SOCKET_EVENTS.SEND_MESSAGE, { sessionId, message: text.trim() });
    setText("");
    socketRef.current.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: false });
  }

  function onType(value) {
    setText(value);
    if (!socketRef.current || !sessionId) return;
    socketRef.current.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit(SOCKET_EVENTS.TYPING, { sessionId, isTyping: false });
    }, 800);
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((p) => !p)}>💬</button>
      {open ? (
        <div className="chat-widget">
          {!sessionId ? (
            <form onSubmit={handleStart} className="chat-form">
              <h3>Need help?</h3>
              <p className="muted">Start a conversation with support.</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
              <button disabled={!canStart}>Start chat</button>
            </form>
          ) : (
            <div className="chat-shell">
              <header className="chat-head">
                <strong>Support</strong>
                <span className={`status ${adminOnline ? "online" : ""}`}>
                  Admin {adminOnline ? "online" : "offline"}
                </span>
                <span className="status">{connected ? "Connected" : "Reconnecting..."}</span>
              </header>
              <MessageList messages={messages} me="user" typingText={typing ? "Admin is typing..." : ""} />
              <form onSubmit={sendMessage} className="chat-compose">
                <input
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  placeholder="Type your message..."
                />
                <button type="submit">Send</button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
