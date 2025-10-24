import { ListReservationsUseCase } from "../../../src/application/usecases/ListReservationsUseCase";
import {
  ReservationRepository,
  RestaurantRepository,
} from "../../../src/domain/ports/repositories";
import {
  Restaurant,
  Reservation,
  ReservationStatus,
} from "../../../src/domain/entities";
import { NotFoundError } from "../../../src/domain/errors";

describe("ListReservationsUseCase", () => {
  let useCase: ListReservationsUseCase;
  let reservationRepo: jest.Mocked<ReservationRepository>;
  let restaurantRepo: jest.Mocked<RestaurantRepository>;

  const mockRestaurant: Restaurant = {
    id: "R1",
    name: "Test Restaurant",
    timezone: "America/Argentina/Buenos_Aires",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  const mockReservations: Reservation[] = [
    {
      id: "RES1",
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
    },
    {
      id: "RES2",
      restaurantId: "R1",
      sectorId: "S2",
      tableIds: ["T5"],
      partySize: 2,
      startDateTimeISO: "2025-09-08T14:00:00-03:00",
      endDateTimeISO: "2025-09-08T15:30:00-03:00",
      status: ReservationStatus.CONFIRMED,
      customer: {
        name: "Jane Smith",
        phone: "456",
        email: "jane@test.com",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    reservationRepo = {
      findById: jest.fn(),
      findByDateAndRestaurant: jest.fn(),
      findOverlapping: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ReservationRepository>;

    restaurantRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<RestaurantRepository>;

    useCase = new ListReservationsUseCase(reservationRepo, restaurantRepo);
  });

  it("should list all reservations for a day", async () => {
    restaurantRepo.findById.mockResolvedValue(mockRestaurant);
    reservationRepo.findByDateAndRestaurant.mockResolvedValue(mockReservations);

    const result = await useCase.execute({
      restaurantId: "R1",
      date: "2025-09-08",
    });

    expect(result.date).toBe("2025-09-08");
    expect(result.items).toHaveLength(2);
    expect(result.items).toEqual(mockReservations);
    expect(reservationRepo.findByDateAndRestaurant).toHaveBeenCalledWith(
      "2025-09-08",
      "R1",
      undefined
    );
  });

  it("should list reservations filtered by sector", async () => {
    const sectorReservations = [mockReservations[0]];
    restaurantRepo.findById.mockResolvedValue(mockRestaurant);
    reservationRepo.findByDateAndRestaurant.mockResolvedValue(
      sectorReservations
    );

    const result = await useCase.execute({
      restaurantId: "R1",
      date: "2025-09-08",
      sectorId: "S1",
    });

    expect(result.date).toBe("2025-09-08");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sectorId).toBe("S1");
    expect(reservationRepo.findByDateAndRestaurant).toHaveBeenCalledWith(
      "2025-09-08",
      "R1",
      "S1"
    );
  });

  it("should return empty array when no reservations exist", async () => {
    restaurantRepo.findById.mockResolvedValue(mockRestaurant);
    reservationRepo.findByDateAndRestaurant.mockResolvedValue([]);

    const result = await useCase.execute({
      restaurantId: "R1",
      date: "2025-09-08",
    });

    expect(result.date).toBe("2025-09-08");
    expect(result.items).toHaveLength(0);
  });

  it("should throw NotFoundError when restaurant does not exist", async () => {
    restaurantRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        restaurantId: "INVALID",
        date: "2025-09-08",
      })
    ).rejects.toThrow(NotFoundError);
  });
});
