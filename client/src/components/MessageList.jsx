import { useEffect, useRef } from "react";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageList({ messages, me, typingText }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typingText]);

  return (
    <div ref={listRef} className="messages">
      <div className="messages-content">
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div key={m._id || `${m.sender}-${m.timestamp}-${m.message}`} className={`bubble-row ${mine ? "mine" : ""}`}>
              <div className={`bubble ${mine ? "mine" : ""}`}>
                <p>{m.message}</p>
                <span>{formatTime(m.timestamp)}</span>
              </div>
            </div>
          );
        })}
        {typingText ? <div className="typing">{typingText}</div> : null}
      </div>
    </div>
  );
}
