import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/infrastructure/http/app";
import { AvailabilityController } from "../src/infrastructure/http/AvailabilityController";
import { ReservationController } from "../src/infrastructure/http/ReservationController";
import { RestaurantController } from "../src/infrastructure/http/RestaurantController";
import { PrismaRestaurantRepository } from "../src/infrastructure/repositories/PrismaRestaurantRepository";
import { PrismaSectorRepository } from "../src/infrastructure/repositories/PrismaSectorRepository";
import { PrismaTableRepository } from "../src/infrastructure/repositories/PrismaTableRepository";
import { PrismaReservationRepository } from "../src/infrastructure/repositories/PrismaReservationRepository";
import { PrismaIdempotencyKeyRepository } from "../src/infrastructure/repositories/PrismaIdempotencyKeyRepository";
import { PrismaLockRepository } from "../src/infrastructure/repositories/PrismaLockRepository";
import { CheckAvailabilityUseCase } from "../src/application/usecases/CheckAvailabilityUseCase";
import { CreateReservationUseCase } from "../src/application/usecases/CreateReservationUseCase";
import { CancelReservationUseCase } from "../src/application/usecases/CancelReservationUseCase";
import { ListReservationsUseCase } from "../src/application/usecases/ListReservationsUseCase";
import { seedData } from "../src/infrastructure/database/seedData";
import { logger } from "../src/infrastructure/logging/logger";
import { Express } from "express";

let appInstance: Express | null = null;
let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: ["error"],
    });
  }
  return prismaInstance;
}

async function initializeApp(): Promise<Express> {
  if (appInstance) {
    return appInstance;
  }

  const prisma = getPrismaClient();

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const sectorRepo = new PrismaSectorRepository(prisma);
  const tableRepo = new PrismaTableRepository(prisma);
  const reservationRepo = new PrismaReservationRepository(prisma);
  const idempotencyRepo = new PrismaIdempotencyKeyRepository(prisma);
  const lockRepo = new PrismaLockRepository(prisma);

  try {
    const existingRestaurants = await restaurantRepo.findAll();
    if (existingRestaurants.length === 0) {
      logger.info("Seeding database with initial data...");
      await seedData(restaurantRepo, sectorRepo, tableRepo);
    }
  } catch (error) {
    logger.warn("Could not seed database");
  }

  const checkAvailabilityUseCase = new CheckAvailabilityUseCase(
    restaurantRepo,
    sectorRepo,
    tableRepo,
    reservationRepo
  );

  const createReservationUseCase = new CreateReservationUseCase(
    restaurantRepo,
    sectorRepo,
    tableRepo,
    reservationRepo,
    idempotencyRepo,
    lockRepo
  );

  const cancelReservationUseCase = new CancelReservationUseCase(
    reservationRepo
  );

  const listReservationsUseCase = new ListReservationsUseCase(
    reservationRepo,
    restaurantRepo
  );

  const availabilityController = new AvailabilityController(
    checkAvailabilityUseCase
  );

  const reservationController = new ReservationController(
    createReservationUseCase,
    cancelReservationUseCase,
    listReservationsUseCase
  );

  const restaurantController = new RestaurantController(
    restaurantRepo,
    sectorRepo
  );

  appInstance = createApp(
    availabilityController,
    reservationController,
    restaurantController
  );

  return appInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await initializeApp();
    app(req as any, res as any);
  } catch (error) {
    logger.error({ err: error }, "Error handling request");
    res.status(500).json({ error: "Internal server error" });
  }
}
