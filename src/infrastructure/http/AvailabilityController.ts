import { Request, Response, NextFunction } from "express";
import { CheckAvailabilityUseCase } from "../../application/usecases/CheckAvailabilityUseCase";
import { ValidationError } from "../../domain/errors";
import { CheckAvailabilityQuerySchema } from "./schemas";
import { logger } from "../logging/logger";

export class AvailabilityController {
  constructor(private checkAvailabilityUseCase: CheckAvailabilityUseCase) {}

  async getAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req as any).requestId;

      const validationResult = CheckAvailabilityQuerySchema.safeParse(
        req.query
      );

      if (!validationResult.success) {
        const errors = validationResult.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        throw new ValidationError(errors);
      }

      const { restaurantId, sectorId, date, partySize } = validationResult.data;

      logger.info(
        { requestId, restaurantId, sectorId, date, partySize },
        "Checking availability"
      );

      const result = await this.checkAvailabilityUseCase.execute({
        restaurantId,
        sectorId,
        date,
        partySize,
      });

      logger.info(
        { requestId, slotsFound: result.slots.length },
        "Availability check completed"
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
