function PhoneRingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.11a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function IncomingCallPanel({ callerName, onAccept, onDecline }) {
  return (
    <div className="incoming-call-panel" role="alertdialog" aria-labelledby="incoming-call-title" aria-live="assertive">
      <div className="incoming-call-card">
        <div className="incoming-call-icon" aria-hidden="true">
          <PhoneRingIcon />
        </div>
        <div className="incoming-call-copy">
          <strong id="incoming-call-title">Incoming voice call</strong>
          <p>{callerName} is calling you</p>
        </div>
        <div className="incoming-call-actions">
          <button type="button" className="incoming-call-decline" onClick={onDecline}>
            Decline
          </button>
          <button type="button" className="incoming-call-accept" onClick={onAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
