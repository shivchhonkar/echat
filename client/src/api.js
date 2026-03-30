const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function startSession(payload) {
  const res = await fetch(`${API_URL}/api/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Could not start session");
  return res.json();
}

export async function getAdminStatus() {
  const res = await fetch(`${API_URL}/api/admin-status`);
  return res.json();
}

export async function adminLogin(email, password) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Invalid login");
  return res.json();
}

export async function getSessions(token) {
  const res = await fetch(`${API_URL}/api/sessions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed sessions");
  return res.json();
}

export async function getMessages(sessionId) {
  const res = await fetch(`${API_URL}/api/messages/${sessionId}`);
  if (!res.ok) throw new Error("Failed messages");
  return res.json();
}

export { API_URL };
