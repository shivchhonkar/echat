import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    widgetKey: { type: String, required: true, unique: true, trim: true },
    adminEmail: { type: String, required: true, trim: true, lowercase: true },
    adminPassword: { type: String, required: true },
    subscriptionPlan: { type: String, enum: ["free", "starter", "pro"], default: "free" },
    subscriptionStatus: { type: String, enum: ["active", "trial", "paused", "cancelled"], default: "active" },
    trialEndsAt: { type: Date, default: null },
    maxAgents: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Tenant = mongoose.model("Tenant", TenantSchema);
