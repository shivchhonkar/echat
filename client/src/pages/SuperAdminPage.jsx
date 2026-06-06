import { useEffect, useMemo, useState } from "react";
import {
  blockTenant,
  deleteTenant,
  getTenantAnalytics,
  requestSuperAdminOtp,
  sendMessageToTenantAdmin,
  unblockTenant,
  updateTenantSubscription,
  verifySuperAdminOtp
} from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminTopBar from "../components/admin/AdminTopBar";
import SuperAdminSidebar from "../components/superadmin/SuperAdminSidebar";
import { getAvatarHue, getInitials } from "../utils/adminSessionFormat";
import { toast } from "../utils/toast";

const KPI_ITEMS = [
  { key: "tenants", label: "Tenants" },
  { key: "sessions", label: "Sessions" },
  { key: "messages", label: "Messages" },
  { key: "online", label: "Online chats" },
  { key: "communicatedUsers", label: "Communicated users" },
];

export default function SuperAdminPage() {
  const [token, setToken] = useState(localStorage.getItem("super_admin_token") || "");
  const [mobile, setMobile] = useState(localStorage.getItem("super_admin_mobile") || "");
  const [dob, setDob] = useState("04/04/1992");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState("");
  const [data, setData] = useState({ totals: null, tenants: [] });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmSignout, setConfirmSignout] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

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

  async function requestOtp(e) {
    e.preventDefault();
    if (!mobile.trim()) return toast.error("Mobile number is required");
    if (!dob.trim()) return toast.error("DOB is required");
    setOtpLoading(true);
    try {
      setError("");
      const result = await requestSuperAdminOtp(mobile, dob);
      setOtpSent(true);
      setDevOtpHint(result.otp || "");
      toast.success(result.smsSent === false ? "OTP generated (check server logs in dev)" : "OTP sent to your mobile");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (!otp.trim()) return toast.error("OTP is required");
    setOtpLoading(true);
    try {
      setError("");
      const result = await verifySuperAdminOtp(mobile, otp);
      localStorage.setItem("super_admin_token", result.token);
      localStorage.setItem("super_admin_mobile", mobile);
      setToken(result.token);
      setOtp("");
      setOtpSent(false);
      setDevOtpHint("");
      toast.success("Super admin login successful");
    } catch (err) {
      setError(err.message || "OTP verification failed");
      toast.error(err.message || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  }

  function resetOtpStep() {
    setOtpSent(false);
    setOtp("");
    setDevOtpHint("");
    setError("");
  }

  function handleSignOut() {
    localStorage.removeItem("super_admin_token");
    localStorage.removeItem("super_admin_mobile");
    setToken("");
    setOtp("");
    setOtpSent(false);
    setDevOtpHint("");
    setSelectedTenant(null);
    setConfirmSignout(false);
    toast.success("Signed out successfully");
  }

  function openConfirmModal(config) {
    setConfirmModal({
      title: config.title || "Please confirm",
      message: config.message || "Are you sure?",
      confirmText: config.confirmText || "Confirm",
      danger: Boolean(config.danger),
      onConfirm: config.onConfirm
    });
  }

  async function executeConfirm() {
    if (!confirmModal?.onConfirm) return;
    await confirmModal.onConfirm();
    setConfirmModal(null);
  }

  function maskMobile(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 10) return "Super Admin";
    return `+91 ${digits.slice(0, 2)}****${digits.slice(-2)}`;
  }

  async function setPlan(tenantId, subscriptionPlan) {
    try {
      await updateTenantSubscription(token, tenantId, { subscriptionPlan });
      await load();
      toast.success(`Plan changed to ${subscriptionPlan}`);
    } catch (err) {
      toast.error(err.message || "Failed to update plan");
    }
  }

  async function handleBlock(tenantId) {
    try {
      await blockTenant(token, tenantId);
      await load();
      toast.success("Tenant blocked");
    } catch (err) {
      toast.error(err.message || "Failed to block tenant");
    }
  }

  async function handleUnblock(tenantId) {
    try {
      await unblockTenant(token, tenantId);
      await load();
      toast.success("Tenant unblocked");
    } catch (err) {
      toast.error(err.message || "Failed to unblock tenant");
    }
  }

  async function handleDelete(tenantId) {
    try {
      await deleteTenant(token, tenantId);
      await load();
      toast.success("Tenant deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete tenant");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!selectedTenant?.id) return toast.error("Please select a tenant");
    if (!messageSubject.trim()) return toast.error("Subject is required");
    if (!messageBody.trim()) return toast.error("Message is required");
    try {
      await sendMessageToTenantAdmin(token, selectedTenant.id, {
        subject: messageSubject.trim(),
        message: messageBody.trim(),
      });
      setMessageSubject("");
      setMessageBody("");
      toast.success("Message sent to tenant admin");
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  }

  function selectTenant(tenant) {
    setSelectedTenant(tenant);
    setMessageSubject("");
    setMessageBody("");
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = data.tenants.filter((t) => {
      const name = String(t.name || "").toLowerCase();
      const slug = String(t.slug || "").toLowerCase();
      const adminEmail = String(t.adminEmail || "").toLowerCase();
      const subscriptionPlan = String(t.subscriptionPlan || "").toLowerCase();
      const subscriptionStatus = String(t.subscriptionStatus || "").toLowerCase();
      if (!q) return true;
      return (
        name.includes(q) ||
        slug.includes(q) ||
        adminEmail.includes(q) ||
        subscriptionPlan.includes(q) ||
        subscriptionStatus.includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return String(a.name || "").localeCompare(String(b.name || ""));
        case "plan_asc":
          return String(a.subscriptionPlan || "").localeCompare(String(b.subscriptionPlan || ""));
        case "status_asc":
          return String(a.subscriptionStatus || "").localeCompare(String(b.subscriptionStatus || ""));
        case "messages_desc":
          return (b.usage?.totalMessages || 0) - (a.usage?.totalMessages || 0);
        case "createdAt_asc":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "createdAt_desc":
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });
    return sorted;
  }, [data.tenants, search, sortBy]);

  useEffect(() => {
    if (!selectedTenant) return;
    const updated = data.tenants.find((t) => t.id === selectedTenant.id);
    if (updated) setSelectedTenant(updated);
    else setSelectedTenant(null);
  }, [data.tenants]);

  const activeTenantCount = useMemo(
    () => data.tenants.filter((t) => t.isActive).length,
    [data.tenants]
  );

  if (!token) {
    return (
      <div className="admin-auth-wrap super-admin-auth-wrap">
        <Header />
        <main className="admin-auth-main super-admin-auth-main">
          <section className="admin-auth-hero super-admin-auth-hero">
            <div className="admin-auth-hero-badge super-admin-auth-badge">Platform control</div>
            <h1 className="admin-auth-hero-title">Super admin access</h1>
            <p className="admin-auth-hero-text">
              Secure OTP login for platform operators — manage tenants, subscriptions, messaging limits, and system health.
            </p>
            <ul className="admin-auth-hero-list">
              <li>Tenant analytics and lifecycle controls</li>
              <li>Plan upgrades, block, and delete actions</li>
              <li>Direct messages to tenant admins</li>
            </ul>
          </section>

          <form className="admin-auth-card super-admin-auth-card" onSubmit={otpSent ? verifyOtp : requestOtp}>
            <div className="admin-auth-card-head">
              <span className="admin-auth-card-icon super-admin-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <h2 className="admin-auth-card-title">Platform super admin</h2>
                <p className="admin-auth-card-subtitle">
                  {otpSent
                    ? `OTP sent to ${mobile}. Enter the code to continue.`
                    : "Verify with authorized mobile number and date of birth."}
                </p>
              </div>
            </div>

            <div className="super-admin-auth-steps" aria-label="Login progress">
              <span className={`super-admin-auth-step ${otpSent ? "done" : "active"}`}>1. Identity</span>
              <span className={`super-admin-auth-step ${otpSent ? "active" : ""}`}>2. OTP</span>
            </div>

            {!otpSent ? (
              <>
                <div className="admin-auth-field">
                  <label htmlFor="super-admin-mobile">Mobile number</label>
                  <input
                    id="super-admin-mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter valid mobile number"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div className="admin-auth-field">
                  <label htmlFor="super-admin-dob">Date of birth</label>
                  <input
                    id="super-admin-dob"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    autoComplete="bday"
                    required
                  />
                  {/* <span className="admin-auth-field-hint">
                    Format: DD/MM/YYYY · OTP is sent via SMS to authorized numbers only
                  </span> */}
                </div>
              </>
            ) : (
              <>
                <div className="super-admin-auth-sent-to">
                  <span>Signing in as</span>
                  <span className="super-admin-auth-sent-value">{mobile}</span>
                  <button type="button" className="super-admin-auth-change" onClick={resetOtpStep}>
                    Change
                  </button>
                </div>
                <div className="admin-auth-field">
                  <label htmlFor="super-admin-otp">One-time password</label>
                  <input
                    id="super-admin-otp"
                    className="super-admin-otp-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit OTP"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                  />
                </div>
                {devOtpHint ? (
                  <div className="super-admin-dev-otp" role="status">
                    <span>Development OTP</span>
                    <code>{devOtpHint}</code>
                  </div>
                ) : null}
              </>
            )}

            {error ? <p className="super-admin-auth-error">{error}</p> : null}

            <button type="submit" className="admin-auth-submit" disabled={otpLoading}>
              {otpLoading ? (otpSent ? "Verifying..." : "Sending OTP...") : otpSent ? "Verify & sign in" : "Send OTP"}
            </button>

            <div className="admin-auth-divider">
              <span>Other access</span>
            </div>

            <div className="admin-auth-links">
              <a className="admin-auth-link" href="/admin">Tenant admin login</a>
              <a className="admin-auth-link muted-link" href="/">Back to home</a>
            </div>
          </form>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="admin-console">
      <SuperAdminSidebar tenantCount={data.tenants.length} collapsed={sidebarCollapsed} />
      <div className="admin-console-main">
        <AdminTopBar
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onSignOut={() => setConfirmSignout(true)}
          profileInitials="SA"
          profileName={maskMobile(mobile)}
          showOnlinePill={false}
        />

        <div className="admin-workspace-head">
          <div className="admin-workspace-title">
            <span className="admin-workspace-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
            <div>
              <h2 className="admin-workspace-heading">Super Admin Console</h2>
              <p>Platform overview · {data.tenants.length} tenants</p>
            </div>
          </div>
          <div className="admin-workspace-actions">
            <button type="button" className="admin-btn-outline" onClick={load}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
            <button type="button" className="admin-btn-outline danger" onClick={() => setConfirmSignout(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign out
            </button>
          </div>
        </div>

        {data.totals ? (
          <div className="super-admin-metrics-bar" aria-label="Platform metrics">
            {KPI_ITEMS.map(({ key, label }) => (
              <div key={key} className="super-admin-metric">
                <span className="super-admin-metric-label">{label}</span>
                <span className="super-admin-metric-value">
                  {key === "communicatedUsers"
                    ? data.totals.communicatedUsers || 0
                    : data.totals[key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="super-admin-error-strip">{error}</p> : null}

        <div className="admin-console-body">
          <aside className="admin-users-panel">
            <div className="admin-users-head">
              <h3>Tenants</h3>
              <button type="button" className="admin-icon-btn primary" onClick={load} aria-label="Refresh tenants">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
                  <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="admin-users-search-row">
              <div className="admin-users-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tenant, slug, email..."
                />
              </div>
              <span className="admin-online-count">{activeTenantCount} Active</span>
            </div>
            <div className="super-admin-sort-row">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort tenants">
                <option value="createdAt_desc">Join date (newest)</option>
                <option value="createdAt_asc">Join date (oldest)</option>
                <option value="name_asc">Name</option>
                <option value="plan_asc">Plan</option>
                <option value="status_asc">Status</option>
                <option value="messages_desc">Message count</option>
              </select>
            </div>
            <div className="admin-users-list">
              {filteredSorted.length === 0 ? (
                <p className="admin-users-empty">No tenants match your search.</p>
              ) : (
                filteredSorted.map((t) => {
                  const hue = getAvatarHue(t.name);
                  const joinDate = t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString([], {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTenant(t)}
                      className={`admin-user-card ${selectedTenant?.id === t.id ? "active" : ""}`}
                    >
                      <div className="admin-user-card-top">
                        <span
                          className="admin-user-avatar"
                          style={{ background: `hsl(${hue} 72% 46%)` }}
                          aria-hidden="true"
                        >
                          {getInitials(t.name)}
                        </span>
                        <div className="admin-user-card-main">
                          <div className="admin-user-card-name">
                            <span className="admin-user-name">{t.name}</span>
                            <span className={`admin-user-status ${t.isActive ? "online" : ""}`}>
                              <span className="admin-user-status-dot" aria-hidden="true" />
                              {t.isActive ? "Active" : "Blocked"}
                            </span>
                          </div>
                          <p className="admin-user-email">{t.adminEmail || "No email"}</p>
                          <p className="admin-user-site">slug: {t.slug}</p>
                        </div>
                      </div>
                      <div className="admin-user-card-meta">
                        <span>
                          {t.subscriptionPlan} · {t.usage?.totalMessages || 0} msgs
                        </span>
                        <span>{joinDate}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="admin-chat-panel super-admin-detail-panel">
            <header className="admin-chat-head">
              {selectedTenant ? (
                <div className="admin-chat-head-info">
                  <div className="admin-chat-head-title">
                    <span className="admin-chat-customer-name">
                      {selectedTenant.name}
                      {selectedTenant.adminEmail ? ` (${selectedTenant.adminEmail})` : ""}
                    </span>
                    <span className="admin-chat-online-pill">
                      <span className={`admin-online-dot ${selectedTenant.isActive ? "" : "offline"}`} aria-hidden="true" />
                      {selectedTenant.isActive ? "Active" : "Blocked"}
                    </span>
                  </div>
                  <div className="admin-chat-meta">
                    <span>Slug: {selectedTenant.slug}</span>
                    <span>Plan: {selectedTenant.subscriptionPlan}</span>
                    <span>Status: {selectedTenant.subscriptionStatus}</span>
                    <span>Key: {selectedTenant.widgetKey || "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="admin-chat-head-info">
                  <p className="admin-chat-empty-title">Select a tenant</p>
                  <p className="admin-chat-head-hint">Choose a workspace from the list to manage plans and messaging.</p>
                </div>
              )}
              <div className="admin-chat-head-actions">
                {selectedTenant ? (
                  <>
                    {selectedTenant.isActive ? (
                      <button
                        type="button"
                        className="admin-btn-outline danger"
                        onClick={() =>
                          openConfirmModal({
                            title: "Block tenant",
                            message: "This tenant will be paused and cannot use chat until unblocked.",
                            confirmText: "Block",
                            danger: true,
                            onConfirm: async () => {
                              await handleBlock(selectedTenant.id);
                            },
                          })
                        }
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() =>
                          openConfirmModal({
                            title: "Unblock tenant",
                            message: "This tenant will be reactivated for normal usage.",
                            confirmText: "Unblock",
                            onConfirm: async () => {
                              await handleUnblock(selectedTenant.id);
                            },
                          })
                        }
                      >
                        Unblock
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn-outline danger"
                      onClick={() =>
                        openConfirmModal({
                          title: "Delete tenant",
                          message: "This will permanently delete tenant data, sessions, and messages.",
                          confirmText: "Delete",
                          danger: true,
                          onConfirm: async () => {
                            await handleDelete(selectedTenant.id);
                          },
                        })
                      }
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </header>

            {selectedTenant ? (
              <>
                <div className="super-admin-detail-stats">
                  <div className="super-admin-stat-card">
                    <span className="super-admin-stat-label">Messages</span>
                    <span className="super-admin-stat-value">{selectedTenant.usage?.totalMessages || 0}</span>
                  </div>
                  <div className="super-admin-stat-card">
                    <span className="super-admin-stat-label">Communicated users</span>
                    <span className="super-admin-stat-value">{selectedTenant.usage?.communicatedUsers || 0}</span>
                  </div>
                  <div className="super-admin-stat-card">
                    <span className="super-admin-stat-label">Joined</span>
                    <span className="super-admin-stat-value">
                      {selectedTenant.createdAt
                        ? new Date(selectedTenant.createdAt).toLocaleDateString([], {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="super-admin-plan-section">
                  <span className="super-admin-section-label">Subscription plan</span>
                  <div className="super-admin-plan-buttons">
                    {["free", "starter", "pro"].map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        className={`admin-btn-outline ${selectedTenant.subscriptionPlan === plan ? "active-plan" : ""}`}
                        onClick={() => setPlan(selectedTenant.id, plan)}
                      >
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="admin-compose super-admin-compose" onSubmit={handleSendMessage}>
                  <div className="super-admin-compose-head">
                    <span className="super-admin-section-label">Message tenant admin</span>
                  </div>
                  <input
                    className="super-admin-subject-input"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Subject"
                    required
                  />
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder={`Write a message to ${selectedTenant.name} admin...`}
                    rows={5}
                    required
                  />
                  <div className="admin-compose-actions">
                    <button
                      type="button"
                      className="admin-btn-outline"
                      onClick={() => {
                        setMessageSubject("");
                        setMessageBody("");
                      }}
                    >
                      Clear
                    </button>
                    <button type="submit" className="admin-btn-primary send">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="m22 2-7 20-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Send message
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="super-admin-empty-panel">
                <span className="super-admin-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" strokeLinecap="round" />
                    <path d="M6 12h12M6 8h12M6 16h12" strokeLinecap="round" />
                  </svg>
                </span>
                <p>Select a tenant from the list to view details, change plans, or send messages.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {confirmSignout ? (
        <div className="modal-backdrop" onClick={() => setConfirmSignout(false)}>
          <div className="panel confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sign out</h3>
            <p className="muted">Do you want to sign out from super admin?</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmSignout(false)}>Cancel</button>
              <button type="button" className="danger" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal ? (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="panel confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmModal.title}</h3>
            <p className="muted">{confirmModal.message}</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                type="button"
                className={confirmModal.danger ? "danger" : ""}
                onClick={executeConfirm}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
