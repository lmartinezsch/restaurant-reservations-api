import express, { Express, Router } from "express";
import { AvailabilityController } from "./AvailabilityController";
import { ReservationController } from "./ReservationController";
import { errorHandler } from "./errorHandler";

export function createApp(
  availabilityController: AvailabilityController,
  reservationController: ReservationController
): Express {
  const app = express();

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

  app.use(router);

  app.use(errorHandler);

  return app;
}
