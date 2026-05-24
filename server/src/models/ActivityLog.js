import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      enum: ["super_admin", "tenant_admin", "system"],
      required: true,
      index: true
    },
    actorEmail: { type: String, default: "", trim: true, lowercase: true },
    action: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ["success", "failure"], default: "success" },
    details: { type: String, default: "", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "", trim: true },
    userAgent: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
