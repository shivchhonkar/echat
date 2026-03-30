import { useEffect, useState } from "react";
import { getTenantAnalytics, superAdminLogin, updateTenantSubscription } from "../api";

export default function SuperAdminPage() {
  const [token, setToken] = useState(localStorage.getItem("super_admin_token") || "");
  const [email, setEmail] = useState("superadmin@example.com");
  const [password, setPassword] = useState("superadmin123");
  const [data, setData] = useState({ totals: null, tenants: [] });
  const [error, setError] = useState("");

  async function load() {
    if (!token) return;
    try {
      setError("");
      const result = await getTenantAnalytics(token);
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load tenants");
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function login(e) {
    e.preventDefault();
    try {
      setError("");
      const result = await superAdminLogin(email, password);
      localStorage.setItem("super_admin_token", result.token);
      setToken(result.token);
    } catch (err) {
      setError(err.message || "Login failed");
    }
  }

  async function setPlan(tenantId, subscriptionPlan) {
    await updateTenantSubscription(token, tenantId, { subscriptionPlan });
    await load();
  }

  if (!token) {
    return (
      <div className="admin-login">
        <form className="panel" onSubmit={login}>
          <h2>Platform Super Admin</h2>
          <p className="muted">Manage all tenant subscriptions and usage.</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Super admin email" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
          <button>Login</button>
          <a className="text-link" href="/admin">Back to tenant admin</a>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="platform-wrap">
      <header className="platform-head">
        <h2>Platform Overview</h2>
        <button onClick={load}>Refresh</button>
      </header>
      {data.totals ? (
        <div className="totals-grid">
          <div className="kpi"><span>Tenants</span><strong>{data.totals.tenants}</strong></div>
          <div className="kpi"><span>Sessions</span><strong>{data.totals.sessions}</strong></div>
          <div className="kpi"><span>Messages</span><strong>{data.totals.messages}</strong></div>
          <div className="kpi"><span>Online chats</span><strong>{data.totals.online}</strong></div>
        </div>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="tenant-table-wrap">
        <table className="tenant-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Admin</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Sessions</th>
              <th>Messages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.tenants.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.name}</strong>
                  <div className="muted">slug: {t.slug}</div>
                </td>
                <td>{t.adminEmail}</td>
                <td>{t.subscriptionPlan}</td>
                <td>{t.subscriptionStatus}</td>
                <td>{t.usage.totalSessions} ({t.usage.onlineSessions} online)</td>
                <td>{t.usage.totalMessages}</td>
                <td className="actions">
                  <button onClick={() => setPlan(t.id, "free")}>Free</button>
                  <button onClick={() => setPlan(t.id, "starter")}>Starter</button>
                  <button onClick={() => setPlan(t.id, "pro")}>Pro</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
