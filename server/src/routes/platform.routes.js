import { Router } from "express";
import crypto from "crypto";
import { Tenant } from "../models/Tenant.js";
import { UserSession } from "../models/UserSession.js";
import { Message } from "../models/Message.js";
import { createSuperAdminToken, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

router.post("/super-admin/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const superEmail = (process.env.SUPER_ADMIN_EMAIL || "owner@example.com").toLowerCase();
  const superPassword = process.env.SUPER_ADMIN_PASSWORD || "owner123";
  if (String(email).toLowerCase() !== superEmail || password !== superPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  return res.json({ token: createSuperAdminToken({ email: superEmail }) });
});

router.post("/tenants/signup", async (req, res) => {
  try {
    const { businessName, adminEmail, adminPassword, plan = "free" } = req.body ?? {};
    if (!businessName?.trim() || !adminEmail?.trim() || !adminPassword?.trim()) {
      return res.status(400).json({ error: "businessName, adminEmail, adminPassword are required" });
    }
    const baseSlug = slugify(businessName);
    if (!baseSlug) return res.status(400).json({ error: "Invalid businessName" });
    const count = await Tenant.countDocuments({ slug: new RegExp(`^${baseSlug}(-\\d+)?$`) });
    const slug = count > 0 ? `${baseSlug}-${count + 1}` : baseSlug;
    const widgetKey = `wk_${crypto.randomBytes(8).toString("hex")}`;

    const tenant = await Tenant.create({
      name: businessName.trim(),
      slug,
      widgetKey,
      adminEmail: String(adminEmail).toLowerCase().trim(),
      adminPassword: String(adminPassword),
      subscriptionPlan: ["free", "starter", "pro"].includes(plan) ? plan : "free",
      subscriptionStatus: "active"
    });

    return res.status(201).json({
      tenant: {
        id: String(tenant._id),
        name: tenant.name,
        slug: tenant.slug,
        widgetKey: tenant.widgetKey,
        subscriptionPlan: tenant.subscriptionPlan
      }
    });
  } catch (error) {
    if (String(error?.message || "").includes("duplicate key")) {
      return res.status(409).json({ error: "Tenant already exists for this slug/email" });
    }
    return res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.get("/platform/tenants", requireSuperAdmin, async (_req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    const usage = await Promise.all(
      tenants.map(async (t) => {
        const [totalSessions, activeSessions, totalMessages] = await Promise.all([
          UserSession.countDocuments({ tenantId: t._id }),
          UserSession.countDocuments({ tenantId: t._id, status: "online" }),
          Message.countDocuments({ tenantId: t._id })
        ]);
        return {
          id: String(t._id),
          name: t.name,
          slug: t.slug,
          widgetKey: t.widgetKey,
          adminEmail: t.adminEmail,
          plan: t.subscriptionPlan,
          status: t.subscriptionStatus,
          createdAt: t.createdAt,
          usage: { totalSessions, activeSessions, totalMessages }
        };
      })
    );
    res.json(usage);
  } catch {
    res.status(500).json({ error: "Failed to fetch tenant usage" });
  }
});

export default router;
