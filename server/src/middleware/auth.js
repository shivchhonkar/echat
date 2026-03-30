import jwt from "jsonwebtoken";

export function createAdminToken({ tenantId, tenantSlug, email }) {
  return jwt.sign({ role: "admin", tenantId, tenantSlug, email }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

export function createSuperAdminToken({ email }) {
  return jwt.sign({ role: "super_admin", email }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const payload = getAdminPayloadFromToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid token" });
  req.admin = payload;
  next();
}

export function verifySocketAdminToken(token) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.role === "admin" ? payload : false;
  } catch {
    return false;
  }
}

export function getAdminPayloadFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireSuperAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
    req.superAdmin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
