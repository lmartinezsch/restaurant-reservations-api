import { Request, Response, NextFunction } from "express";
import { CreateReservationUseCase } from "../../application/usecases/CreateReservationUseCase";
import { CancelReservationUseCase } from "../../application/usecases/CancelReservationUseCase";
import { ListReservationsUseCase } from "../../application/usecases/ListReservationsUseCase";
import { ValidationError } from "../../domain/errors";

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
      const idempotencyKey = req.headers["idempotency-key"] as string;

      if (!idempotencyKey) {
        throw new ValidationError("Idempotency-Key header is required");
      }

      const {
        restaurantId,
        sectorId,
        partySize,
        startDateTimeISO,
        customer,
        notes,
      } = req.body;

      if (
        !restaurantId ||
        !sectorId ||
        !partySize ||
        !startDateTimeISO ||
        !customer
      ) {
        throw new ValidationError(
          "Missing required fields: restaurantId, sectorId, partySize, startDateTimeISO, customer"
        );
      }

      if (!customer.name || !customer.phone || !customer.email) {
        throw new ValidationError("Customer must have name, phone, and email");
      }

      const reservation = await this.createReservationUseCase.execute({
        restaurantId,
        sectorId,
        partySize,
        startDateTimeISO,
        customer,
        notes,
        idempotencyKey,
      });

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
      const { id } = req.params;

      await this.cancelReservationUseCase.execute(id);

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
      const { restaurantId, date, sectorId } = req.query;

      if (!restaurantId || !date) {
        throw new ValidationError(
          "Missing required query parameters: restaurantId, date"
        );
      }

      const result = await this.listReservationsUseCase.execute({
        restaurantId: restaurantId as string,
        date: date as string,
        sectorId: sectorId as string | undefined,
      });

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
