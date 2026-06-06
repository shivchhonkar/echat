/**
 * 2Factor.in SMS — aligned with ebilling-billint apps/web integration:
 * - OTP_API_KEY (same key as billint)
 * - SMS_SENDER_ID / TRANSACTIONAL_SMS_SENDER_ID
 * - TSMS open message: POST JSON { From, To, Msg } with To as 91XXXXXXXXXX
 * @see ebilling-billint/apps/web/src/lib/automatic-bills/notify-customer.ts
 * @see ebilling-billint/apps/web/src/app/api/utility/helpers/otp-helper.ts
 */
const TWOFACTOR_BASE = "https://2factor.in/API/V1";

function getApiKey() {
  return String(
    process.env.OTP_API_KEY || process.env.TWOFACTOR_API_KEY || ""
  ).trim();
}

function getDefaultSenderId() {
  return String(
    process.env.SMS_SENDER_ID ||
      process.env.TRANSACTIONAL_SMS_SENDER_ID ||
      process.env.TWOFACTOR_SENDER_ID ||
      ""
  ).trim();
}

/** E.164-style India number (91…) for 2Factor TSMS/PSMS `To` field — matches billint. */
export function normalizePhoneForTransactionalSms(phone) {
  if (!String(phone || "").trim()) return null;
  const d = String(phone).replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

/** 10-digit display/storage format */
export function normalizePhone(raw) {
  const e164 = normalizePhoneForTransactionalSms(raw);
  if (!e164) return "";
  if (e164.length === 12 && e164.startsWith("91")) return e164.slice(2);
  return e164;
}

async function twoFactorJsonPost(path, body) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("2Factor API key is not configured. Set OTP_API_KEY in .env");
  }

  const url = `${TWOFACTOR_BASE}/${apiKey}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "eChat-CampaignManager/1.0",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { Status: res.ok ? "Success" : "Error", Details: text };
  }
  return { ok: res.ok, data, raw: text };
}

async function twoFactorFormPost(path, form) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("2Factor API key is not configured. Set OTP_API_KEY in .env");
  }

  const url = `${TWOFACTOR_BASE}/${apiKey}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "eChat-CampaignManager/1.0",
    },
    body: new URLSearchParams(form).toString(),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { Status: res.ok ? "Success" : "Error", Details: text };
  }
  return { ok: res.ok, data, raw: text };
}

async function twoFactorGet(path) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("2Factor API key is not configured. Set OTP_API_KEY in .env");
  const url = `${TWOFACTOR_BASE}/${apiKey}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "eChat-CampaignManager/1.0" },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { Status: res.ok ? "Success" : "Error", Details: text };
  }
  return { ok: res.ok, data, raw: text };
}

function isSuccessResponse(data) {
  const status = String(data?.Status || "").toLowerCase();
  return status === "success" || status === "";
}

export function isTwoFactorConfigured() {
  return !!getApiKey();
}

export function isTwoFactorSmsReady() {
  return !!getApiKey() && !!getDefaultSenderId();
}

export async function getTwoFactorBalances() {
  const balances = {};
  for (const [key, path] of [
    ["transactional", "/ADDON_SERVICES/BAL/TRANSACTIONAL_SMS"],
    ["promotional", "/ADDON_SERVICES/BAL/PROMOTIONAL_SMS"],
  ]) {
    try {
      const { data } = await twoFactorGet(path);
      balances[key] = data;
    } catch (err) {
      balances[key] = { Status: "Error", Details: err.message };
    }
  }
  return balances;
}

/** Open-message SMS — same pattern as billint automatic invoice notify */
export async function sendOpenSms({ to, message, senderId, smsType = "transactional" }) {
  const phone = normalizePhoneForTransactionalSms(to);
  if (!phone) throw new Error(`Invalid phone number: ${to}`);

  const from = String(senderId || getDefaultSenderId()).trim();
  if (!from) {
    throw new Error("Sender ID is required. Set SMS_SENDER_ID in .env or pass senderId.");
  }

  const msg = String(message || "").trim();
  if (!msg) throw new Error("Message text is required");

  const endpoint =
    smsType === "promotional"
      ? "/ADDON_SERVICES/SEND/PSMS"
      : "/ADDON_SERVICES/SEND/TSMS";

  const { ok, data } = await twoFactorJsonPost(endpoint, {
    From: from,
    To: phone,
    Msg: msg.slice(0, 500),
  });

  const success = ok && isSuccessResponse(data);
  return {
    success,
    phone: normalizePhone(phone),
    response: data,
    error: success ? null : data?.Details || data?.Message || "SMS send failed",
  };
}

/** DLT template SMS — for registered promotional/transactional templates */
export async function sendTemplateSms({
  to,
  senderId,
  templateName,
  smsType = "transactional",
  variables = {},
}) {
  const phone = normalizePhoneForTransactionalSms(to);
  if (!phone) throw new Error(`Invalid phone number: ${to}`);

  const from = String(senderId || getDefaultSenderId()).trim();
  if (!from) throw new Error("Sender ID is required. Set SMS_SENDER_ID in .env or pass senderId.");

  const template = String(templateName || "").trim();
  if (!template) throw new Error("DLT template name is required for template-based SMS.");

  const endpoint =
    smsType === "promotional"
      ? "/ADDON_SERVICES/SEND/PSMS"
      : "/ADDON_SERVICES/SEND/TSMS";

  const form = {
    From: from,
    To: phone,
    TemplateName: template,
  };

  Object.entries(variables).forEach(([key, value]) => {
    if (value != null && String(value).trim()) {
      form[key.toUpperCase()] = String(value);
    }
  });

  const { ok, data } = await twoFactorFormPost(endpoint, form);
  const success = ok && isSuccessResponse(data);
  return {
    success,
    phone: normalizePhone(phone),
    response: data,
    error: success ? null : data?.Details || data?.Message || "SMS send failed",
  };
}

export async function sendBulkSms({
  recipients,
  senderId,
  smsType = "transactional",
  sendMode = "open",
  message = "",
  templateName = "",
  variables = {},
  onProgress,
}) {
  const uniquePhones = [
    ...new Set(
      recipients
        .map(normalizePhoneForTransactionalSms)
        .filter(Boolean)
    ),
  ];

  const results = [];
  const useOpen = sendMode === "open" || (!templateName?.trim() && message?.trim());

  for (let i = 0; i < uniquePhones.length; i += 1) {
    const phone = uniquePhones[i];
    try {
      const result = useOpen
        ? await sendOpenSms({ to: phone, message, senderId, smsType })
        : await sendTemplateSms({
            to: phone,
            senderId,
            templateName,
            smsType,
            variables,
          });
      results.push(result);
    } catch (err) {
      results.push({
        success: false,
        phone: normalizePhone(phone),
        response: null,
        error: err.message,
      });
    }
    onProgress?.({ index: i + 1, total: uniquePhones.length, phone, results });
    if (i < uniquePhones.length - 1) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return {
    total: uniquePhones.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    sendMode: useOpen ? "open" : "template",
  };
}

/** OTP via GET — same as billint otp-helper */
export async function sendOtpSms(mobile, otp, template = "login") {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OTP_API_KEY not configured");

  const cleanMobile = normalizePhone(mobile);
  if (cleanMobile.length !== 10) throw new Error("Invalid mobile number format");

  const { ok, data } = await twoFactorGet(`/SMS/${cleanMobile}/${otp}/${template}`);
  const success = ok && isSuccessResponse(data);
  if (!success) throw new Error(data?.Details || "Failed to send OTP via SMS");
  return data;
}

export { getDefaultSenderId, getApiKey };
