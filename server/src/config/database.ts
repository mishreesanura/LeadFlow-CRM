import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.MONGO_URI).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

export async function disconnectDatabase() {
  connectionPromise = null;
  await mongoose.disconnect();
}
