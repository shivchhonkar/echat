export function formatCallDuration(seconds = 0) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatCallClock(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getCallLogTitle(callLog = {}) {
  const by = callLog.initiatedBy === "admin" ? "Admin" : "Customer";
  if (callLog.status === "completed") return "Voice call completed";
  if (callLog.status === "missed") return `Missed call · ${by}`;
  if (callLog.status === "declined") return `Declined call · ${by}`;
  if (callLog.status === "cancelled") return `Cancelled call · ${by}`;
  return "Voice call";
}

export function getCallLogDetails(callLog = {}) {
  const parts = [];
  const started = formatCallClock(callLog.startedAt);
  const ended = formatCallClock(callLog.endedAt);

  if (started) parts.push(`Started ${started}`);
  if (callLog.status === "completed") {
    parts.push(`Duration ${formatCallDuration(callLog.durationSeconds)}`);
    if (ended) parts.push(`Ended ${ended}`);
  } else if (ended) {
    parts.push(`Ended ${ended}`);
  }

  const by = callLog.initiatedBy === "admin" ? "Admin" : "Customer";
  parts.push(`Initiated by ${by}`);
  return parts.join(" · ");
}
