import { Request, Response, NextFunction } from "express";
import { CreateReservationUseCase } from "../../application/usecases/CreateReservationUseCase";
import { CancelReservationUseCase } from "../../application/usecases/CancelReservationUseCase";
import { ListReservationsUseCase } from "../../application/usecases/ListReservationsUseCase";
import { ValidationError } from "../../domain/errors";
import {
  CreateReservationSchema,
  ListReservationsQuerySchema,
} from "./schemas";
import { logger } from "../logging/logger";

export class ReservationController {
  constructor(
    private createReservationUseCase: CreateReservationUseCase,
    private cancelReservationUseCase: CancelReservationUseCase,
    private listReservationsUseCase: ListReservationsUseCase
  ) {}

  async createReservation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req as any).requestId;
      const idempotencyKey = req.headers["idempotency-key"] as string;

      if (!idempotencyKey) {
        throw new ValidationError("Idempotency-Key header is required");
      }

      const validationResult = CreateReservationSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        throw new ValidationError(errors);
      }

      const {
        restaurantId,
        sectorId,
        partySize,
        startDateTimeISO,
        customer,
        notes,
      } = validationResult.data;

      logger.info(
        {
          requestId,
          idempotencyKey,
          restaurantId,
          sectorId,
          partySize,
          startDateTimeISO,
        },
        "Creating reservation"
      );

      const reservation = await this.createReservationUseCase.execute({
        restaurantId,
        sectorId,
        partySize,
        startDateTimeISO,
        customer,
        notes,
        idempotencyKey,
      });

      logger.info(
        {
          requestId,
          reservationId: reservation.id,
          tableIds: reservation.tableIds,
        },
        "Reservation created successfully"
      );

      const response = {
        id: reservation.id,
        restaurantId: reservation.restaurantId,
        sectorId: reservation.sectorId,
        tableIds: reservation.tableIds,
        partySize: reservation.partySize,
        start: reservation.startDateTimeISO,
        end: reservation.endDateTimeISO,
        status: reservation.status,
        customer: reservation.customer,
        notes: reservation.notes,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async cancelReservation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req as any).requestId;
      const { id } = req.params;

      logger.info({ requestId, reservationId: id }, "Cancelling reservation");

      await this.cancelReservationUseCase.execute(id);

      logger.info(
        { requestId, reservationId: id },
        "Reservation cancelled successfully"
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async listReservations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req as any).requestId;

      const validationResult = ListReservationsQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { restaurantId, date, sectorId } = validationResult.data;

      logger.info(
        { requestId, restaurantId, date, sectorId },
        "Listing reservations"
      );

      const result = await this.listReservationsUseCase.execute({
        restaurantId,
        date,
        sectorId,
      });

      logger.info(
        { requestId, count: result.items.length },
        "Reservations listed successfully"
      );

      const response = {
        date: result.date,
        items: result.items.map((reservation) => ({
          id: reservation.id,
          sectorId: reservation.sectorId,
          tableIds: reservation.tableIds,
          partySize: reservation.partySize,
          start: reservation.startDateTimeISO,
          end: reservation.endDateTimeISO,
          status: reservation.status,
          customer: reservation.customer,
          notes: reservation.notes,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
