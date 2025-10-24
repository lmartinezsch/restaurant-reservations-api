import { Request, Response, NextFunction } from "express";
import {
  DomainError,
  NotFoundError,
  NoCapacityError,
  OutsideServiceWindowError,
  ValidationError,
  RateLimitError,
} from "../../domain/errors";
import { logger } from "../logging/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as any).requestId;

  logger.error(
    {
      err,
      requestId,
      method: req.method,
      path: req.path,
      errorType: err.constructor.name,
    },
    "Request failed"
  );

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: "validation_error",
      detail: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: "not_found",
      detail: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof NoCapacityError) {
    res.status(409).json({
      error: "no_capacity",
      detail: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof OutsideServiceWindowError) {
    res.status(422).json({
      error: "outside_service_window",
      detail: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof RateLimitError) {
    res.status(429).json({
      error: "rate_limit_exceeded",
      detail: err.message,
      requestId,
    });
    return;
  }

  // Catch-all for unexpected errors (5xx)
  res.status(500).json({
    error: "internal_server_error",
    detail:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
    requestId,
  });
}
