import { useState } from "react";
import { tenantSignup } from "../api";

export default function TenantSignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [plan, setPlan] = useState("free");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      const data = await tenantSignup({ businessName, adminEmail, adminPassword, plan });
      setResult(data.tenant);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="panel" onSubmit={onSubmit}>
        <h2>New Tenant Signup</h2>
        <p className="muted">Create a business workspace with its own admin panel.</p>
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" required />
        <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Admin email" required />
        <input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" type="password" required />
        <select value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
        <button disabled={loading}>{loading ? "Creating..." : "Create tenant"}</button>
        <a className="text-link" href="/admin">Back to tenant admin login</a>
        {error ? <p className="error-text">{error}</p> : null}
        {result ? (
          <div className="result-box">
            <strong>Tenant created</strong>
            <p>Slug: <code>{result.slug}</code></p>
            <p>Widget Key: <code>{result.widgetKey}</code></p>
            <p className="muted">Use slug on /admin and widget key in customer app config.</p>
          </div>
        ) : null}
      </form>
    </div>
  );
}
