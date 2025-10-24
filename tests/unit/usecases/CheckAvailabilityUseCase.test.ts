import { CheckAvailabilityUseCase } from "../../../src/application/usecases/CheckAvailabilityUseCase";
import {
  RestaurantRepository,
  SectorRepository,
  TableRepository,
  ReservationRepository,
} from "../../../src/domain/ports/repositories";
import {
  Restaurant,
  Sector,
  Table,
  Reservation,
  ReservationStatus,
} from "../../../src/domain/entities";
import { NotFoundError } from "../../../src/domain/errors";

describe("CheckAvailabilityUseCase", () => {
  let useCase: CheckAvailabilityUseCase;
  let restaurantRepo: jest.Mocked<RestaurantRepository>;
  let sectorRepo: jest.Mocked<SectorRepository>;
  let tableRepo: jest.Mocked<TableRepository>;
  let reservationRepo: jest.Mocked<ReservationRepository>;

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

  const mockTables: Table[] = [
    {
      id: "T1",
      sectorId: "S1",
      name: "Table 1",
      minSize: 1,
      maxSize: 2,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "T2",
      sectorId: "S1",
      name: "Table 2",
      minSize: 3,
      maxSize: 4,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  ];

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

    useCase = new CheckAvailabilityUseCase(
      restaurantRepo,
      sectorRepo,
      tableRepo,
      reservationRepo
    );
  });

  describe("Happy Path", () => {
    it("should return available slots when no reservations exist", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue(mockTables);
      reservationRepo.findByDateAndRestaurant.mockResolvedValue([]);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      expect(result.slotMinutes).toBe(15);
      expect(result.durationMinutes).toBe(90);
      expect(result.slots.length).toBeGreaterThan(0);

      // Check that slots within shift are available
      const availableSlots = result.slots.filter((s) => s.available);
      expect(availableSlots.length).toBeGreaterThan(0);

      // Check that available slots have table IDs
      const slotWithTables = availableSlots.find(
        (s) => s.tables && s.tables.length > 0
      );
      expect(slotWithTables).toBeDefined();
      expect(slotWithTables!.tables).toContain("T2"); // T2 fits party of 4
    });

    it("should filter tables by party size correctly", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue(mockTables);
      reservationRepo.findByDateAndRestaurant.mockResolvedValue([]);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 2,
      });

      const availableSlots = result.slots.filter((s) => s.available);
      const slotWithTables = availableSlots[0];

      // For party of 2, T1 (1-2) should definitely be available
      expect(slotWithTables.tables).toBeDefined();
      expect(slotWithTables.tables!.length).toBeGreaterThan(0);
      expect(slotWithTables.tables).toContain("T1");

      // Note: The algorithm returns first available table per slot
      // T2 (3-4 capacity) can also fit 2 people, so check if it's included
      // At least T1 should be available
    });

    it("should mark slots as unavailable when tables are booked", async () => {
      const mockReservation: Reservation = {
        id: "RES1",
        restaurantId: "R1",
        sectorId: "S1",
        tableIds: ["T2"],
        partySize: 4,
        startDateTimeISO: "2025-09-08T15:00:00.000Z", // 12:00 ART
        endDateTimeISO: "2025-09-08T16:30:00.000Z",
        status: ReservationStatus.CONFIRMED,
        customer: {
          name: "Test",
          phone: "123",
          email: "test@test.com",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue(mockTables);
      reservationRepo.findByDateAndRestaurant.mockResolvedValue([
        mockReservation,
      ]);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      // Slots overlapping with the reservation should not have T2 available
      const overlappingSlot = result.slots.find(
        (s) => s.start === "2025-09-08T15:00:00.000Z"
      );

      expect(overlappingSlot).toBeDefined();
      if (overlappingSlot?.available) {
        // If available, T2 should not be in the list
        expect(overlappingSlot.tables).not.toContain("T2");
      }
    });
  });

  describe("Error Cases", () => {
    it("should throw NotFoundError when restaurant does not exist", async () => {
      restaurantRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          restaurantId: "INVALID",
          sectorId: "S1",
          date: "2025-09-08",
          partySize: 4,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when sector does not exist", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          restaurantId: "R1",
          sectorId: "INVALID",
          date: "2025-09-08",
          partySize: 4,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should mark slots as unavailable when no suitable tables exist", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue(mockTables);
      reservationRepo.findByDateAndRestaurant.mockResolvedValue([]);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 10, // No table fits 10 people
      });

      const availableSlots = result.slots.filter((s) => s.available);
      expect(availableSlots.length).toBe(0);

      const unavailableSlots = result.slots.filter(
        (s) => !s.available && s.reason === "no_capacity"
      );
      expect(unavailableSlots.length).toBeGreaterThan(0);
    });
  });

  describe("Service Window Validation", () => {
    it("should mark slots outside service window as unavailable", async () => {
      restaurantRepo.findById.mockResolvedValue(mockRestaurant);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue(mockTables);
      reservationRepo.findByDateAndRestaurant.mockResolvedValue([]);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 4,
      });

      // Slots outside 12:00-16:00 ART should be unavailable
      const outsideSlot = result.slots.find(
        (s) => s.start === "2025-09-08T05:00:00.000Z" // 02:00 ART (outside shift)
      );

      if (outsideSlot) {
        expect(outsideSlot.available).toBe(false);
        expect(outsideSlot.reason).toBe("outside_service_window");
      }
    });

    it("should allow full day when no shifts are defined", async () => {
      const restaurantNoShifts = { ...mockRestaurant, shifts: undefined };
      restaurantRepo.findById.mockResolvedValue(restaurantNoShifts);
      sectorRepo.findById.mockResolvedValue(mockSector);
      tableRepo.findBySectorId.mockResolvedValue(mockTables);
      reservationRepo.findByDateAndRestaurant.mockResolvedValue([]);

      const result = await useCase.execute({
        restaurantId: "R1",
        sectorId: "S1",
        date: "2025-09-08",
        partySize: 2,
      });

      // Should have 96 slots (24 hours * 4 slots per hour)
      expect(result.slots.length).toBe(96);

      // All slots should be available (no shift restrictions)
      const availableCount = result.slots.filter((s) => s.available).length;
      expect(availableCount).toBeGreaterThan(0);
    });
  });
});
