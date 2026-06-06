/**
 * Meta WhatsApp Cloud API
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */
const API_VERSION = String(process.env.WHATSAPP_API_VERSION || "v21.0").trim();

function graphBase() {
  return `https://graph.facebook.com/${API_VERSION}`;
}

function getAccessToken() {
  return String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
}

function getPhoneNumberId() {
  return String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
}

function getBusinessAccountId() {
  return String(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim();
}

/** Normalize to WhatsApp `to` field (country code + number, no +). */
export function normalizeWhatsAppPhone(raw) {
  if (!String(raw || "").trim()) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

export function isWhatsAppConfigured() {
  return !!getAccessToken() && !!getPhoneNumberId();
}

export function getWhatsAppPublicConfig() {
  const phoneNumberId = getPhoneNumberId();
  const businessAccountId = getBusinessAccountId();
  return {
    configured: isWhatsAppConfigured(),
    phoneNumberId: phoneNumberId ? `…${phoneNumberId.slice(-6)}` : "",
    businessAccountId: businessAccountId ? `…${businessAccountId.slice(-6)}` : "",
    canListTemplates: !!businessAccountId && !!getAccessToken(),
    apiVersion: API_VERSION,
  };
}

async function graphRequest(path, { method = "GET", body } = {}) {
  const token = getAccessToken();
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");

  const res = await fetch(`${graphBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      data?.error?.message ||
      data?.error?.error_user_msg ||
      data?.error?.error_user_title ||
      `WhatsApp API error (${res.status})`;
    throw new Error(err);
  }
  return data;
}

export async function listMessageTemplates({ limit = 100 } = {}) {
  const wabaId = getBusinessAccountId();
  if (!wabaId) {
    return { templates: [], warning: "Set WHATSAPP_BUSINESS_ACCOUNT_ID to load templates from Meta" };
  }

  const params = new URLSearchParams({
    limit: String(Math.min(limit, 250)),
    fields: "name,language,status,category,components",
  });

  const data = await graphRequest(`/${wabaId}/message_templates?${params}`);
  const templates = (data?.data || []).map((t) => ({
    name: t.name,
    language: t.language,
    status: t.status,
    category: t.category,
    components: t.components,
  }));

  return { templates, paging: data?.paging || null };
}

export async function sendTemplateMessage({
  to,
  templateName,
  languageCode = "en",
  bodyParams = [],
  headerParams = [],
}) {
  const phoneNumberId = getPhoneNumberId();
  if (!phoneNumberId) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");

  const recipient = normalizeWhatsAppPhone(to);
  if (!recipient) throw new Error(`Invalid phone number: ${to}`);

  const template = {
    name: String(templateName || "").trim(),
    language: { code: String(languageCode || "en").trim() },
  };

  const components = [];
  if (headerParams.length) {
    components.push({
      type: "header",
      parameters: headerParams.map((text) => ({ type: "text", text: String(text) })),
    });
  }
  if (bodyParams.length) {
    components.push({
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text: String(text) })),
    });
  }
  if (components.length) template.components = components;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template,
  };

  try {
    const data = await graphRequest(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: payload,
    });
    return {
      success: true,
      phone: recipient,
      messageId: data?.messages?.[0]?.id || null,
      response: data,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      phone: recipient,
      messageId: null,
      response: null,
      error: err.message,
    };
  }
}

export async function sendBulkTemplateMessages({
  recipients,
  templateName,
  languageCode = "en",
  bodyParams = [],
  headerParams = [],
  onProgress,
}) {
  const uniquePhones = [
    ...new Set(
      recipients.map(normalizeWhatsAppPhone).filter(Boolean)
    ),
  ];

  const results = [];
  for (let i = 0; i < uniquePhones.length; i += 1) {
    const phone = uniquePhones[i];
    const result = await sendTemplateMessage({
      to: phone,
      templateName,
      languageCode,
      bodyParams,
      headerParams,
    });
    results.push(result);
    onProgress?.({ index: i + 1, total: uniquePhones.length, phone, results });
    if (i < uniquePhones.length - 1) {
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  return {
    total: uniquePhones.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
