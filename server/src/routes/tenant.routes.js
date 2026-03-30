import { Router } from "express";
import { Tenant } from "../models/Tenant.js";

const router = Router();

function toSlug(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.post("/signup", async (req, res) => {
  try {
    const {
      businessName,
      slug,
      adminEmail,
      adminPassword
    } = req.body ?? {};

    if (!businessName?.trim() || !adminEmail?.trim() || !adminPassword?.trim()) {
      return res.status(400).json({ error: "businessName, adminEmail, adminPassword are required" });
    }

    const normalizedSlug = toSlug(slug || businessName);
    if (!normalizedSlug) return res.status(400).json({ error: "Invalid slug" });

    const existing = await Tenant.findOne({
      $or: [{ slug: normalizedSlug }, { adminEmail: String(adminEmail).toLowerCase() }]
    });
    if (existing) return res.status(409).json({ error: "Tenant slug or admin email already exists" });

    const widgetKey = `${normalizedSlug}-${Math.random().toString(36).slice(2, 8)}`;
    const tenant = await Tenant.create({
      name: businessName.trim(),
      slug: normalizedSlug,
      widgetKey,
      adminEmail: String(adminEmail).toLowerCase().trim(),
      adminPassword: String(adminPassword).trim(),
      subscriptionPlan: "free",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      maxAgents: 1,
      isActive: true
    });

    return res.status(201).json({
      tenant: {
        id: String(tenant._id),
        name: tenant.name,
        slug: tenant.slug,
        widgetKey: tenant.widgetKey,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt
      }
    });
  } catch {
    return res.status(500).json({ error: "Failed to signup tenant" });
  }
});

export default router;
