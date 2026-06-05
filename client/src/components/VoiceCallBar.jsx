function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" strokeLinecap="round" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9V5a3 3 0 0 0-5.8-1.2" strokeLinecap="round" />
      <path d="M19 10v1a7 7 0 0 1-11.5 5.5M12 18v4M8 22h8M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}

function PhoneEndIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.11a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  );
}

export default function VoiceCallBar({
  inCall,
  ringing = false,
  ringingLabel = "Ringing...",
  selfMuted,
  remoteMuted,
  mutedByAdmin = false,
  isAdmin = false,
  remoteLabel = "Participant",
  onToggleSelfMute,
  onToggleCustomerMute,
  customerMutedByAdmin = false,
  onEndCall,
}) {
  if (!inCall && !ringing) return null;

  if (ringing && !inCall) {
    return (
      <div className="voice-call-bar voice-call-bar-ringing" role="region" aria-label="Outgoing voice call">
        <div className="voice-call-status">
          <span className="voice-call-ringing-dot" aria-hidden="true" />
          <span>{ringingLabel}</span>
        </div>
        <div className="voice-call-actions">
          <button
            type="button"
            className="voice-call-btn end"
            onClick={onEndCall}
            aria-label="Cancel call"
            title="Cancel call"
          >
            <PhoneEndIcon />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    );
  }

  const selfMuteLabel = mutedByAdmin
    ? "Muted by support"
    : selfMuted
      ? "Unmute microphone"
      : "Mute microphone";

  return (
    <div className="voice-call-bar" role="region" aria-label="Voice call controls">
      <div className="voice-call-status">
        <span className="voice-call-live-dot" aria-hidden="true" />
        <span>Voice call active</span>
        {remoteMuted ? <span className="voice-call-remote-muted">{remoteLabel} is muted</span> : null}
        {mutedByAdmin ? <span className="voice-call-remote-muted">You were muted by support</span> : null}
      </div>
      <div className="voice-call-actions">
        <button
          type="button"
          className={`voice-call-btn ${selfMuted || mutedByAdmin ? "muted" : ""}`}
          onClick={onToggleSelfMute}
          disabled={mutedByAdmin}
          aria-label={selfMuteLabel}
          title={selfMuteLabel}
        >
          {selfMuted || mutedByAdmin ? <MicOffIcon /> : <MicIcon />}
          <span>{selfMuted || mutedByAdmin ? "Unmute" : "Mute"}</span>
        </button>
        {isAdmin ? (
          <button
            type="button"
            className={`voice-call-btn ${customerMutedByAdmin ? "muted" : ""}`}
            onClick={onToggleCustomerMute}
            aria-label={customerMutedByAdmin ? "Unmute customer" : "Mute customer"}
            title={customerMutedByAdmin ? "Unmute customer" : "Mute customer"}
          >
            {customerMutedByAdmin ? <MicOffIcon /> : <MicIcon />}
            <span>{customerMutedByAdmin ? "Unmute user" : "Mute user"}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="voice-call-btn end"
          onClick={onEndCall}
          aria-label="End voice call"
          title="End call"
        >
          <PhoneEndIcon />
          <span>End</span>
        </button>
      </div>
    </div>
  );
}

export function VoiceCallStartButton({
  onClick,
  disabled,
  title = "Start voice call",
  className = "voice-call-start-btn",
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.11a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
