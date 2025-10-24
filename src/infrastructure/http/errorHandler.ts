import { Request, Response, NextFunction } from "express";
import {
  DomainError,
  NotFoundError,
  NoCapacityError,
  OutsideServiceWindowError,
  ValidationError,
} from "../../domain/errors";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("Error:", err);

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: "validation_error",
      detail: err.message,
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: "not_found",
      detail: err.message,
    });
    return;
  }

  if (err instanceof NoCapacityError) {
    res.status(409).json({
      error: "no_capacity",
      detail: err.message,
    });
    return;
  }

  if (err instanceof OutsideServiceWindowError) {
    res.status(422).json({
      error: "outside_service_window",
      detail: err.message,
    });
    return;
  }

  res.status(500).json({
    error: "internal_server_error",
    detail: "An unexpected error occurred",
  });
}
