import { useEffect, useMemo, useRef } from "react";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function dayKey(ts) {
  if (!ts) return "unknown";
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MessageList({ messages, me, typingText, agentName = "Support", agentAvatar = "" }) {
  const listRef = useRef(null);
  const agentInitials = useMemo(() => {
    const parts = String(agentName || "Support")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "S";
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");
  }, [agentName]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentKey = null;
    messages.forEach((message) => {
      const key = dayKey(message.timestamp);
      if (key !== currentKey) {
        currentKey = key;
        groups.push({
          type: "date",
          key: `date-${key}`,
          label: formatDateLabel(message.timestamp),
        });
      }
      groups.push({ type: "message", key: message._id || `${message.sender}-${message.timestamp}-${message.message}`, message });
    });
    return groups;
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typingText]);

  return (
    <div ref={listRef} className="messages">
      <div className="messages-content">
        {groupedMessages.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="chat-date-separator">
                <span>{item.label}</span>
              </div>
            );
          }

          const m = item.message;
          const mine = m.sender === me;
          return (
            <div key={item.key} className={`bubble-row ${mine ? "mine" : "theirs"}`}>
              {!mine ? (
                <div className="bubble-avatar" aria-hidden="true">
                  {agentAvatar ? (
                    <img src={agentAvatar} alt="" />
                  ) : (
                    <span>{agentInitials}</span>
                  )}
                </div>
              ) : null}
              <div className={`bubble ${mine ? "mine" : "theirs"}`}>
                <p>{m.message}</p>
                <div className="bubble-meta">
                  <span>{formatTime(m.timestamp)}</span>
                  {mine ? (
                    <span className="bubble-receipt" aria-label="Sent">
                      <CheckIcon />
                      <CheckIcon />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {typingText ? <div className="typing">{typingText}</div> : null}
      </div>
    </div>
  );
}
