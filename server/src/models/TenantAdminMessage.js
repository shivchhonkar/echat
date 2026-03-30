import mongoose from "mongoose";

const TenantAdminMessageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    from: { type: String, default: "super_admin" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const TenantAdminMessage = mongoose.model("TenantAdminMessage", TenantAdminMessageSchema);
