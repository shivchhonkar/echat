import { useEffect, useState } from "react";
import { tenantSignup } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { toast } from "../utils/toast";
import { buildInstallSnippet } from "../utils/embedSnippet";

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
    const snippet = buildInstallSnippet(result.widgetKey);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Install snippet copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Failed to copy install snippet");
    }
  }

  function closeSuccessModal() {
    setResult(null);
    setCopied(false);
  }

  useEffect(() => {
    if (!result) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function blockEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("keydown", blockEscape, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", blockEscape, true);
    };
  }, [result]);

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
        <div className="modal-backdrop signup-success-backdrop" role="presentation">
          <div
            className="panel signup-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-success-title"
          >
            <strong id="signup-success-title">Tenant created successfully</strong>
            <div>Slug: <code>{result.slug}</code></div>
            <div>Widget Key: <code>{result.widgetKey}</code></div>
            <p className="muted">Use slug on `/admin` and widget key in customer app config.</p>
            <p className="muted"><strong>Add this below code to your application to use we chat:</strong></p>
            <pre className="code-block">{buildInstallSnippet(result.widgetKey)}</pre>
            <div className="modal-actions">
              <button type="button" onClick={closeSuccessModal}>
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
