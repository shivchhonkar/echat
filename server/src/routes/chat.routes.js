import { Router } from "express";
import mongoose from "mongoose";
import { UserSession } from "../models/UserSession.js";
import { Message } from "../models/Message.js";
import { getAdminPayloadFromToken, requireAdmin } from "../middleware/auth.js";
import { Tenant } from "../models/Tenant.js";

const router = Router();

router.post("/start-session", async (req, res) => {
  try {
    const { name, email = "", phone = "", pageUrl = "", tenantKey } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    if (!tenantKey?.trim()) return res.status(400).json({ error: "tenantKey is required" });

    const tenant = await Tenant.findOne({ widgetKey: tenantKey.trim(), isActive: true });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const session = await UserSession.create({
      tenantId: tenant._id,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      pageUrl: pageUrl.trim(),
      status: "online"
    });

    return res.status(201).json({ sessionId: session._id, session });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/admin-status", async (req, res) => {
  const { tenantKey = "" } = req.query;
  if (!tenantKey) return res.json({ online: false });
  const tenant = await Tenant.findOne({ widgetKey: String(tenantKey), isActive: true }).select("_id");
  if (!tenant) return res.json({ online: false });
  const io = req.app.get("io");
  const online = (io?.adminSocketsByTenant?.get(String(tenant._id))?.size ?? 0) > 0;
  res.json({ online });
});

router.get("/sessions", requireAdmin, async (req, res) => {
  try {
    const tenantId = req.admin.tenantId;
    const sessions = await UserSession.find({ tenantId }).sort({ createdAt: -1 }).lean();
    const unreadAgg = await Message.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), sender: "user", readByAdmin: false } },
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
    const token = req.headers.authorization?.replace("Bearer ", "");
    let tenantId = getAdminPayloadFromToken(token)?.tenantId || null;

    if (!tenantId) {
      const { tenantKey = "" } = req.query;
      if (!tenantKey) return res.status(401).json({ error: "Unauthorized" });
      const tenant = await Tenant.findOne({ widgetKey: String(tenantKey), isActive: true }).select("_id");
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      tenantId = String(tenant._id);
    }

    const messages = await Message.find({ sessionId, tenantId }).sort({ timestamp: 1 }).lean();
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
