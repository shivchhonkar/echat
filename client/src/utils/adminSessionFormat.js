export function getInitials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function getAvatarHue(name) {
  const str = String(name || "user");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [220, 258, 200, 330, 168, 28, 12];
  return hues[Math.abs(hash) % hues.length];
}

export function formatSessionTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getWebsiteFromUrl(pageUrl) {
  if (!pageUrl) return "—";
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return pageUrl;
  }
}

export function getPagePath(pageUrl) {
  if (!pageUrl) return "/";
  try {
    return new URL(pageUrl).pathname || "/";
  } catch {
    return pageUrl;
  }
}

export function filterSessions(sessions, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter((s) => {
    const name = String(s.name || "").toLowerCase();
    const email = String(s.email || "").toLowerCase();
    const phone = String(s.phone || "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });
}

export function countOnlineSessions(sessions) {
  return sessions.filter((s) => s.status === "online").length;
}
