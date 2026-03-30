import { Router } from "express";
import mongoose from "mongoose";
import { createSuperAdminToken, requireSuperAdmin } from "../middleware/auth.js";
import { Tenant } from "../models/Tenant.js";
import { UserSession } from "../models/UserSession.js";
import { Message } from "../models/Message.js";

const router = Router();

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

    const sessionsMap = new Map(sessionsAgg.map((i) => [String(i._id), i]));
    const messagesMap = new Map(messagesAgg.map((i) => [String(i._id), i]));

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
        usage: {
          totalSessions: sid?.totalSessions || 0,
          onlineSessions: sid?.onlineSessions || 0,
          totalMessages: mid?.totalMessages || 0
        }
      };
    });

    const totals = data.reduce(
      (acc, item) => {
        acc.tenants += 1;
        acc.sessions += item.usage.totalSessions;
        acc.messages += item.usage.totalMessages;
        acc.online += item.usage.onlineSessions;
        return acc;
      },
      { tenants: 0, sessions: 0, messages: 0, online: 0 }
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

export default router;
