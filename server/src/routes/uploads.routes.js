import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { UserSession } from "../models/UserSession.js";
import { Tenant } from "../models/Tenant.js";
import { getAdminPayloadFromToken } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, "../../uploads");
const tempDir = path.join(uploadRoot, "temp");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|msi|dll|scr|vbs|ps1)$/i;

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename(_req, file, cb) {
    const safe = String(file.originalname || "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    cb(null, `${crypto.randomUUID()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (BLOCKED_EXT.test(file.originalname || "")) {
      cb(new Error("File type not allowed"));
      return;
    }
    cb(null, true);
  }
});

const router = Router();

router.post("/uploads", upload.single("file"), async (req, res) => {
  try {
    const { sessionId, tenantKey = "" } = req.body ?? {};
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      fs.unlink(file.path, () => null);
      return res.status(400).json({ error: "Valid sessionId is required" });
    }

    let tenantId = null;
    const token = req.headers.authorization?.replace("Bearer ", "");
    const admin = getAdminPayloadFromToken(token);
    if (admin?.tenantId) {
      tenantId = String(admin.tenantId);
    } else if (tenantKey.trim()) {
      const tenant = await Tenant.findOne({ widgetKey: tenantKey.trim(), isActive: true }).select("_id");
      if (!tenant) {
        fs.unlink(file.path, () => null);
        return res.status(404).json({ error: "Tenant not found" });
      }
      tenantId = String(tenant._id);
    } else {
      fs.unlink(file.path, () => null);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await UserSession.findOne({ _id: sessionId, tenantId }).select("_id");
    if (!session) {
      fs.unlink(file.path, () => null);
      return res.status(404).json({ error: "Session not found" });
    }

    const destDir = path.join(uploadRoot, tenantId, String(sessionId));
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, destPath);

    const url = `/uploads/${tenantId}/${sessionId}/${file.filename}`;
    const mimeType = file.mimetype || "application/octet-stream";
    const messageType = mimeType.startsWith("image/") ? "image" : "file";

    return res.status(201).json({
      url,
      filename: file.originalname,
      mimeType,
      size: file.size,
      messageType
    });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => null);
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File exceeds 10 MB limit" });
    }
    return res.status(500).json({ error: error.message || "Upload failed" });
  }
});

export default router;
