import { useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@echat/shared/events";
import { createUserSocket } from "../socket";
import { getAdminStatus, getMessages, startSession } from "../api";
import MessageList from "../components/MessageList";
import { toast } from "../utils/toast";

export default function WidgetPage() {
  const isEmbedMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("embed") === "1";
  }, []);
  const tenantKeyFromQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tenantKey") || params.get("widgetKey") || "";
  }, []);
  const supportConfig = useMemo(
    () => window.EchatConfig || window.WeChatSupportConfig || {},
    []
  );
  const tenantKey = useMemo(
    () => tenantKeyFromQuery || supportConfig.tenantKey || supportConfig.widgetKey || import.meta.env.VITE_TENANT_KEY || "default-key",
    [supportConfig, tenantKeyFromQuery]
  );
  const STORAGE_KEY = `support_widget_session:${tenantKey}`;
  const [open, setOpen] = useState(isEmbedMode ? true : false);
  const [sessionId, setSessionId] = useState(localStorage.getItem(STORAGE_KEY) || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adminOnline, setAdminOnline] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const openRef = useRef(open);

  useEffect(() => {
    getAdminStatus(tenantKey).then((r) => setAdminOnline(!!r.online)).catch(() => null);
  }, [tenantKey]);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnreadCount(0);
  }, [open]);

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
      if (msg.sender === "admin" && !openRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    });
    socket.on(SOCKET_EVENTS.TYPING, ({ sender, isTyping }) => {
      if (sender === "admin") setTyping(!!isTyping);
    });

    socket.emit(SOCKET_EVENTS.START_SESSION, { sessionId, pageUrl: window.location.href });
    return () => socket.close();
  }, [sessionId, tenantKey]);

  const canStart = useMemo(() => name.trim().length > 1, [name]);

  useEffect(() => {
    if (!isEmbedMode) return;
    window.parent?.postMessage(
      {
        source: "echat-widget",
        type: "toggle",
        open,
      },
      "*"
    );
  }, [isEmbedMode, open]);

  useEffect(() => {
    if (!isEmbedMode) return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [isEmbedMode]);

  async function handleStart(e) {
    e.preventDefault();
    if (!canStart) return toast.error("Please enter your name to start chat");
    try {
      const result = await startSession({ name, email, phone, pageUrl: window.location.href, tenantKey });
      const sid = String(result.sessionId);
      localStorage.setItem(STORAGE_KEY, sid);
      setSessionId(sid);
      toast.success("Chat started successfully");
    } catch (err) {
      toast.error(err.message || "Failed to start chat");
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!sessionId) return toast.error("Start chat before sending message");
    if (!text.trim()) return toast.error("Message cannot be empty");
    if (!socketRef.current) return toast.error("Connection not ready");
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
      {!open ? (
        <button
          type="button"
          className={`chat-fab ${isEmbedMode ? "embed" : ""}`}
          onClick={() => setOpen(true)}
          aria-label={
            unreadCount > 0
              ? `Open chat, ${unreadCount > 99 ? "99 plus" : unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
              : "Open chat"
          }
        >
          <span className="chat-fab-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
          </span>
          {unreadCount > 0 ? (
            <span className="chat-fab-badge" aria-hidden="true">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}
      {open ? (
        <div className={`chat-widget ${isEmbedMode ? "embed" : ""}`}>
          <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="Close chat">
            ✕
          </button>
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
