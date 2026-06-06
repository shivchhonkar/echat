import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { Campaign } from "../models/Campaign.js";
import { ActivityLog } from "../models/ActivityLog.js";
import {
  getDefaultSenderId,
  getTwoFactorBalances,
  isTwoFactorConfigured,
  isTwoFactorSmsReady,
  normalizePhone,
  sendBulkSms,
} from "../services/twoFactorSms.js";
import {
  getWhatsAppPublicConfig,
  isWhatsAppConfigured,
  listMessageTemplates,
  normalizeWhatsAppPhone,
  sendBulkTemplateMessages,
} from "../services/whatsappCloudApi.js";

const router = Router();

function parseRecipients(input) {
  if (Array.isArray(input)) return input;
  return String(input || "")
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function pickVariables(body = {}) {
  const vars = {};
  for (let i = 1; i <= 5; i += 1) {
    const key = `var${i}`;
    const alt = `VAR${i}`;
    const value = body[key] ?? body[alt];
    if (value != null && String(value).trim()) vars[`VAR${i}`] = String(value).trim();
  }
  return vars;
}

function pickTemplateParams(body = {}, prefix = "var") {
  const params = [];
  for (let i = 1; i <= 10; i += 1) {
    const value = body[`${prefix}${i}`] ?? body[`${prefix.toUpperCase()}${i}`];
    if (value != null && String(value).trim()) params.push(String(value).trim());
  }
  return params;
}

router.get("/config", requireAdmin, async (_req, res) => {
  try {
    const configured = isTwoFactorConfigured();
    let balances = null;
    if (configured) {
      balances = await getTwoFactorBalances();
    }
    return res.json({
      provider: "2factor.in",
      configured,
      smsReady: isTwoFactorSmsReady(),
      envKeys: ["OTP_API_KEY", "SMS_SENDER_ID"],
      defaultSenderId: getDefaultSenderId(),
      balances,
      whatsapp: getWhatsAppPublicConfig(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to load campaign config" });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const tenantId = req.admin.tenantId;
    const channel = req.query.channel;
    const filter = { tenantId };
    if (channel) filter.channel = String(channel);
    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(campaigns);
  } catch {
    return res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.post("/sms/bulk", requireAdmin, async (req, res) => {
  const {
    name,
    templateName = "",
    senderId,
    smsType = "promotional",
    sendMode = "open",
    recipients,
    message = "",
    messagePreview = "",
    ...rest
  } = req.body ?? {};

  if (!name?.trim()) return res.status(400).json({ error: "Campaign name is required" });

  const resolvedSendMode = sendMode === "template" ? "template" : "open";
  const resolvedMessage = String(message || messagePreview || "").trim();

  if (resolvedSendMode === "open" && !resolvedMessage) {
    return res.status(400).json({ error: "Message text is required for open SMS campaigns" });
  }
  if (resolvedSendMode === "template" && !templateName?.trim()) {
    return res.status(400).json({ error: "DLT template name is required for template-based campaigns" });
  }

  const phoneList = parseRecipients(recipients).map(normalizePhone).filter((p) => p.length === 10);
  if (!phoneList.length) return res.status(400).json({ error: "Add at least one valid 10-digit mobile number" });

  if (!isTwoFactorConfigured()) {
    return res.status(503).json({ error: "2Factor API is not configured. Add OTP_API_KEY to .env" });
  }
  if (!String(senderId || getDefaultSenderId()).trim()) {
    return res.status(503).json({ error: "SMS sender ID is not configured. Add SMS_SENDER_ID to .env" });
  }

  const variables = pickVariables(rest);
  const tenantId = req.admin.tenantId;
  const resolvedSender = String(senderId || getDefaultSenderId()).trim();

  const campaign = await Campaign.create({
    tenantId,
    name: String(name).trim(),
    channel: "sms",
    smsType: smsType === "transactional" ? "transactional" : "promotional",
    sendMode: resolvedSendMode,
    templateName: String(templateName).trim(),
    senderId: resolvedSender,
    messagePreview: resolvedMessage,
    variables,
    recipients: phoneList.map((phone) => ({ phone, status: "pending" })),
    stats: { total: phoneList.length, sent: 0, failed: 0 },
    status: "sending",
    createdBy: req.admin.email,
  });

  try {
    const bulk = await sendBulkSms({
      recipients: phoneList,
      senderId: resolvedSender,
      templateName: campaign.templateName,
      smsType: campaign.smsType,
      sendMode: resolvedSendMode,
      message: resolvedMessage,
      variables,
    });

    const updatedRecipients = bulk.results.map((r) => ({
      phone: r.phone,
      status: r.success ? "sent" : "failed",
      error: r.error || "",
      providerResponse: r.response,
    }));

    campaign.recipients = updatedRecipients;
    campaign.stats = { total: bulk.total, sent: bulk.sent, failed: bulk.failed };
    campaign.status = bulk.failed === bulk.total ? "failed" : "completed";
    await campaign.save();

    await ActivityLog.create({
      tenantId,
      actorRole: "tenant_admin",
      actorEmail: req.admin.email,
      action: "campaign_sms_bulk_send",
      status: bulk.failed ? "failure" : "success",
      details: `SMS campaign "${campaign.name}" — ${bulk.sent}/${bulk.total} sent`,
      metadata: {
        campaignId: String(campaign._id),
        smsType: campaign.smsType,
        sendMode: bulk.sendMode,
        provider: "2factor.in",
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    return res.json({
      campaign,
      summary: { total: bulk.total, sent: bulk.sent, failed: bulk.failed },
    });
  } catch (err) {
    campaign.status = "failed";
    await campaign.save();
    return res.status(500).json({ error: err.message || "Bulk SMS send failed" });
  }
});

router.get("/whatsapp/templates", requireAdmin, async (_req, res) => {
  try {
    if (!isWhatsAppConfigured()) {
      return res.status(503).json({ error: "WhatsApp Cloud API is not configured" });
    }
    const data = await listMessageTemplates();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to load WhatsApp templates" });
  }
});

router.post("/whatsapp/bulk", requireAdmin, async (req, res) => {
  const {
    name,
    templateName,
    languageCode = "en",
    recipients,
    messagePreview = "",
    ...rest
  } = req.body ?? {};

  if (!name?.trim()) return res.status(400).json({ error: "Campaign name is required" });
  if (!templateName?.trim()) {
    return res.status(400).json({ error: "Approved WhatsApp template name is required" });
  }
  if (!isWhatsAppConfigured()) {
    return res.status(503).json({
      error: "WhatsApp Cloud API is not configured",
      hint: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env",
    });
  }

  const phoneList = parseRecipients(recipients)
    .map(normalizeWhatsAppPhone)
    .filter(Boolean);
  if (!phoneList.length) {
    return res.status(400).json({ error: "Add at least one valid mobile number with country code" });
  }

  const bodyParams = pickTemplateParams(rest, "var");
  const headerParams = pickTemplateParams(rest, "headerVar");
  const tenantId = req.admin.tenantId;
  const resolvedLanguage = String(languageCode || "en").trim();

  const campaign = await Campaign.create({
    tenantId,
    name: String(name).trim(),
    channel: "whatsapp",
    smsType: "promotional",
    sendMode: "template",
    templateName: String(templateName).trim(),
    templateLanguage: resolvedLanguage,
    messagePreview: String(messagePreview || templateName).trim(),
    variables: { bodyParams, headerParams },
    recipients: phoneList.map((phone) => ({
      phone: phone.length === 12 && phone.startsWith("91") ? phone.slice(2) : phone,
      status: "pending",
    })),
    stats: { total: phoneList.length, sent: 0, failed: 0 },
    status: "sending",
    createdBy: req.admin.email,
    provider: "meta_whatsapp",
  });

  try {
    const bulk = await sendBulkTemplateMessages({
      recipients: phoneList,
      templateName: campaign.templateName,
      languageCode: resolvedLanguage,
      bodyParams,
      headerParams,
    });

    const updatedRecipients = bulk.results.map((r) => ({
      phone: r.phone?.length === 12 && r.phone.startsWith("91") ? r.phone.slice(2) : r.phone,
      status: r.success ? "sent" : "failed",
      error: r.error || "",
      providerResponse: r.response || { messageId: r.messageId },
    }));

    campaign.recipients = updatedRecipients;
    campaign.stats = { total: bulk.total, sent: bulk.sent, failed: bulk.failed };
    campaign.status = bulk.failed === bulk.total ? "failed" : "completed";
    await campaign.save();

    await ActivityLog.create({
      tenantId,
      actorRole: "tenant_admin",
      actorEmail: req.admin.email,
      action: "campaign_whatsapp_bulk_send",
      status: bulk.failed ? "failure" : "success",
      details: `WhatsApp campaign "${campaign.name}" — ${bulk.sent}/${bulk.total} sent`,
      metadata: {
        campaignId: String(campaign._id),
        templateName: campaign.templateName,
        languageCode: resolvedLanguage,
        provider: "meta_whatsapp",
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    return res.json({
      campaign,
      summary: { total: bulk.total, sent: bulk.sent, failed: bulk.failed },
    });
  } catch (err) {
    campaign.status = "failed";
    await campaign.save();
    return res.status(500).json({ error: err.message || "Bulk WhatsApp send failed" });
  }
});

router.get("/:campaignId", requireAdmin, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      tenantId: req.admin.tenantId,
    }).lean();
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    return res.json(campaign);
  } catch {
    return res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

export default router;
