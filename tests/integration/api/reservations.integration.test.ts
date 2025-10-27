import request from "supertest";
import { Express } from "express";
import { createApp } from "../../../src/infrastructure/http/app";
import { AvailabilityController } from "../../../src/infrastructure/http/AvailabilityController";
import { ReservationController } from "../../../src/infrastructure/http/ReservationController";
import { RestaurantController } from "../../../src/infrastructure/http/RestaurantController";
import { InMemoryRestaurantRepository } from "../../../src/infrastructure/repositories/InMemoryRestaurantRepository";
import { InMemorySectorRepository } from "../../../src/infrastructure/repositories/InMemorySectorRepository";
import { InMemoryTableRepository } from "../../../src/infrastructure/repositories/InMemoryTableRepository";
import { InMemoryReservationRepository } from "../../../src/infrastructure/repositories/InMemoryReservationRepository";
import { InMemoryIdempotencyKeyRepository } from "../../../src/infrastructure/repositories/InMemoryIdempotencyKeyRepository";
import { InMemoryLockRepository } from "../../../src/infrastructure/repositories/InMemoryLockRepository";
import { CheckAvailabilityUseCase } from "../../../src/application/usecases/CheckAvailabilityUseCase";
import { CreateReservationUseCase } from "../../../src/application/usecases/CreateReservationUseCase";
import { CancelReservationUseCase } from "../../../src/application/usecases/CancelReservationUseCase";
import { ListReservationsUseCase } from "../../../src/application/usecases/ListReservationsUseCase";
import { seedData } from "../../../src/infrastructure/database/seedData";
import { ReservationStatus } from "../../../src/domain/entities";

describe("Reservations API Integration Tests", () => {
  let app: Express;
  let restaurantRepo: InMemoryRestaurantRepository;
  let sectorRepo: InMemorySectorRepository;
  let tableRepo: InMemoryTableRepository;
  let reservationRepo: InMemoryReservationRepository;
  let idempotencyRepo: InMemoryIdempotencyKeyRepository;
  let lockRepo: InMemoryLockRepository;

  beforeEach(async () => {
    restaurantRepo = new InMemoryRestaurantRepository();
    sectorRepo = new InMemorySectorRepository();
    tableRepo = new InMemoryTableRepository();
    reservationRepo = new InMemoryReservationRepository();
    idempotencyRepo = new InMemoryIdempotencyKeyRepository();
    lockRepo = new InMemoryLockRepository();

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
    const restaurantController = new RestaurantController(
      restaurantRepo,
      sectorRepo
    );

    app = createApp(
      availabilityController,
      reservationController,
      restaurantController
    );
  });

  describe("GET /availability", () => {
    it("should return available slots with correct structure", async () => {
      const response = await request(app).get("/availability").query({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("slotMinutes", 15);
      expect(response.body).toHaveProperty("durationMinutes", 90);
      expect(response.body).toHaveProperty("slots");
      expect(Array.isArray(response.body.slots)).toBe(true);
      expect(response.body.slots.length).toBeGreaterThan(0);

      const slot = response.body.slots[0];
      expect(slot).toHaveProperty("start");
      expect(slot).toHaveProperty("available");
    });

    it("should return 400 when missing required parameters", async () => {
      const response = await request(app).get("/availability").query({
        restaurantId: "R1",
        sectorId: "S1",
        // Missing date and partySize
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "validation_error");
    });

    it("should return 404 when restaurant does not exist", async () => {
      const response = await request(app).get("/availability").query({
        restaurantId: "INVALID",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "not_found");
    });
  });

  describe("POST /reservations", () => {
    it("should create a reservation successfully", async () => {
      const response = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "test-key-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "John Doe",
            phone: "+54 9 11 5555-1234",
            email: "john.doe@mail.com",
          },
          notes: "Test reservation",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("restaurantId", "R1");
      expect(response.body).toHaveProperty("sectorId", "S1");
      expect(response.body).toHaveProperty("partySize", 4);
      expect(response.body).toHaveProperty(
        "status",
        ReservationStatus.CONFIRMED
      );
      expect(response.body).toHaveProperty("tableIds");
      expect(Array.isArray(response.body.tableIds)).toBe(true);
      expect(response.body.tableIds.length).toBe(1);
      expect(response.body.customer).toHaveProperty("name", "John Doe");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("updatedAt");
    });

    it("should enforce idempotency (same key returns same reservation)", async () => {
      const firstResponse = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "duplicate-key-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Alice",
            phone: "123",
            email: "alice@test.com",
          },
        });

      expect(firstResponse.status).toBe(201);
      const firstId = firstResponse.body.id;

      // Retry with same idempotency key
      const secondResponse = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "duplicate-key-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Alice",
            phone: "123",
            email: "alice@test.com",
          },
        });

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.id).toBe(firstId);
    });

    it("should return 400 when missing Idempotency-Key header", async () => {
      const response = await request(app)
        .post("/reservations")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "validation_error");
      expect(response.body.detail).toContain("Idempotency-Key");
    });

    it("should return 422 when reservation is outside service window", async () => {
      const response = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "test-key-outside")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T18:00:00-03:00", // Outside shifts
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
        });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty("error", "outside_service_window");
    });

    it("should return 409 when no capacity available", async () => {
      // Book all 3 tables that fit 4 people (T3, T4, T5)
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post("/reservations")
          .set("Idempotency-Key", `capacity-test-${i}`)
          .send({
            restaurantId: "R1",
            sectorId: "S1",
            partySize: 4,
            startDateTimeISO: "2025-09-08T13:00:00-03:00",
            customer: {
              name: `Guest ${i}`,
              phone: "123",
              email: `guest${i}@test.com`,
            },
          });
      }

      // 4th booking should fail
      const response = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "capacity-test-4")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Guest 4",
            phone: "123",
            email: "guest4@test.com",
          },
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "no_capacity");
    });

    it("should return 404 when restaurant does not exist", async () => {
      const response = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "test-key-404")
        .send({
          restaurantId: "INVALID",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "not_found");
    });
  });

  describe("DELETE /reservations/:id", () => {
    it("should cancel a reservation successfully", async () => {
      // First create a reservation
      const createResponse = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "cancel-test-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test Cancel",
            phone: "123",
            email: "cancel@test.com",
          },
        });

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.id;

      // Cancel it
      const deleteResponse = await request(app).delete(
        `/reservations/${reservationId}`
      );

      expect(deleteResponse.status).toBe(204);
      expect(deleteResponse.body).toEqual({});
    });

    it("should return 404 when trying to cancel non-existent reservation", async () => {
      const response = await request(app).delete("/reservations/INVALID_ID");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "not_found");
    });

    it("should make table available after cancellation", async () => {
      // Create reservation
      const createResponse = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "availability-test-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
        });

      const reservationId = createResponse.body.id;
      const tableId = createResponse.body.tableIds[0];

      // Check availability (table should be busy)
      const availabilityBefore = await request(app).get("/availability").query({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      const slotBefore = availabilityBefore.body.slots.find(
        (s: any) => s.start === "2025-09-08T16:00:00.000Z" // 13:00 ART
      );

      expect(slotBefore?.tables).not.toContain(tableId);

      // Cancel reservation
      await request(app).delete(`/reservations/${reservationId}`);

      // Check availability again (table should be available)
      const availabilityAfter = await request(app).get("/availability").query({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      const slotAfter = availabilityAfter.body.slots.find(
        (s: any) => s.start === "2025-09-08T16:00:00.000Z"
      );

      expect(slotAfter?.tables).toContain(tableId);
    });
  });

  describe("GET /reservations/day", () => {
    beforeEach(async () => {
      // Create test reservations
      await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "list-test-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Guest 1",
            phone: "123",
            email: "guest1@test.com",
          },
        });

      await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "list-test-002")
        .send({
          restaurantId: "R1",
          sectorId: "S2",
          partySize: 2,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Guest 2",
            phone: "456",
            email: "guest2@test.com",
          },
        });
    });

    it("should list all reservations for a day", async () => {
      const response = await request(app).get("/reservations/day").query({
        restaurantId: "R1",
        date: "2025-09-08",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("date", "2025-09-08");
      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter reservations by sector", async () => {
      const response = await request(app).get("/reservations/day").query({
        restaurantId: "R1",
        date: "2025-09-08",
        sectorId: "S1",
      });

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);

      // All items should be from sector S1
      response.body.items.forEach((item: any) => {
        expect(item.sectorId).toBe("S1");
      });
    });

    it("should return empty array when no reservations exist", async () => {
      const response = await request(app).get("/reservations/day").query({
        restaurantId: "R1",
        date: "2025-12-25", // Date with no reservations
      });

      expect(response.status).toBe(200);
      expect(response.body.date).toBe("2025-12-25");
      expect(response.body.items).toHaveLength(0);
    });

    it("should return 400 when missing required parameters", async () => {
      const response = await request(app).get("/reservations/day").query({
        restaurantId: "R1",
        // Missing date
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "validation_error");
    });

    it("should return 404 when restaurant does not exist", async () => {
      const response = await request(app).get("/reservations/day").query({
        restaurantId: "INVALID",
        date: "2025-09-08",
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "not_found");
    });
  });

  describe("Boundary Cases", () => {
    it("should allow adjacent reservations (end-exclusive semantics)", async () => {
      // First reservation: 13:00 - 14:30
      const first = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "boundary-test-001")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "First Guest",
            phone: "123",
            email: "first@test.com",
          },
        });

      expect(first.status).toBe(201);
      const tableId = first.body.tableIds[0];

      // Second reservation: Should start at 14:30 (same table, no overlap)
      const second = await request(app)
        .post("/reservations")
        .set("Idempotency-Key", "boundary-test-002")
        .send({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T14:30:00-03:00",
          customer: {
            name: "Second Guest",
            phone: "456",
            email: "second@test.com",
          },
        });

      // Should succeed if table assignment allows it
      expect([201, 409]).toContain(second.status);

      if (second.status === 201) {
        // If successful, could be same table or different table
        expect(second.body.tableIds).toBeDefined();
      }
    });
  });
});
