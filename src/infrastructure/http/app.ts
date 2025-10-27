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

  // CORS configuration
  const allowedOrigins = [
    "https://restaurant-reservations-front.vercel.app",
    "https://restaurant-reservations-api-git-main-lmartinezschs-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173", // Vite default
  ];

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));

  // Ensure OPTIONS requests are handled
  app.options("*", cors(corsOptions));

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
