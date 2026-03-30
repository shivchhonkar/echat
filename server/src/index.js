import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { registerSocket } from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(serverDir, "..");

// Load env from both server/.env and project-root/.env
dotenv.config({ path: path.join(serverDir, ".env") });
dotenv.config({ path: path.join(rootDir, ".env"), override: false });

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true
  }
});

app.set("io", io);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/admin", authRoutes);
app.use("/api", chatRoutes);

registerSocket(io);

const port = Number(process.env.PORT || 4000);
connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`[SERVER] running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("[SERVER] startup failed", error);
    process.exit(1);
  });
