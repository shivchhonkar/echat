import { useEffect, useMemo, useRef } from "react";
import { resolveAssetUrl } from "../api";
import { getCallLogDetails, getCallLogTitle } from "../utils/callLogFormat";

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

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CallLogIcon({ status }) {
  const missed = status === "missed" || status === "declined" || status === "cancelled";
  return (
    <span className={`chat-call-log-icon ${missed ? "missed" : "completed"}`} aria-hidden="true">
      {missed ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function MessageBody({ message }) {
  const type = message.messageType || "text";

  if (type === "call") {
    const callLog = message.callLog || {};
    return (
      <div className="chat-call-log-body">
        <CallLogIcon status={callLog.status} />
        <div>
          <span className="chat-call-log-title">{getCallLogTitle(callLog)}</span>
          <small>{getCallLogDetails(callLog)}</small>
        </div>
      </div>
    );
  }
  const attachment = message.attachment;
  const hasText = !!message.message?.trim();

  if (type === "image" && attachment?.url) {
    const src = resolveAssetUrl(attachment.url);
    return (
      <div className="bubble-attachment">
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img src={src} alt={attachment.filename || "Shared image"} className="bubble-image" />
        </a>
        {hasText ? <p>{message.message}</p> : null}
      </div>
    );
  }

  if (type === "file" && attachment?.url) {
    const href = resolveAssetUrl(attachment.url);
    return (
      <div className="bubble-attachment">
        <a href={href} target="_blank" rel="noopener noreferrer" className="bubble-file" download={attachment.filename}>
          <span className="bubble-file-icon" aria-hidden="true">📎</span>
          <span className="bubble-file-meta">
            <span className="bubble-file-name">{attachment.filename || "File"}</span>
            <small>{formatFileSize(attachment.size)}</small>
          </span>
        </a>
        {hasText ? <p>{message.message}</p> : null}
      </div>
    );
  }

  return <p>{message.message}</p>;
}

export default function MessageList({
  messages,
  me,
  typingText,
  agentName = "Support",
  agentAvatar = "",
  variant = "",
}) {
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
      groups.push({
        type: "message",
        key:
          message._id ||
          `${message.sender}-${message.timestamp}-${message.messageType}-${message.message}-${message.attachment?.url || ""}-${message.callLog?.endedAt || ""}`,
        message,
      });
    });
    return groups;
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typingText]);

  const listClass = variant ? `messages messages-${variant}` : "messages";

  return (
    <div ref={listRef} className={listClass}>
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
          if (m.messageType === "call") {
            return (
              <div key={item.key} className="chat-call-log-row">
                <div className={`chat-call-log-card status-${m.callLog?.status || "completed"}`}>
                  <MessageBody message={m} />
                  <span className="chat-call-log-time">{formatTime(m.timestamp)}</span>
                </div>
              </div>
            );
          }

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
                <MessageBody message={m} />
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
