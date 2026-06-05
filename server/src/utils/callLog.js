export function formatDuration(seconds = 0) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatCallLogMessage(callLog = {}) {
  const { status, durationSeconds, initiatedBy } = callLog;
  const by = initiatedBy === "admin" ? "Admin" : "Customer";

  if (status === "completed") {
    return `Voice call completed · ${formatDuration(durationSeconds)}`;
  }
  if (status === "missed") {
    return `Missed voice call from ${by}`;
  }
  if (status === "declined") {
    return `Declined voice call from ${by}`;
  }
  if (status === "cancelled") {
    return `Cancelled voice call by ${by}`;
  }
  return "Voice call ended";
}

export function resolveCallStatus(state, reason = "hangup") {
  if (state?.answeredAt) return "completed";
  if (reason === "declined") return "declined";
  if (reason === "cancelled") return "cancelled";
  return "missed";
}
