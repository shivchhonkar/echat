import { Router } from "express";
import { createAdminToken } from "../middleware/auth.js";
import { Tenant } from "../models/Tenant.js";
import { TenantAdminMessage } from "../models/TenantAdminMessage.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password, tenantSlug = "default" } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const tenant = await Tenant.findOne({ slug: String(tenantSlug).toLowerCase(), isActive: true });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    if (tenant.adminEmail !== String(email).toLowerCase() || tenant.adminPassword !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = createAdminToken({
      tenantId: String(tenant._id),
      tenantSlug: tenant.slug,
      email: tenant.adminEmail
    });
    return res.json({
      token,
      tenant: { id: String(tenant._id), slug: tenant.slug, name: tenant.name, widgetKey: tenant.widgetKey }
    });
  } catch {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/messages", requireAdmin, async (req, res) => {
  try {
    const tenantId = req.admin.tenantId;
    const messages = await TenantAdminMessage.find({ tenantId }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json(messages);
  } catch {
    return res.status(500).json({ error: "Failed to fetch admin messages" });
  }
});

router.patch("/messages/:messageId/read", requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const tenantId = req.admin.tenantId;
    const updated = await TenantAdminMessage.findOneAndUpdate(
      { _id: messageId, tenantId },
      { read: true },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Message not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update message" });
  }
});

export default router;
