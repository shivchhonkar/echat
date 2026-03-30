import mongoose from "mongoose";

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is missing");

  try {
    await mongoose.connect(mongoUri);
    console.log("[DB] Mongo connected");
  } catch (error) {
    const message = String(error?.message || "");
    const canFallback = mongoUri.includes("mongodb://mongodb:27017");

    if (canFallback && message.includes("ENOTFOUND mongodb")) {
      const fallbackUri = mongoUri.replace("mongodb://mongodb:27017", "mongodb://127.0.0.1:27017");
      console.warn("[DB] mongodb host not found. Retrying with localhost for local development...");
      await mongoose.connect(fallbackUri);
      console.log("[DB] Mongo connected (localhost fallback)");
      return;
    }

    throw error;
  }
}
