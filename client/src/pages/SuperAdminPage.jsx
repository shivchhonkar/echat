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
import { toast } from "../utils/toast";

export default function SuperAdminPage() {
  const [token, setToken] = useState(localStorage.getItem("super_admin_token") || "");
  const [mobile, setMobile] = useState(localStorage.getItem("super_admin_mobile") || "");
  const [dob, setDob] = useState("04/04/1992");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState({ totals: null, tenants: [] });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [messageTenant, setMessageTenant] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [confirmModal, setConfirmModal] = useState(null);

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
    try {
      setError("");
      const result = await requestSuperAdminOtp(mobile, dob);
      setOtpSent(true);
      setDevOtpHint(result.otp || "");
      toast.success("OTP sent successfully");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
      toast.error(err.message || "Failed to send OTP");
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (!otp.trim()) return toast.error("OTP is required");
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
    }
  }

  function handleSignOut() {
    localStorage.removeItem("super_admin_token");
    localStorage.removeItem("super_admin_mobile");
    setToken("");
    setOtp("");
    setOtpSent(false);
    setDevOtpHint("");
    setMenuOpen(false);
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
    if (!selectedTenantId) return toast.error("Please select a tenant");
    if (!messageSubject.trim()) return toast.error("Subject is required");
    if (!messageBody.trim()) return toast.error("Message is required");
    try {
      await sendMessageToTenantAdmin(token, selectedTenantId, {
        subject: messageSubject.trim(),
        message: messageBody.trim()
      });
      setMessageSubject("");
      setMessageBody("");
      setMessageTenant(null);
      toast.success("Message sent to tenant admin");
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
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

  const rowHeight = 112;
  const viewportHeight = 420;
  const overscan = 6;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(filteredSorted.length, startIndex + Math.ceil(viewportHeight / rowHeight) + overscan * 2);
  const visibleRows = filteredSorted.slice(startIndex, endIndex);

  useEffect(() => {
    setScrollTop(0);
  }, [search, sortBy]);

  if (!token) {
    return (
      <div className="admin-auth-wrap">
        <Header />
        <form className="panel" onSubmit={otpSent ? verifyOtp : requestOtp}>
          <h2>Platform Super Admin</h2>
          <p className="muted">Login with authorized mobile and OTP verification.</p>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Mobile number"
            inputMode="numeric"
            required
          />
          <input
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            placeholder="DOB (DD/MM/YYYY)"
            required
          />
          {otpSent ? (
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              inputMode="numeric"
              required
            />
          ) : null}
          <button>{otpSent ? "Verify OTP" : "Send OTP"}</button>
          {otpSent ? (
            <button type="button" onClick={() => setOtpSent(false)}>
              Change mobile / DOB
            </button>
          ) : null}
          {devOtpHint ? <p className="muted">Dev OTP: {devOtpHint}</p> : null}
          <a className="text-link" href="/admin">Back to tenant admin</a>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
        <Footer />
      </div>
    );
  }

  return (
    <div className="platform-wrap">
      <header className="platform-head">
        <h2>Platform Overview</h2>
        <div className="platform-user-controls">
          <button onClick={load}>Refresh</button>
          <div className="user-menu">
            <button
              className="avatar-button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Super admin menu"
            >
              <span className="avatar-circle">SA</span>
              <span className="avatar-label">{maskMobile(mobile)}</span>
            </button>
            {menuOpen ? (
              <div className="user-dropdown" role="menu">
                <button
                  className="dropdown-link danger"
                  onClick={() =>
                    openConfirmModal({
                      title: "Sign out",
                      message: "Do you want to sign out from super admin?",
                      confirmText: "Sign out",
                      danger: true,
                      onConfirm: handleSignOut
                    })
                  }
                  role="menuitem"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <section className="platform-toolbar">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, slug, email..." />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Join date (newest)</option>
          <option value="createdAt_asc">Join date (oldest)</option>
          <option value="name_asc">Name</option>
          <option value="plan_asc">Plan</option>
          <option value="status_asc">Status</option>
          <option value="messages_desc">Message count</option>
        </select>
      </section>
      {data.totals ? (
        <div className="totals-grid">
          <div className="kpi"><span>Tenants</span><strong>{data.totals.tenants}</strong></div>
          <div className="kpi"><span>Sessions</span><strong>{data.totals.sessions}</strong></div>
          <div className="kpi"><span>Messages</span><strong>{data.totals.messages}</strong></div>
          <div className="kpi"><span>Online chats</span><strong>{data.totals.online}</strong></div>
          <div className="kpi"><span>Communicated users</span><strong>{data.totals.communicatedUsers || 0}</strong></div>
        </div>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="platform-grid">
        <div className="tenant-virtual-wrap full" onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
          <div style={{ height: filteredSorted.length * rowHeight, position: "relative" }}>
            {visibleRows.map((t, idx) => {
              const absoluteIndex = startIndex + idx;
              const top = absoluteIndex * rowHeight;
              const joinDate = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—";
              return (
                <div key={t.id} className="tenant-row" style={{ top }}>
                  <div className="tenant-main">
                    <strong>{t.name}</strong>
                    <span>slug: {t.slug}</span>
                    <span>tenant key: {t.widgetKey || "—"}</span>
                    <span>{t.adminEmail}</span>
                  </div>
                  <div className="tenant-metrics">
                    <span className="metric-pill">{t.subscriptionPlan}</span>
                    <span className="metric-pill status">{t.subscriptionStatus}</span>
                    <span>{t.usage.totalMessages} msgs</span>
                    <span>{t.usage.communicatedUsers || 0} communicated users</span>
                    <span>Joined: {joinDate}</span>
                  </div>
                  <div className="actions">
                    <button onClick={() => setPlan(t.id, "free")}>Free</button>
                    <button onClick={() => setPlan(t.id, "starter")}>Starter</button>
                    <button onClick={() => setPlan(t.id, "pro")}>Pro</button>
                    <button
                      onClick={() => {
                        setMessageTenant(t);
                        setSelectedTenantId(t.id);
                        setMessageSubject("");
                        setMessageBody("");
                      }}
                    >
                      Send message
                    </button>
                    {t.isActive ? (
                      <button
                        onClick={() =>
                          openConfirmModal({
                            title: "Block tenant",
                            message: "This tenant will be paused and cannot use chat until unblocked.",
                            confirmText: "Block",
                            danger: true,
                            onConfirm: async () => {
                              await handleBlock(t.id);
                            }
                          })
                        }
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          openConfirmModal({
                            title: "Unblock tenant",
                            message: "This tenant will be reactivated for normal usage.",
                            confirmText: "Unblock",
                            onConfirm: async () => {
                              await handleUnblock(t.id);
                            }
                          })
                        }
                      >
                        Unblock
                      </button>
                    )}
                    <button
                      className="danger"
                      onClick={() =>
                        openConfirmModal({
                          title: "Delete tenant",
                          message: "This will permanently delete tenant data, sessions, and messages.",
                          confirmText: "Delete",
                          danger: true,
                          onConfirm: async () => {
                            await handleDelete(t.id);
                          }
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {messageTenant ? (
        <div className="modal-backdrop" onClick={() => setMessageTenant(null)}>
          <form className="panel message-modal" onSubmit={handleSendMessage} onClick={(e) => e.stopPropagation()}>
            <h3>Message Tenant Admin</h3>
            <p className="muted">{messageTenant.name} ({messageTenant.slug})</p>
            <input
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder="Subject"
              required
            />
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Write message for tenant admin..."
              rows={6}
              required
            />
            <div className="modal-actions">
              <button type="button" onClick={() => setMessageTenant(null)}>Cancel</button>
              <button>Send message</button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmModal ? (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div className="panel confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmModal.title}</h3>
            <p className="muted">{confirmModal.message}</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
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
