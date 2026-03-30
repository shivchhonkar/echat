import jwt from "jsonwebtoken";

export function createAdminToken() {
  return jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function verifySocketAdminToken(token) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.role === "admin";
  } catch {
    return false;
  }
}
