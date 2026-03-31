const API_URL = import.meta.env.VITE_API_URL || "http://localhost:6100";

export async function startSession(payload) {
  const res = await fetch(`${API_URL}/api/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Could not start session");
  return res.json();
}

export async function getAdminStatus(tenantKey) {
  const query = tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : "";
  const res = await fetch(`${API_URL}/api/admin-status${query}`);
  return res.json();
}

export async function adminLogin(email, password, tenantSlug) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, tenantSlug })
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

export async function tenantSignup(payload) {
  const res = await fetch(`${API_URL}/api/tenant/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to signup tenant");
  return data;
}

export async function superAdminLogin(email, password) {
  const res = await fetch(`${API_URL}/api/super-admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid credentials");
  return data;
}

export async function requestSuperAdminOtp(mobile, dob) {
  const res = await fetch(`${API_URL}/api/super-admin/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, dob })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send OTP");
  return data;
}

export async function verifySuperAdminOtp(mobile, otp) {
  const res = await fetch(`${API_URL}/api/super-admin/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, otp })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "OTP verification failed");
  return data;
}

export async function getTenantAnalytics(token) {
  const res = await fetch(`${API_URL}/api/super-admin/tenants`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch analytics");
  return data;
}

export async function updateTenantSubscription(token, tenantId, payload) {
  const res = await fetch(`${API_URL}/api/super-admin/tenants/${tenantId}/subscription`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update subscription");
  return data;
}

export async function blockTenant(token, tenantId) {
  const res = await fetch(`${API_URL}/api/super-admin/tenants/${tenantId}/block`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to block tenant");
  return data;
}

export async function unblockTenant(token, tenantId) {
  const res = await fetch(`${API_URL}/api/super-admin/tenants/${tenantId}/unblock`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to unblock tenant");
  return data;
}

export async function deleteTenant(token, tenantId) {
  const res = await fetch(`${API_URL}/api/super-admin/tenants/${tenantId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete tenant");
  return data;
}

export async function sendMessageToTenantAdmin(token, tenantId, payload) {
  const res = await fetch(`${API_URL}/api/super-admin/tenants/${tenantId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send message");
  return data;
}

export async function getTenantAdminMessages(token) {
  const res = await fetch(`${API_URL}/api/admin/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch messages");
  return data;
}

export async function markTenantAdminMessageRead(token, messageId) {
  const res = await fetch(`${API_URL}/api/admin/messages/${messageId}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark read");
  return data;
}

export async function getMessages(sessionId, token, tenantKey) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const query = !token && tenantKey ? `?tenantKey=${encodeURIComponent(tenantKey)}` : "";
  const securedRes = await fetch(`${API_URL}/api/messages/${sessionId}${query}`, { headers });
  if (!securedRes.ok) throw new Error("Failed messages");
  return securedRes.json();
}

export { API_URL };
