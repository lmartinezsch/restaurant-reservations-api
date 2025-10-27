import { PrismaClient } from "@prisma/client";
import { createApp } from "./infrastructure/http/app";
import { AvailabilityController } from "./infrastructure/http/AvailabilityController";
import { ReservationController } from "./infrastructure/http/ReservationController";
import { RestaurantController } from "./infrastructure/http/RestaurantController";

import { PrismaRestaurantRepository } from "./infrastructure/repositories/PrismaRestaurantRepository";
import { PrismaSectorRepository } from "./infrastructure/repositories/PrismaSectorRepository";
import { PrismaTableRepository } from "./infrastructure/repositories/PrismaTableRepository";
import { PrismaReservationRepository } from "./infrastructure/repositories/PrismaReservationRepository";
import { PrismaIdempotencyKeyRepository } from "./infrastructure/repositories/PrismaIdempotencyKeyRepository";
import { PrismaLockRepository } from "./infrastructure/repositories/PrismaLockRepository";

import { CheckAvailabilityUseCase } from "./application/usecases/CheckAvailabilityUseCase";
import { CreateReservationUseCase } from "./application/usecases/CreateReservationUseCase";
import { CancelReservationUseCase } from "./application/usecases/CancelReservationUseCase";
import { ListReservationsUseCase } from "./application/usecases/ListReservationsUseCase";

import { seedData } from "./infrastructure/database/seedData";
import { logger } from "./infrastructure/logging/logger";
import { Express } from "express";

const PORT = process.env.PORT || 3000;

// Singleton instances for serverless environments (Vercel)
let appInstance: Express | null = null;
let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
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

  // Seed data if database is empty
  const existingRestaurants = await restaurantRepo.findAll();
  if (existingRestaurants.length === 0) {
    logger.info("Seeding database with initial data...");
    await seedData(restaurantRepo, sectorRepo, tableRepo);
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

// For Vercel serverless
export default async function handler(req: any, res: any) {
  // Set CORS headers explicitly for Vercel
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "http://localhost:3000",
    "https://restaurant-reservations-front.vercel.app",
  ];

  // Allow all vercel.app domains
  if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Idempotency-Key, Authorization"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const app = await initializeApp();
  return app(req, res);
}

// For local development (only start server if not in serverless environment)
if (process.env.VERCEL !== "1" && require.main === module) {
  initializeApp()
    .then((app) => {
      app.listen(PORT, () => {
        logger.info({ port: PORT }, "🚀 API server running");
        logger.info("📍 Available endpoints:");
        logger.info("   GET  /availability");
        logger.info("   POST /reservations");
        logger.info("   DELETE /reservations/:id");
        logger.info("   GET  /reservations/day");
        logger.info("   GET  /restaurants");
        logger.info("   GET  /restaurants/:id/sectors");
      });
    })
    .catch((error) => {
      logger.error({ err: error }, "❌ Failed to start server");
      process.exit(1);
    });
}
