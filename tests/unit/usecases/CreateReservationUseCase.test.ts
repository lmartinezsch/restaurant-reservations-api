import { CreateReservationUseCase } from "../../../src/application/usecases/CreateReservationUseCase";
import {
  RestaurantRepository,
  SectorRepository,
  TableRepository,
  ReservationRepository,
  IdempotencyKeyRepository,
  LockRepository,
} from "../../../src/domain/ports/repositories";
import {
  Restaurant,
  Sector,
  Table,
  Reservation,
  ReservationStatus,
} from "../../../src/domain/entities";
import {
  NotFoundError,
  NoCapacityError,
  OutsideServiceWindowError,
  ValidationError,
} from "../../../src/domain/errors";

describe("CreateReservationUseCase", () => {
  let useCase: CreateReservationUseCase;
  let restaurantRepo: jest.Mocked<RestaurantRepository>;
  let sectorRepo: jest.Mocked<SectorRepository>;
  let tableRepo: jest.Mocked<TableRepository>;
  let reservationRepo: jest.Mocked<ReservationRepository>;
  let idempotencyRepo: jest.Mocked<IdempotencyKeyRepository>;
  let lockRepo: jest.Mocked<LockRepository>;

  const mockRestaurant: Restaurant = {
    id: "R1",
    name: "Test Restaurant",
    timezone: "America/Argentina/Buenos_Aires",
    shifts: [{ start: "12:00", end: "16:00" }],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  const mockSector: Sector = {
    id: "S1",
    restaurantId: "R1",
    name: "Main Hall",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  const mockTable: Table = {
    id: "T1",
    sectorId: "S1",
    name: "Table 1",
    minSize: 3,
    maxSize: 4,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    restaurantRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<RestaurantRepository>;

    sectorRepo = {
      findById: jest.fn(),
      findByRestaurantId: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<SectorRepository>;

    tableRepo = {
      findById: jest.fn(),
      findBySectorId: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<TableRepository>;

    reservationRepo = {
      findById: jest.fn(),
      findByDateAndRestaurant: jest.fn(),
      findOverlapping: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ReservationRepository>;

    idempotencyRepo = {
      exists: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    } as jest.Mocked<IdempotencyKeyRepository>;

    lockRepo = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    } as jest.Mocked<LockRepository>;

    useCase = new CreateReservationUseCase(
      restaurantRepo,
      sectorRepo,
      tableRepo,
      reservationRepo,
      idempotencyRepo,
      lockRepo
    );
  });

  describe("Happy Path", () => {
    it("should create a reservation successfully", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue([mockTable]);
      reservationRepo.findOverlapping.mockResolvedValue([]);
      idempotencyRepo.get.mockResolvedValue(null);
      lockRepo.acquireLock.mockResolvedValue(true);
      reservationRepo.save.mockImplementation(async (r) => r);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T13:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "+54 9 11 5555-1234",
          email: "john@test.com",
        },
        notes: "Test reservation",
        idempotencyKey: "test-key-123",
      });

      expect(result.id).toBeDefined();
      expect(result.restaurantId).toBe("R1");
      expect(result.sectorId).toBe("S1");
      expect(result.partySize).toBe(4);
      expect(result.tableIds).toEqual(["T1"]);
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.customer.name).toBe("John Doe");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      expect(lockRepo.acquireLock).toHaveBeenCalled();
      expect(lockRepo.releaseLock).toHaveBeenCalled();
      expect(reservationRepo.save).toHaveBeenCalled();
      expect(idempotencyRepo.set).toHaveBeenCalledWith(
        "test-key-123",
        result.id
      );
    });

    it("should set customer timestamps on creation", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue([mockTable]);
      reservationRepo.findOverlapping.mockResolvedValue([]);
      idempotencyRepo.get.mockResolvedValue(null);
      lockRepo.acquireLock.mockResolvedValue(true);
      reservationRepo.save.mockImplementation(async (r) => r);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T13:00:00-03:00",
        customer: {
          name: "Jane Doe",
          phone: "123",
          email: "jane@test.com",
        },
        idempotencyKey: "test-key-456",
      });

      expect(result.customer.createdAt).toBeDefined();
      expect(result.customer.updatedAt).toBeDefined();
      expect(result.customer.createdAt).toBe(result.customer.updatedAt);
    });
  });

  describe("Idempotency", () => {
    it("should return existing reservation when idempotency key already exists", async () => {
      const existingReservation: Reservation = {
        id: "EXISTING_ID",
        restaurantId: "R1",
        sectorId: "S1",
        tableIds: ["T1"],
        partySize: 4,
        startDateTimeISO: "2025-09-08T13:00:00-03:00",
        endDateTimeISO: "2025-09-08T14:30:00-03:00",
        status: ReservationStatus.CONFIRMED,
        customer: {
          name: "John Doe",
          phone: "123",
          email: "john@test.com",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      idempotencyRepo.get.mockResolvedValue("EXISTING_ID");
      reservationRepo.findById.mockResolvedValue(existingReservation);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        partySize: 4,
        startDateTimeISO: "2025-09-08T13:00:00-03:00",
        customer: {
          name: "John Doe",
          phone: "123",
          email: "john@test.com",
        },
        idempotencyKey: "duplicate-key",
      });

      expect(result.id).toBe("EXISTING_ID");
      expect(lockRepo.acquireLock).not.toHaveBeenCalled();
      expect(reservationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("should throw ValidationError for invalid ISO datetime", async () => {
      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "invalid-date",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-1",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for party size less than 1", async () => {
      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 0,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-2",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError when restaurant does not exist", async () => {
      restaurantRepo.findById.mockResolvedValue(null);
      idempotencyRepo.get.mockResolvedValue(null);

      await expect(
        useCase.execute({
          restaurantId: "INVALID",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-3",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when sector does not exist", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(null);
      idempotencyRepo.get.mockResolvedValue(null);

      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "INVALID",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-4",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Service Window Validation", () => {
    it("should throw OutsideServiceWindowError for time outside shifts", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      idempotencyRepo.get.mockResolvedValue(null);

      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T18:00:00-03:00", // Outside 12:00-16:00
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-5",
        })
      ).rejects.toThrow(OutsideServiceWindowError);
    });
  });

  describe("Capacity Management", () => {
    it("should throw NoCapacityError when no suitable tables exist", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue([mockTable]); // Only fits 3-4 people
      reservationRepo.findOverlapping.mockResolvedValue([]);
      idempotencyRepo.get.mockResolvedValue(null);
      lockRepo.acquireLock.mockResolvedValue(true);

      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 10, // No table fits 10 people
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-6",
        })
      ).rejects.toThrow(NoCapacityError);

      expect(lockRepo.releaseLock).toHaveBeenCalled();
    });

    it("should throw NoCapacityError when all tables are booked", async () => {
      const overlappingReservation: Reservation = {
        id: "RES1",
        restaurantId: "R1",
        sectorId: "S1",
        tableIds: ["T1"],
        partySize: 4,
        startDateTimeISO: "2025-09-08T13:00:00-03:00",
        endDateTimeISO: "2025-09-08T14:30:00-03:00",
        status: ReservationStatus.CONFIRMED,
        customer: {
          name: "Other",
          phone: "456",
          email: "other@test.com",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue([mockTable]);
      reservationRepo.findOverlapping.mockResolvedValue([
        overlappingReservation,
      ]);
      idempotencyRepo.get.mockResolvedValue(null);
      lockRepo.acquireLock.mockResolvedValue(true);

      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-7",
        })
      ).rejects.toThrow(NoCapacityError);
    });
  });

  describe("Concurrency Control", () => {
    it("should throw NoCapacityError when lock cannot be acquired", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      idempotencyRepo.get.mockResolvedValue(null);
      lockRepo.acquireLock.mockResolvedValue(false); // Lock already held

      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-8",
        })
      ).rejects.toThrow(NoCapacityError);
    });

    it("should always release lock even when error occurs", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue([]);
      reservationRepo.findOverlapping.mockResolvedValue([]);
      idempotencyRepo.get.mockResolvedValue(null);
      lockRepo.acquireLock.mockResolvedValue(true);

      try {
        await useCase.execute({
          restaurantId: "R1",
          sectorId: "S1",
          partySize: 4,
          startDateTimeISO: "2025-09-08T13:00:00-03:00",
          customer: {
            name: "Test",
            phone: "123",
            email: "test@test.com",
          },
          idempotencyKey: "key-9",
        });
      } catch (error) {
        // Expected to throw
      }

      expect(lockRepo.releaseLock).toHaveBeenCalled();
    });
  });
});
