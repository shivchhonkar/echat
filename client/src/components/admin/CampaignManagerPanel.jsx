import { useEffect, useMemo, useState } from "react";
import {
  getCampaignConfig,
  getCampaigns,
  getWhatsAppTemplates,
  sendBulkSmsCampaign,
  sendBulkWhatsAppCampaign,
} from "../../api";
import { toast } from "../../utils/toast";

function MegaphoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m3 11 7-7v18l-7-7H1V11h2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8.5a5 5 0 0 1 0 7M17 6a8 8 0 0 1 0 12" strokeLinecap="round" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.23h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.07c-.25.7-1.45 1.34-2 1.44-.5.09-1.15.13-1.86-.12-.43-.15-.98-.35-1.69-.69-2.97-1.29-4.9-4.35-5.05-4.56-.14-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.38.79-.38.2 0 .4 0 .58.01.19.01.43-.07.67.51.25.6.85 2.08.92 2.23.08.15.13.33.02.53-.1.2-.16.33-.32.51-.16.18-.34.4-.48.54-.16.16-.33.34-.14.66.19.32.84 1.39 1.8 2.25 1.24 1.1 2.28 1.44 2.6 1.6.32.16.51.14.7-.08.19-.22.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.82.86 2.13 1.02.32.16.53.24.61.37.08.13.08.76-.17 1.46Z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countRecipients(text) {
  return String(text || "")
    .split(/[\n,;]+/)
    .map((v) => v.trim().replace(/\D/g, ""))
    .filter((d) => d.length === 10 || (d.length === 12 && d.startsWith("91"))).length;
}

function BulkSmsCampaignForm({ token, config, onSent }) {
  const [name, setName] = useState("");
  const [sendMode, setSendMode] = useState("open");
  const [templateName, setTemplateName] = useState("");
  const [senderId, setSenderId] = useState(config?.defaultSenderId || "");
  const [smsType, setSmsType] = useState("transactional");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [var1, setVar1] = useState("");
  const [var2, setVar2] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (config?.defaultSenderId) setSenderId(config.defaultSenderId);
  }, [config?.defaultSenderId]);

  const recipientCount = useMemo(() => countRecipients(recipients), [recipients]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!config?.configured) {
      return toast.error("Configure OTP_API_KEY in server .env first (same as billint)");
    }
    if (!config?.smsReady && !senderId.trim()) {
      return toast.error("Configure SMS_SENDER_ID in server .env or enter a sender ID");
    }
    setSending(true);
    try {
      const result = await sendBulkSmsCampaign(token, {
        name,
        sendMode,
        templateName,
        senderId,
        smsType,
        recipients,
        message,
        var1,
        var2,
      });
      toast.success(`Campaign sent — ${result.summary.sent}/${result.summary.total} delivered`);
      setName("");
      setRecipients("");
      setMessage("");
      setVar1("");
      setVar2("");
      onSent?.();
    } catch (err) {
      toast.error(err.message || "Failed to send campaign");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="campaign-panel-card">
      <div className="campaign-panel-card-head">
        <SmsIcon />
        <div>
          <h3 className="campaign-panel-title">Bulk SMS via 2Factor.in</h3>
          <p className="campaign-panel-subtitle">
            Uses the same 2Factor setup as billint — <code>OTP_API_KEY</code> + <code>SMS_SENDER_ID</code>, open-message TSMS or DLT templates.
          </p>
        </div>
      </div>

      {!config?.configured ? (
        <div className="campaign-alert warning">
          Add <code>OTP_API_KEY</code> and <code>SMS_SENDER_ID</code> to eChat server <code>.env</code> (copy from billint <code>apps/web/.env</code>).
        </div>
      ) : (
        <div className="campaign-config-strip">
          <span className="campaign-pill ok">2Factor API connected</span>
          {config.smsReady ? (
            <span className="campaign-pill ok">Sender: {config.defaultSenderId}</span>
          ) : (
            <span className="campaign-pill">Add SMS_SENDER_ID to .env</span>
          )}
        </div>
      )}

      <form className="campaign-form" onSubmit={handleSubmit}>
        <div className="campaign-form-grid">
          <label>
            Campaign name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. June offer blast" required />
          </label>
          <label>
            Send mode
            <select value={sendMode} onChange={(e) => setSendMode(e.target.value)}>
              <option value="open">Open message (billint TSMS style)</option>
              <option value="template">DLT registered template</option>
            </select>
          </label>
          <label>
            SMS type
            <select value={smsType} onChange={(e) => setSmsType(e.target.value)}>
              <option value="transactional">Transactional (24×7)</option>
              <option value="promotional">Promotional (10am–9pm TRAI)</option>
            </select>
          </label>
          <label>
            Sender ID (Header)
            <input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="SMS_SENDER_ID from .env" required />
          </label>
        </div>

        {sendMode === "template" ? (
          <>
            <label>
              DLT template name
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="REGISTERED_TEMPLATE_ID"
                required
              />
            </label>
            <div className="campaign-form-grid">
              <label>
                Template variable VAR1
                <input value={var1} onChange={(e) => setVar1(e.target.value)} placeholder="Optional" />
              </label>
              <label>
                Template variable VAR2
                <input value={var2} onChange={(e) => setVar2(e.target.value)} placeholder="Optional" />
              </label>
            </div>
          </>
        ) : (
          <label>
            Message text
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hello customer, enjoy 20% off this weekend at care.shribi.com"
              rows={4}
              required
            />
            <span className="campaign-field-hint">Sent via 2Factor TSMS/PSMS with From + To (91…) + Msg — same as billint invoice SMS.</span>
          </label>
        )}

        <label>
          Recipients (one per line or comma-separated)
          <textarea
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder={"9876543210\n9123456789"}
            rows={5}
            required
          />
          <span className="campaign-field-hint">{recipientCount} valid numbers detected</span>
        </label>

        <div className="campaign-form-actions">
          <a className="campaign-link" href="https://2factor.in/" target="_blank" rel="noopener noreferrer">
            Open 2Factor.in dashboard
          </a>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={sending || !config?.configured || (!config?.smsReady && !senderId.trim())}
          >
            {sending ? "Sending..." : "Launch SMS campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BulkWhatsAppCampaignForm({ token, config, onSent }) {
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [recipients, setRecipients] = useState("");
  const [messagePreview, setMessagePreview] = useState("");
  const [var1, setVar1] = useState("");
  const [var2, setVar2] = useState("");
  const [var3, setVar3] = useState("");
  const [headerVar1, setHeaderVar1] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesWarning, setTemplatesWarning] = useState("");
  const [sending, setSending] = useState(false);

  const waConfig = config?.whatsapp;
  const recipientCount = useMemo(() => countRecipients(recipients), [recipients]);

  useEffect(() => {
    if (!token || !waConfig?.configured) return;
    setTemplatesLoading(true);
    getWhatsAppTemplates(token)
      .then((data) => {
        setTemplates(data.templates || []);
        setTemplatesWarning(data.warning || "");
      })
      .catch((err) => {
        setTemplates([]);
        setTemplatesWarning(err.message || "Could not load templates");
      })
      .finally(() => setTemplatesLoading(false));
  }, [token, waConfig?.configured]);

  function handleTemplatePick(value) {
    setTemplateName(value);
    const match = templates.find((t) => t.name === value);
    if (match?.language) setLanguageCode(match.language);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!waConfig?.configured) {
      return toast.error("Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env");
    }
    setSending(true);
    try {
      const result = await sendBulkWhatsAppCampaign(token, {
        name,
        templateName,
        languageCode,
        recipients,
        messagePreview,
        var1,
        var2,
        var3,
        headerVar1,
      });
      toast.success(`WhatsApp campaign sent — ${result.summary.sent}/${result.summary.total} delivered`);
      setName("");
      setRecipients("");
      setMessagePreview("");
      setVar1("");
      setVar2("");
      setVar3("");
      setHeaderVar1("");
      onSent?.();
    } catch (err) {
      toast.error(err.message || "Failed to send WhatsApp campaign");
    } finally {
      setSending(false);
    }
  }

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");

  return (
    <div className="campaign-panel-card">
      <div className="campaign-panel-card-head">
        <WhatsAppIcon />
        <div>
          <h3 className="campaign-panel-title">WhatsApp bulk campaigns</h3>
          <p className="campaign-panel-subtitle">
            Send approved marketing templates via Meta WhatsApp Cloud API to multiple recipients.
          </p>
        </div>
      </div>

      {!waConfig?.configured ? (
        <div className="campaign-alert warning">
          Add <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> to server <code>.env</code>.
          Optional: <code>WHATSAPP_BUSINESS_ACCOUNT_ID</code> to load templates from Meta.
        </div>
      ) : (
        <div className="campaign-config-strip">
          <span className="campaign-pill ok">Meta WhatsApp connected</span>
          {waConfig.phoneNumberId ? (
            <span className="campaign-pill">Phone ID: {waConfig.phoneNumberId}</span>
          ) : null}
          {waConfig.canListTemplates ? (
            <span className="campaign-pill ok">Template sync enabled</span>
          ) : (
            <span className="campaign-pill">Enter template name manually</span>
          )}
        </div>
      )}

      <form className="campaign-form" onSubmit={handleSubmit}>
        <div className="campaign-form-grid">
          <label>
            Campaign name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend promo" required />
          </label>
          <label>
            Template language
            <input
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              placeholder="en or en_US"
              required
            />
          </label>
        </div>

        <label>
          WhatsApp template
          {approvedTemplates.length > 0 ? (
            <select value={templateName} onChange={(e) => handleTemplatePick(e.target.value)} required>
              <option value="">Select approved template</option>
              {approvedTemplates.map((t) => (
                <option key={`${t.name}-${t.language}`} value={t.name}>
                  {t.name} ({t.language}) · {t.category || "template"}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="hello_world or your_marketing_template"
              required
            />
          )}
          {templatesLoading ? (
            <span className="campaign-field-hint">Loading templates from Meta…</span>
          ) : templatesWarning ? (
            <span className="campaign-field-hint">{templatesWarning}</span>
          ) : approvedTemplates.length > 0 ? (
            <span className="campaign-field-hint">{approvedTemplates.length} approved templates loaded</span>
          ) : (
            <span className="campaign-field-hint">
              Use an approved template name from Meta Business Manager (marketing templates for promotions).
            </span>
          )}
        </label>

        <label>
          Message preview (for your records)
          <textarea
            value={messagePreview}
            onChange={(e) => setMessagePreview(e.target.value)}
            placeholder="Template body preview / notes for this campaign"
            rows={2}
          />
        </label>

        <div className="campaign-form-grid">
          <label>
            Header variable 1
            <input value={headerVar1} onChange={(e) => setHeaderVar1(e.target.value)} placeholder="If template has {{1}} in header" />
          </label>
          <label>
            Body variable 1
            <input value={var1} onChange={(e) => setVar1(e.target.value)} placeholder="Replaces {{1}} in body" />
          </label>
          <label>
            Body variable 2
            <input value={var2} onChange={(e) => setVar2(e.target.value)} placeholder="Optional" />
          </label>
          <label>
            Body variable 3
            <input value={var3} onChange={(e) => setVar3(e.target.value)} placeholder="Optional" />
          </label>
        </div>

        <label>
          Recipients (one per line or comma-separated)
          <textarea
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder={"919876543210\n9876543210"}
            rows={5}
            required
          />
          <span className="campaign-field-hint">
            {recipientCount} valid numbers · 10-digit Indian numbers auto-prefixed with 91
          </span>
        </label>

        <div className="campaign-alert info">
          Bulk sends use template messages only (Meta policy). Recipients should have opted in. Rate limits apply per Meta tier.
        </div>

        <div className="campaign-form-actions">
          <a
            className="campaign-link"
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates"
            target="_blank"
            rel="noopener noreferrer"
          >
            Meta template docs
          </a>
          <button type="submit" className="admin-btn-primary" disabled={sending || !waConfig?.configured}>
            {sending ? "Sending..." : "Launch WhatsApp campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CampaignHistoryTable({ campaigns, loading }) {
  if (loading) return <p className="campaign-muted">Loading campaign history...</p>;
  if (!campaigns.length) {
    return <p className="campaign-muted">No campaigns yet. Launch your first SMS campaign to see results here.</p>;
  }

  return (
    <div className="campaign-history-table-wrap">
      <table className="campaign-history-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Channel</th>
            <th>Type</th>
            <th>Recipients</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c._id}>
              <td>
                <span className="campaign-history-name">{c.name}</span>
                {c.templateName ? (
                  <small>
                    {c.templateName}
                    {c.templateLanguage ? ` · ${c.templateLanguage}` : ""}
                  </small>
                ) : null}
              </td>
              <td>{c.channel === "whatsapp" ? "WhatsApp" : "SMS"}</td>
              <td>
                {c.smsType || "—"}
                {c.sendMode ? ` · ${c.sendMode}` : ""}
              </td>
              <td>
                {c.stats?.sent ?? 0}/{c.stats?.total ?? 0} sent
                {(c.stats?.failed ?? 0) > 0 ? ` · ${c.stats.failed} failed` : ""}
              </td>
              <td>
                <span className={`campaign-status-pill status-${c.status}`}>{c.status}</span>
              </td>
              <td>{formatDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CampaignManagerPanel({ section, token }) {
  const [config, setConfig] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const [cfg, list] = await Promise.all([getCampaignConfig(token), getCampaigns(token)]);
      setConfig(cfg);
      setCampaigns(list);
    } catch (err) {
      toast.error(err.message || "Failed to load campaign manager");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

  const title =
    section === "campaign-whatsapp"
      ? "WhatsApp campaigns"
      : section === "campaign-history"
        ? "Campaign history"
        : "Bulk SMS campaigns";

  const poweredBy =
    section === "campaign-whatsapp"
      ? "Meta WhatsApp Cloud API"
      : section === "campaign-sms"
        ? "2Factor.in"
        : "SMS & WhatsApp";

  return (
    <div className="campaign-manager">
      <div className="campaign-manager-head">
        <span className="campaign-manager-icon" aria-hidden="true">
          <MegaphoneIcon />
        </span>
        <div>
          <h2 className="campaign-manager-title">Campaign Manager</h2>
          <p className="campaign-manager-subtitle">{title} · {poweredBy}</p>
        </div>
      </div>

      {section === "campaign-sms" ? (
        <BulkSmsCampaignForm token={token} config={config} onSent={loadData} />
      ) : null}

      {section === "campaign-whatsapp" ? (
        <BulkWhatsAppCampaignForm token={token} config={config} onSent={loadData} />
      ) : null}

      {section === "campaign-history" ? (
        <div className="campaign-panel-card">
          <div className="campaign-panel-card-head">
            <HistoryIcon />
            <div>
              <h3 className="campaign-panel-title">Campaign history</h3>
              <p className="campaign-panel-subtitle">Track SMS and WhatsApp promotional runs for this workspace.</p>
            </div>
          </div>
          <CampaignHistoryTable campaigns={campaigns} loading={loading} />
        </div>
      ) : null}

      {section === "campaign-sms" && config?.balances ? (
        <div className="campaign-balance-card">
          <h4 className="campaign-balance-title">2Factor balance snapshot</h4>
          <div className="campaign-balance-grid">
            <div>
              <span>Transactional SMS</span>
              <code>{JSON.stringify(config.balances.transactional)}</code>
            </div>
            <div>
              <span>Promotional SMS</span>
              <code>{JSON.stringify(config.balances.promotional)}</code>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
