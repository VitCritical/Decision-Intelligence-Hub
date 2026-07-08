import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Global error handler for Express.
 *
 * Catches any unhandled error thrown or passed via `next(err)` in route
 * handlers.  Returns a structured JSON error response and logs the error
 * with pino so it appears in the server output.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Determine status code
  const status =
    err instanceof HttpError ? err.statusCode : 500;

  // Build a safe message for the client
  const message =
    err instanceof Error ? err.message : "Internal server error";

  // Log the full error server-side (stack trace included for 5xx)
  if (status >= 500) {
    logger.error({ err }, "Unhandled server error");
  } else {
    logger.warn({ err, status }, "Client error");
  }

  res.status(status).json({
    error: message,
    statusCode: status,
  });
}

/**
 * Lightweight HTTP error class that carries a status code.
 *
 * Usage in routes:
 *   throw new HttpError(404, "Insight not found");
 */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Wraps an async route handler so that rejected promises are automatically
 * forwarded to Express's error handler via `next(err)`.
 *
 * Usage:
 *   router.get("/foo", asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
