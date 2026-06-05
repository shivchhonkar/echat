import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSession",
      required: true,
      index: true
    },
    sender: { type: String, enum: ["user", "admin"], required: true },
    messageType: { type: String, enum: ["text", "file", "image", "call"], default: "text" },
    message: { type: String, default: "", trim: true },
    callLog: {
      status: { type: String, enum: ["completed", "missed", "declined", "cancelled"], default: "completed" },
      durationSeconds: { type: Number, default: 0 },
      initiatedBy: { type: String, enum: ["user", "admin"], default: "user" },
      startedAt: { type: Date, default: null },
      answeredAt: { type: Date, default: null },
      endedAt: { type: Date, default: null }
    },
    attachment: {
      url: { type: String, default: "" },
      filename: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 }
    },
    readByAdmin: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

export const Message = mongoose.model("Message", MessageSchema);
