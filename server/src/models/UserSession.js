import mongoose from "mongoose";

const UserSessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    socketId: { type: String, default: "" },
    status: { type: String, enum: ["online", "offline"], default: "online" },
    pageUrl: { type: String, default: "" },
    lastSeenAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UserSession = mongoose.model("UserSession", UserSessionSchema);
