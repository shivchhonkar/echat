import { Tenant } from "./models/Tenant.js";

export async function ensureDefaultTenant() {
  const slug = (process.env.DEFAULT_TENANT_SLUG || "default").toLowerCase();
  const existing = await Tenant.findOne({ slug });
  if (existing) return existing;

  const tenant = await Tenant.create({
    name: process.env.DEFAULT_TENANT_NAME || "Default Business",
    slug,
    widgetKey: process.env.DEFAULT_TENANT_WIDGET_KEY || "default-key",
    adminEmail: (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
    subscriptionPlan: "free",
    subscriptionStatus: "active",
    maxAgents: 1,
    isActive: true
  });

  console.log(`[TENANT] created default tenant: ${tenant.slug}`);
  return tenant;
}
