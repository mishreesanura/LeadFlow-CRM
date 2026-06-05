import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5001),
  MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/lead_management_crm"),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300)
});

export const env = envSchema.parse(process.env);
