import { Router } from "express";
import { createAdminToken } from "../middleware/auth.js";
import { Tenant } from "../models/Tenant.js";

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

export default router;
