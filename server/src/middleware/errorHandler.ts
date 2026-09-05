import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

/**
 * Converts every error into the response envelope:
 * { success: false, error: string, details?: unknown }
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // --- Our own typed errors ---
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // --- Zod validation errors: 400 with field map ---
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // --- Mongoose duplicate key (e.g. duplicate slug/email) ---
  if (err instanceof mongoose.Error && (err as { code?: number }).code === 11000) {
    const fields = Object.keys(
      (err as unknown as { keyValue?: Record<string, unknown> }).keyValue ?? {}
    );
    res.status(409).json({
      success: false,
      error: `Duplicate value for: ${fields.join(', ') || 'unique field'}`,
    });
    return;
  }

  // --- Mongoose cast/invalid ObjectId ---
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, error: `Invalid ${err.path}` });
    return;
  }

  // --- Unknown: log fully, respond generically (never leak internals) ---
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
