import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { leadRouter } from "./routes/lead.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/leads", leadRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
