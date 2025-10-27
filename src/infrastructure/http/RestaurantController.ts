import { Request, Response, NextFunction } from "express";
import {
  RestaurantRepository,
  SectorRepository,
} from "../../domain/ports/repositories";
import { NotFoundError } from "../../domain/errors";
import { logger } from "../logging/logger";

export class RestaurantController {
  constructor(
    private restaurantRepository: RestaurantRepository,
    private sectorRepository: SectorRepository
  ) {}

  async getAllRestaurants(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req as any).id;

      logger.info({ requestId }, "Fetching all restaurants");

      const restaurants = await this.restaurantRepository.findAll();

      logger.info(
        { requestId, count: restaurants.length },
        "Restaurants fetched successfully"
      );

      res.status(200).json(restaurants);
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantSectors(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req as any).id;
      const { id: restaurantId } = req.params;

      logger.info(
        { requestId, restaurantId },
        "Fetching sectors for restaurant"
      );

      // Verify restaurant exists
      const restaurant = await this.restaurantRepository.findById(restaurantId);
      if (!restaurant) {
        throw new NotFoundError("Restaurant", restaurantId);
      }

      const sectors = await this.sectorRepository.findByRestaurantId(
        restaurantId
      );

      logger.info(
        { requestId, restaurantId, count: sectors.length },
        "Sectors fetched successfully"
      );

      res.status(200).json(sectors);
    } catch (error) {
      next(error);
    }
  }
}
