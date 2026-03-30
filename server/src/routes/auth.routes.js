import { Router } from "express";
import { createAdminToken } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  return res.json({ token: createAdminToken() });
});

export default router;
