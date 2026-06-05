import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";

type MongoDuplicateError = Error & {
  code?: number;
  keyPattern?: Record<string, unknown>;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  const mongoError = error as MongoDuplicateError;
  if (mongoError.code === 11000) {
    res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "A lead with this unique field already exists.",
        details: mongoError.keyPattern
      }
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error(error);
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong.",
      details: env.NODE_ENV === "development" ? String(error) : undefined
    }
  });
};
