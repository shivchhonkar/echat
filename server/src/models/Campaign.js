import mongoose from "mongoose";

const CampaignRecipientSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    error: { type: String, default: "" },
    providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const CampaignSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: ["sms", "whatsapp"], default: "sms", index: true },
    smsType: { type: String, enum: ["transactional", "promotional"], default: "promotional" },
    sendMode: { type: String, enum: ["open", "template"], default: "open" },
    templateName: { type: String, default: "", trim: true },
    templateLanguage: { type: String, default: "en", trim: true },
    senderId: { type: String, default: "", trim: true },
    messagePreview: { type: String, default: "", trim: true },
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    recipients: { type: [CampaignRecipientSchema], default: [] },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["draft", "sending", "completed", "failed"],
      default: "draft",
      index: true,
    },
    createdBy: { type: String, default: "", trim: true, lowercase: true },
    provider: { type: String, default: "2factor", trim: true }, // 2factor | meta_whatsapp
  },
  { timestamps: true }
);

export const Campaign = mongoose.model("Campaign", CampaignSchema);
