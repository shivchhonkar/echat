import { Router } from "express";
import mongoose from "mongoose";
import { createSuperAdminToken, requireSuperAdmin } from "../middleware/auth.js";
import { Tenant } from "../models/Tenant.js";
import { UserSession } from "../models/UserSession.js";
import { Message } from "../models/Message.js";
import { TenantAdminMessage } from "../models/TenantAdminMessage.js";

const router = Router();
const otpStore = new Map();
const allowedMobiles = new Set(["9528466566", "9650593896"]);
const requiredDob = "04/04/1992";

function normalizeMobile(input = "") {
  const digits = String(input).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeDob(input = "") {
  const value = String(input).trim();
  if (value.includes("-")) {
    const parts = value.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return value;
}

router.post("/request-otp", async (req, res) => {
  const mobile = normalizeMobile(req.body?.mobile);
  const dob = normalizeDob(req.body?.dob);
  if (!mobile || !dob) return res.status(400).json({ error: "Mobile and DOB are required" });
  if (!allowedMobiles.has(mobile)) return res.status(403).json({ error: "Mobile number is not authorized" });
  if (dob !== requiredDob) return res.status(403).json({ error: "DOB validation failed" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(mobile, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  console.log(`[SUPER_ADMIN_OTP] mobile=${mobile} otp=${otp}`);

  return res.json({
    success: true,
    message: "OTP sent",
    ...(process.env.NODE_ENV !== "production" ? { otp } : {})
  });
});

router.post("/verify-otp", async (req, res) => {
  const mobile = normalizeMobile(req.body?.mobile);
  const otp = String(req.body?.otp || "").trim();
  if (!mobile || !otp) return res.status(400).json({ error: "Mobile and OTP are required" });

  const entry = otpStore.get(mobile);
  if (!entry || entry.expiresAt < Date.now() || entry.otp !== otp) {
    return res.status(401).json({ error: "Invalid or expired OTP" });
  }
  otpStore.delete(mobile);
  return res.json({
    token: createSuperAdminToken({ email: `superadmin+${mobile}@echat.local` })
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  if (
    String(email).toLowerCase() !== String(process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com").toLowerCase() ||
    password !== (process.env.SUPER_ADMIN_PASSWORD || "superadmin123")
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  return res.json({ token: createSuperAdminToken({ email: String(email).toLowerCase() }) });
});

router.get("/tenants", requireSuperAdmin, async (_req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    const tenantIds = tenants.map((t) => t._id);

    const sessionsAgg = await UserSession.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: "$tenantId", totalSessions: { $sum: 1 }, onlineSessions: { $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] } } } }
    ]);
    const messagesAgg = await Message.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: "$tenantId", totalMessages: { $sum: 1 } } }
    ]);
    const communicatedUsersAgg = await Message.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: { tenantId: "$tenantId", sessionId: "$sessionId" } } },
      { $group: { _id: "$_id.tenantId", communicatedUsers: { $sum: 1 } } }
    ]);

    const sessionsMap = new Map(sessionsAgg.map((i) => [String(i._id), i]));
    const messagesMap = new Map(messagesAgg.map((i) => [String(i._id), i]));
    const communicatedUsersMap = new Map(communicatedUsersAgg.map((i) => [String(i._id), i.communicatedUsers]));
    const adminMsgAgg = await TenantAdminMessage.aggregate([
      { $match: { tenantId: { $in: tenantIds }, read: false } },
      { $group: { _id: "$tenantId", unreadAdminMessages: { $sum: 1 } } }
    ]);
    const adminMsgMap = new Map(adminMsgAgg.map((i) => [String(i._id), i.unreadAdminMessages]));

    const data = tenants.map((t) => {
      const sid = sessionsMap.get(String(t._id));
      const mid = messagesMap.get(String(t._id));
      return {
        id: String(t._id),
        name: t.name,
        slug: t.slug,
        widgetKey: t.widgetKey,
        adminEmail: t.adminEmail,
        subscriptionPlan: t.subscriptionPlan,
        subscriptionStatus: t.subscriptionStatus,
        trialEndsAt: t.trialEndsAt,
        isActive: t.isActive,
        createdAt: t.createdAt,
        usage: {
          totalSessions: sid?.totalSessions || 0,
          onlineSessions: sid?.onlineSessions || 0,
          totalMessages: mid?.totalMessages || 0,
          communicatedUsers: communicatedUsersMap.get(String(t._id)) || 0
        },
        unreadAdminMessages: adminMsgMap.get(String(t._id)) || 0
      };
    });

    const totals = data.reduce(
      (acc, item) => {
        acc.tenants += 1;
        acc.sessions += item.usage.totalSessions;
        acc.messages += item.usage.totalMessages;
        acc.online += item.usage.onlineSessions;
        acc.communicatedUsers += item.usage.communicatedUsers;
        return acc;
      },
      { tenants: 0, sessions: 0, messages: 0, online: 0, communicatedUsers: 0 }
    );

    return res.json({ totals, tenants: data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch tenant analytics" });
  }
});

router.patch("/tenants/:tenantId/subscription", requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  const { subscriptionPlan, subscriptionStatus, isActive } = req.body ?? {};
  if (!mongoose.Types.ObjectId.isValid(tenantId)) return res.status(400).json({ error: "Invalid tenantId" });

  try {
    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {
        ...(subscriptionPlan ? { subscriptionPlan } : {}),
        ...(subscriptionStatus ? { subscriptionStatus } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {})
      },
      { new: true }
    ).lean();
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    return res.json({ tenant });
  } catch {
    return res.status(500).json({ error: "Failed to update tenant subscription" });
  }
});

router.patch("/tenants/:tenantId/block", requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tenantId)) return res.status(400).json({ error: "Invalid tenantId" });
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { isActive: false, subscriptionStatus: "paused" },
      { new: true }
    ).lean();
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    return res.json({ tenant });
  } catch {
    return res.status(500).json({ error: "Failed to block tenant" });
  }
});

router.patch("/tenants/:tenantId/unblock", requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tenantId)) return res.status(400).json({ error: "Invalid tenantId" });
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { isActive: true, subscriptionStatus: "active" },
      { new: true }
    ).lean();
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    return res.json({ tenant });
  } catch {
    return res.status(500).json({ error: "Failed to unblock tenant" });
  }
});

router.delete("/tenants/:tenantId", requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tenantId)) return res.status(400).json({ error: "Invalid tenantId" });
  try {
    await Promise.all([
      Message.deleteMany({ tenantId }),
      UserSession.deleteMany({ tenantId }),
      TenantAdminMessage.deleteMany({ tenantId })
    ]);
    const deleted = await Tenant.findByIdAndDelete(tenantId).lean();
    if (!deleted) return res.status(404).json({ error: "Tenant not found" });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete tenant" });
  }
});

router.post("/tenants/:tenantId/message", requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  const { subject = "", message = "" } = req.body ?? {};
  if (!mongoose.Types.ObjectId.isValid(tenantId)) return res.status(400).json({ error: "Invalid tenantId" });
  if (!subject.trim() || !message.trim()) return res.status(400).json({ error: "Subject and message are required" });
  try {
    const tenant = await Tenant.findById(tenantId).select("_id");
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    const created = await TenantAdminMessage.create({
      tenantId,
      subject: subject.trim(),
      message: message.trim()
    });
    return res.status(201).json({ message: created });
  } catch {
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
