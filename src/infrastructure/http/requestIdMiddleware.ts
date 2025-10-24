import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();

  (req as any).requestId = requestId;

  res.setHeader("X-Request-Id", requestId);

  next();
}
