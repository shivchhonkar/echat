import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSession",
      required: true,
      index: true
    },
    sender: { type: String, enum: ["user", "admin"], required: true },
    message: { type: String, required: true, trim: true },
    readByAdmin: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

export const Message = mongoose.model("Message", MessageSchema);
