import { v4 as uuidv4 } from "uuid";
import {
  RestaurantRepository,
  SectorRepository,
  TableRepository,
  ReservationRepository,
  IdempotencyKeyRepository,
  LockRepository,
} from "../../domain/ports/repositories";
import {
  Reservation,
  Customer,
  ReservationStatus,
} from "../../domain/entities";
import {
  NotFoundError,
  NoCapacityError,
  OutsideServiceWindowError,
  ValidationError,
} from "../../domain/errors";
import {
  isWithinShifts,
  calculateEndTime,
  isValidISODateTime,
  RESERVATION_DURATION_MINUTES,
} from "../utils/dateTimeUtils";

export interface CreateReservationInput {
  restaurantId: string;
  sectorId: string;
  partySize: number;
  startDateTimeISO: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  notes?: string;
  idempotencyKey: string;
}

export class CreateReservationUseCase {
  constructor(
    private restaurantRepository: RestaurantRepository,
    private sectorRepository: SectorRepository,
    private tableRepository: TableRepository,
    private reservationRepository: ReservationRepository,
    private idempotencyRepository: IdempotencyKeyRepository,
    private lockRepository: LockRepository
  ) {}

  async execute(input: CreateReservationInput): Promise<Reservation> {
    const {
      restaurantId,
      sectorId,
      partySize,
      startDateTimeISO,
      customer,
      notes,
      idempotencyKey,
    } = input;

    if (!isValidISODateTime(startDateTimeISO)) {
      throw new ValidationError(
        "Invalid ISO DateTime format for startDateTimeISO"
      );
    }

    if (partySize < 1) {
      throw new ValidationError("Party size must be at least 1");
    }

    const existingReservationId = await this.idempotencyRepository.get(
      idempotencyKey
    );
    if (existingReservationId) {
      const existingReservation = await this.reservationRepository.findById(
        existingReservationId
      );
      if (existingReservation) {
        return existingReservation;
      }
    }

    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError("Restaurant", restaurantId);
    }

    const sector = await this.sectorRepository.findById(sectorId);
    if (!sector) {
      throw new NotFoundError("Sector", sectorId);
    }

    const endDateTimeISO = calculateEndTime(
      startDateTimeISO,
      RESERVATION_DURATION_MINUTES
    );

    if (
      !isWithinShifts(
        startDateTimeISO,
        endDateTimeISO,
        restaurant.timezone,
        restaurant.shifts
      )
    ) {
      throw new OutsideServiceWindowError(
        "Requested time is outside service window"
      );
    }

    const lockKey = `reservation:${sectorId}:${startDateTimeISO}`;
    const lockAcquired = await this.lockRepository.acquireLock(lockKey);

    if (!lockAcquired) {
      throw new NoCapacityError(
        "Reservation slot is being processed by another request"
      );
    }

    try {
      const table = await this.findAvailableTable(
        sectorId,
        startDateTimeISO,
        endDateTimeISO,
        partySize
      );

      if (!table) {
        throw new NoCapacityError(
          "No available table fits party size at requested time"
        );
      }

      const now = new Date().toISOString();
      const customerData: Customer = {
        ...customer,
        createdAt: now,
        updatedAt: now,
      };

      const reservation: Reservation = {
        id: uuidv4(),
        restaurantId,
        sectorId,
        tableIds: [table.id],
        partySize,
        startDateTimeISO,
        endDateTimeISO,
        status: ReservationStatus.CONFIRMED,
        customer: customerData,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      await this.reservationRepository.save(reservation);

      await this.idempotencyRepository.set(idempotencyKey, reservation.id);

      return reservation;
    } finally {
      await this.lockRepository.releaseLock(lockKey);
    }
  }

  private async findAvailableTable(
    sectorId: string,
    startDateTimeISO: string,
    endDateTimeISO: string,
    partySize: number
  ): Promise<{ id: string } | null> {
    const allTables = await this.tableRepository.findBySectorId(sectorId);

    const suitableTables = allTables.filter(
      (table) => table.minSize <= partySize && partySize <= table.maxSize
    );

    if (suitableTables.length === 0) {
      return null;
    }

    const overlappingReservations =
      await this.reservationRepository.findOverlapping(
        sectorId,
        startDateTimeISO,
        endDateTimeISO
      );

    const busyTableIds = new Set<string>();
    for (const reservation of overlappingReservations) {
      reservation.tableIds.forEach((tableId) => busyTableIds.add(tableId));
    }

    const availableTable = suitableTables.find(
      (table) => !busyTableIds.has(table.id)
    );

    return availableTable || null;
  }
}
