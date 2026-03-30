import { Router } from "express";
import mongoose from "mongoose";
import { UserSession } from "../models/UserSession.js";
import { Message } from "../models/Message.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/start-session", async (req, res) => {
  try {
    const { name, email = "", pageUrl = "" } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const session = await UserSession.create({
      name: name.trim(),
      email: email.trim(),
      pageUrl: pageUrl.trim(),
      status: "online"
    });

    return res.status(201).json({ sessionId: session._id, session });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/admin-status", (_req, res) => {
  const io = _req.app.get("io");
  const online = (io?.adminSockets?.size ?? 0) > 0;
  res.json({ online });
});

router.get("/sessions", requireAdmin, async (_req, res) => {
  try {
    const sessions = await UserSession.find().sort({ createdAt: -1 }).lean();
    const unreadAgg = await Message.aggregate([
      { $match: { sender: "user", readByAdmin: false } },
      { $group: { _id: "$sessionId", count: { $sum: 1 } } }
    ]);
    const unreadMap = new Map(unreadAgg.map((item) => [String(item._id), item.count]));
    const withUnread = sessions.map((s) => ({
      ...s,
      unreadCount: unreadMap.get(String(s._id)) ?? 0
    }));
    res.json(withUnread);
  } catch {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.get("/messages/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ error: "Invalid sessionId" });
    const messages = await Message.find({ sessionId }).sort({ timestamp: 1 }).lean();
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
