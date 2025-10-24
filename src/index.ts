import { createApp } from "./infrastructure/http/app";
import { AvailabilityController } from "./infrastructure/http/AvailabilityController";
import { ReservationController } from "./infrastructure/http/ReservationController";

import { InMemoryRestaurantRepository } from "./infrastructure/repositories/InMemoryRestaurantRepository";
import { InMemorySectorRepository } from "./infrastructure/repositories/InMemorySectorRepository";
import { InMemoryTableRepository } from "./infrastructure/repositories/InMemoryTableRepository";
import { InMemoryReservationRepository } from "./infrastructure/repositories/InMemoryReservationRepository";
import { InMemoryIdempotencyKeyRepository } from "./infrastructure/repositories/InMemoryIdempotencyKeyRepository";
import { InMemoryLockRepository } from "./infrastructure/repositories/InMemoryLockRepository";

import { CheckAvailabilityUseCase } from "./application/usecases/CheckAvailabilityUseCase";
import { CreateReservationUseCase } from "./application/usecases/CreateReservationUseCase";
import { CancelReservationUseCase } from "./application/usecases/CancelReservationUseCase";
import { ListReservationsUseCase } from "./application/usecases/ListReservationsUseCase";

import { seedData } from "./infrastructure/database/seedData";
import { logger } from "./infrastructure/logging/logger";

const PORT = process.env.PORT || 3000;

async function bootstrap(): Promise<void> {
  const restaurantRepo = new InMemoryRestaurantRepository();
  const sectorRepo = new InMemorySectorRepository();
  const tableRepo = new InMemoryTableRepository();
  const reservationRepo = new InMemoryReservationRepository();
  const idempotencyRepo = new InMemoryIdempotencyKeyRepository();
  const lockRepo = new InMemoryLockRepository();

  await seedData(restaurantRepo, sectorRepo, tableRepo);

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

  const app = createApp(availabilityController, reservationController);

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "🚀 API server running");
    logger.info("📍 Available endpoints:");
    logger.info("   GET  /availability");
    logger.info("   POST /reservations");
    logger.info("   DELETE /reservations/:id");
    logger.info("   GET  /reservations/day");
  });
}

// Start the server
bootstrap().catch((error) => {
  logger.error({ err: error }, "❌ Failed to start server");
  process.exit(1);
});
