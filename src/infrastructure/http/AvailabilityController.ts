import { Request, Response, NextFunction } from "express";
import { CheckAvailabilityUseCase } from "../../application/usecases/CheckAvailabilityUseCase";
import { ValidationError } from "../../domain/errors";

export class AvailabilityController {
  constructor(private checkAvailabilityUseCase: CheckAvailabilityUseCase) {}

  async getAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { restaurantId, sectorId, date, partySize } = req.query;

      if (!restaurantId || !sectorId || !date || !partySize) {
        throw new ValidationError(
          "Missing required query parameters: restaurantId, sectorId, date, partySize"
        );
      }

      const partySizeNum = parseInt(partySize as string, 10);
      if (isNaN(partySizeNum) || partySizeNum < 1) {
        throw new ValidationError("partySize must be a positive integer");
      }

      const result = await this.checkAvailabilityUseCase.execute({
        restaurantId: restaurantId as string,
        sectorId: sectorId as string,
        date: date as string,
        partySize: partySizeNum,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
