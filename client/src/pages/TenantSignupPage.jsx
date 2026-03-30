import { useState } from "react";
import { tenantSignup } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { toast } from "../utils/toast";

export default function TenantSignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [plan, setPlan] = useState("free");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!businessName.trim()) return toast.error("Business name is required");
    if (!adminEmail.trim()) return toast.error("Admin email is required");
    if (!adminEmail.includes("@")) return toast.error("Please enter a valid admin email");
    if (!adminPassword || adminPassword.length < 6) return toast.error("Password must be at least 6 characters");

    try {
      setError("");
      setLoading(true);
      const data = await tenantSignup({ businessName, adminEmail, adminPassword, plan });
      setResult(data.tenant);
      toast.success("Tenant created successfully");
    } catch (err) {
      setError(err.message || "Signup failed");
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyInstallSnippet() {
    if (!result) return;
    const snippet = `<script>
  (function () {
    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;
    window.WeChatSupportConfig = Object.assign({}, window.WeChatSupportConfig || {}, {
      widgetKey: '${result.widgetKey}',
      widgetBaseUrl: 'http://localhost:5173'
    });
  })();
</script>
<script src="http://localhost:5173/embed.js" async></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Install snippet copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Failed to copy install snippet");
    }
  }

  return (
    <div className="signup-wrap">
      <Header />
      <main className="signup-main">
        <div className="signup-shell">
          <section className="signup-hero">
            {/* <p className="signup-chip">Billint Theme Workspace</p> */}
            <h1 className="font-normal">Launch your support chat for every customer touchpoint.</h1>
            <p>
              Create a tenant in minutes and get your own admin inbox, widget key, and embed snippet ready for your app.
            </p>
            {/* <div className="signup-points">
              <span>Real-time user conversations</span>
              <span>Tenant-specific admin panel</span>
              <span>Fast embed setup</span>
            </div> */}
            <img
              src="/customer_support_professional.png"
              alt="Customer support banner"
              className="signup-hero-image"
            />
          </section>

          <form className="signup-panel" onSubmit={onSubmit}>
            <h2>Signup for WeChat Support</h2>
            <p className="muted">Create a business workspace with its own admin panel.</p>

          <label className="signup-label">Business name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Acme Retail Pvt Ltd"
            required
          />

          <label className="signup-label">Admin email</label>
          <input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@business.com"
            required
          />

          <label className="signup-label">Admin password</label>
          <input
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Create a secure password"
            type="password"
            required
          />

          <label className="signup-label">Subscription plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>

          <button className="primary-cta" disabled={loading}>
            {loading ? "Creating..." : "Create tenant"}
          </button>
          <a className="text-link" href="/admin">Back to tenant admin login</a>

            {error ? <p className="error-text">{error}</p> : null}
          </form>
        </div>
      </main>
      <Footer />

      {result ? (
        <div className="modal-backdrop" onClick={() => setResult(null)}>
          <div className="panel signup-success-modal" onClick={(e) => e.stopPropagation()}>
            <strong>Tenant created successfully</strong>
            <div>Slug: <code>{result.slug}</code></div>
            <div>Widget Key: <code>{result.widgetKey}</code></div>
            <p className="muted">Use slug on `/admin` and widget key in customer app config.</p>
            <p className="muted"><strong>Add this below code to your application to use we chat:</strong></p>
            <pre className="code-block">{`<Script id="echat-widget-config" strategy="afterInteractive">
  {\\\`
    (function () {
      var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal) return;
      window.WeChatSupportConfig = Object.assign({}, window.WeChatSupportConfig || {}, {
        widgetKey: '${result.widgetKey}',
        widgetBaseUrl: 'http://localhost:5173'
      });
    })();
  \\\`}
</Script>
<Script src="http://localhost:5173/embed.js" strategy="afterInteractive" />`}</pre>
            <div className="modal-actions">
              <button type="button" onClick={() => setResult(null)}>
                Close
              </button>
              <button type="button" onClick={copyInstallSnippet}>
                {copied ? "Copied!" : "Copy install snippet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
