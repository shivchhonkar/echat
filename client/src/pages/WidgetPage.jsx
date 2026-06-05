import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@echat/shared/events";
import { createUserSocket } from "../socket";
import { getAdminStatus, getMessages, startSession } from "../api";
import MessageList from "../components/MessageList";

const FOOTER_ALERT_DURATION_MS = 3200;

function PoweredByFooter({ brand = "Shribi", url = "https://care.shribi.com/" }) {
  return (
    <div className="chat-powered-by">
      <a href={url} target="_blank" rel="noopener noreferrer" className="chat-powered-by-link">
        <span>POWERED BY {brand}</span>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </a>
    </div>
  );
}

function ChatWidgetFooter({ alert, onDismissAlert, brand, url }) {
  return (
    <div className="chat-widget-footer">
      {alert ? (
        <div className={`chat-footer-alert chat-footer-alert-${alert.type}`} role="status" aria-live="polite">
          <p>{alert.message}</p>
          <button type="button" className="chat-footer-alert-dismiss" onClick={onDismissAlert} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
      <PoweredByFooter brand={brand} url={url} />
    </div>
  );
}

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
  const [open, setOpen] = useState(false); //useState(isEmbedMode ? true : false);
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
  const footerAlertTimer = useRef(null);
  const openRef = useRef(open);
  const [footerAlert, setFooterAlert] = useState(null);

  const dismissFooterAlert = useCallback(() => {
    clearTimeout(footerAlertTimer.current);
    setFooterAlert(null);
  }, []);

  const showFooterAlert = useCallback((message, type = "success") => {
    clearTimeout(footerAlertTimer.current);
    setFooterAlert({ message, type });
    footerAlertTimer.current = window.setTimeout(() => {
      setFooterAlert(null);
    }, FOOTER_ALERT_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(footerAlertTimer.current), []);

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
    if (!canStart) return showFooterAlert("Please enter your name to start chat", "error");
    try {
      const result = await startSession({ name, email, phone, pageUrl: window.location.href, tenantKey });
      const sid = String(result.sessionId);
      localStorage.setItem(STORAGE_KEY, sid);
      setSessionId(sid);
      showFooterAlert("Chat started successfully", "success");
    } catch (err) {
      showFooterAlert(err.message || "Failed to start chat", "error");
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!sessionId) return showFooterAlert("Start chat before sending message", "error");
    if (!text.trim()) return showFooterAlert("Message cannot be empty", "error");
    if (!socketRef.current) return showFooterAlert("Connection not ready", "error");
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
          {!sessionId ? (
            <div className="chat-intake">
              <header className="chat-intake-header">
                <button
                  type="button"
                  className="chat-intake-icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 18 9 12l6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="chat-intake-brand">
                  <div>{supportConfig.title || "eChat Support"}</div>
                  <span>{supportConfig.tagline || "We're here to help!"}</span>
                </div>
                <button type="button" className="chat-intake-icon-btn" aria-label="More options">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="12" cy="19" r="1.6" />
                  </svg>
                </button>
              </header>

              <form onSubmit={handleStart} className="chat-intake-form">
                <div className="chat-intake-intro">
                  <h2 className="text-base font-medium font-normal font-weight-normal">To assist you better, please share your details</h2>
                  <p className="text-sm font-normal font-weight-normal">Our team will get back to you shortly.</p>
                </div>

                <div className="chat-intake-fields">
                  <label className="chat-field">
                    <span className="chat-field-label">
                      Full Name <span className="chat-field-required">*</span>
                    </span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      autoComplete="name"
                    />
                  </label>

                  <label className="chat-field">
                    <span className="chat-field-label">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                  </label>

                  <label className="chat-field">
                    <span className="chat-field-label">
                      Phone <span className="chat-field-optional">(optional)</span>
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      autoComplete="tel"
                    />
                  </label>
                </div>

                <button type="submit" className="chat-intake-submit" disabled={!canStart}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Start Chat
                </button>

                <p className="chat-intake-privacy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                  </svg>
                  Your information is secure and will only be used to assist you.
                </p>
              </form>
              <ChatWidgetFooter
                alert={footerAlert}
                onDismissAlert={dismissFooterAlert}
                brand={supportConfig.poweredByBrand || "Shribi"}
                url={supportConfig.poweredByUrl || "https://care.shribi.com/"}
              />
            </div>
          ) : (
            <div className="chat-shell">
              <header className="chat-session-header">
                <button
                  type="button"
                  className="chat-session-icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 18 9 12l6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="chat-session-agent">
                  <div className="chat-session-avatar-wrap">
                    {supportConfig.agentAvatar ? (
                      <img
                        src={supportConfig.agentAvatar}
                        alt=""
                        className="chat-session-avatar-img"
                      />
                    ) : (
                      <span className="chat-session-avatar-fallback">
                        {(supportConfig.agentName || "Support")
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() || "")
                          .join("") || "S"}
                      </span>
                    )}
                    <span
                      className={`chat-session-presence ${adminOnline ? "online" : ""}`}
                      aria-label={adminOnline ? "Agent online" : "Agent offline"}
                    />
                  </div>
                  <div className="chat-session-agent-text">
                    <strong>{supportConfig.agentName || "Support"}</strong>
                    <span>{supportConfig.agentRole || "Support Agent"}</span>
                  </div>
                </div>

                <div className="chat-session-actions">
                  {/* <button type="button" className="chat-session-icon-btn" aria-label="Rate support">
                    {/* <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path
                        d="M7 10v12M7 10l3-7a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v5h5a2 2 0 0 1 2 2l-1 7H7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg> 
                  </button> */}
                  <button type="button" className="chat-session-icon-btn" aria-label="More options">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="12" cy="19" r="1.6" />
                    </svg>
                  </button>
                </div>
              </header>

              {!connected ? (
                <div className="chat-session-status" role="status">
                  Reconnecting...
                </div>
              ) : null}

              <MessageList
                messages={messages}
                me="user"
                typingText={typing ? "Agent is typing..." : ""}
                agentName={supportConfig.agentName || "Support"}
                agentAvatar={supportConfig.agentAvatar || ""}
              />

              <form onSubmit={sendMessage} className="chat-compose">
                <div className="chat-compose-field">
                  <input
                    value={text}
                    onChange={(e) => onType(e.target.value)}
                    placeholder="Type your message..."
                    aria-label="Message"
                  />
                  <button type="button" className="chat-compose-attach" aria-label="Attach file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path
                        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <button
                  type="submit"
                  className="chat-compose-send"
                  aria-label="Send message"
                  disabled={!text.trim()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
              <ChatWidgetFooter
                alert={footerAlert}
                onDismissAlert={dismissFooterAlert}
                brand={supportConfig.poweredByBrand || "Shribi"}
                url={supportConfig.poweredByUrl || "https://care.shribi.com/"}
              />
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
