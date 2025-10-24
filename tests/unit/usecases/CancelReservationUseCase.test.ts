import { CancelReservationUseCase } from "../../../src/application/usecases/CancelReservationUseCase";
import { ReservationRepository } from "../../../src/domain/ports/repositories";
import { Reservation, ReservationStatus } from "../../../src/domain/entities";
import { NotFoundError } from "../../../src/domain/errors";

describe("CancelReservationUseCase", () => {
  let useCase: CancelReservationUseCase;
  let reservationRepo: jest.Mocked<ReservationRepository>;

  const mockReservation: Reservation = {
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
  };

  beforeEach(() => {
    reservationRepo = {
      findById: jest.fn(),
      findByDateAndRestaurant: jest.fn(),
      findOverlapping: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ReservationRepository>;

    useCase = new CancelReservationUseCase(reservationRepo);
  });

  it("should cancel (delete) a reservation successfully", async () => {
    reservationRepo.findById.mockResolvedValue(mockReservation);
    reservationRepo.delete.mockResolvedValue(undefined);

    await useCase.execute("RES1");

    expect(reservationRepo.findById).toHaveBeenCalledWith("RES1");
    expect(reservationRepo.delete).toHaveBeenCalledWith("RES1");
  });

  it("should throw NotFoundError when reservation does not exist", async () => {
    reservationRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute("INVALID_ID")).rejects.toThrow(NotFoundError);
    expect(reservationRepo.delete).not.toHaveBeenCalled();
  });
});
