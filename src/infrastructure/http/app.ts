import express, { Express, Router } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { AvailabilityController } from "./AvailabilityController";
import { ReservationController } from "./ReservationController";
import { RestaurantController } from "./RestaurantController";
import { errorHandler } from "./errorHandler";
import { requestIdMiddleware } from "./requestIdMiddleware";
import { logger } from "../logging/logger";

export function createApp(
  availabilityController: AvailabilityController,
  reservationController: ReservationController,
  restaurantController: RestaurantController
): Express {
  const app = express();

  // CORS configuration - simplified for Vercel compatibility
  const allowedOrigins = [
    "http://localhost:3000", // Local development frontend
    "https://restaurant-reservations-front.vercel.app", // Production frontend (when deployed)
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Check if origin is allowed
        const isAllowed = allowedOrigins.some((allowedOrigin) => {
          return origin === allowedOrigin || origin.endsWith(".vercel.app");
        });

        // Always allow in serverless (don't reject, just allow)
        callback(null, isAllowed || origin.includes("vercel.app"));
      },
      credentials: true,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Idempotency-Key"],
    })
  );

  app.use(requestIdMiddleware);

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} completed`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} failed`;
      },
      customAttributeKeys: {
        req: "request",
        res: "response",
        err: "error",
        responseTime: "duration",
      },
    })
  );

  app.use(express.json());

  const router = Router();

  router.get("/availability", (req, res, next) =>
    availabilityController.getAvailability(req, res, next)
  );

  router.post("/reservations", (req, res, next) =>
    reservationController.createReservation(req, res, next)
  );

  router.delete("/reservations/:id", (req, res, next) =>
    reservationController.cancelReservation(req, res, next)
  );

  router.get("/reservations/day", (req, res, next) =>
    reservationController.listReservations(req, res, next)
  );

  router.get("/restaurants", (req, res, next) =>
    restaurantController.getAllRestaurants(req, res, next)
  );

  router.get("/restaurants/:id/sectors", (req, res, next) =>
    restaurantController.getRestaurantSectors(req, res, next)
  );

  app.use(router);

  app.use(errorHandler);

  return app;
}
