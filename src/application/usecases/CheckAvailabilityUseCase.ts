import {
  RestaurantRepository,
  SectorRepository,
  TableRepository,
  ReservationRepository,
} from "../../domain/ports/repositories";
import { Table, Reservation, ReservationStatus } from "../../domain/entities";
import { NotFoundError, OutsideServiceWindowError } from "../../domain/errors";
import {
  generateDaySlots,
  isWithinShifts,
  calculateEndTime,
  RESERVATION_DURATION_MINUTES,
  SLOT_MINUTES,
} from "../utils/dateTimeUtils";

export interface AvailabilitySlot {
  start: string;
  available: boolean;
  tables?: string[];
  reason?: string;
}

export interface CheckAvailabilityInput {
  restaurantId: string;
  sectorId: string;
  date: string;
  partySize: number;
}

export interface CheckAvailabilityOutput {
  slotMinutes: number;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

export class CheckAvailabilityUseCase {
  constructor(
    private restaurantRepository: RestaurantRepository,
    private sectorRepository: SectorRepository,
    private tableRepository: TableRepository,
    private reservationRepository: ReservationRepository
  ) {}

  async execute(
    input: CheckAvailabilityInput
  ): Promise<CheckAvailabilityOutput> {
    const { restaurantId, sectorId, date, partySize } = input;

    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError("Restaurant", restaurantId);
    }

    const sector = await this.sectorRepository.findById(sectorId);
    if (!sector) {
      throw new NotFoundError("Sector", sectorId);
    }

    const allTables = await this.tableRepository.findBySectorId(sectorId);
    const suitableTables = allTables.filter(
      (table) => table.minSize <= partySize && partySize <= table.maxSize
    );

    const slots = generateDaySlots(
      date,
      restaurant.timezone,
      restaurant.shifts
    );

    const dayReservations =
      await this.reservationRepository.findByDateAndRestaurant(
        date,
        restaurantId,
        sectorId
      );

    const availabilitySlots: AvailabilitySlot[] = slots.map((slotStart) => {
      const startDateTimeISO = slotStart.toISOString();
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
        return {
          start: startDateTimeISO,
          available: false,
          reason: "outside_service_window",
        };
      }

      const availableTables = this.findAvailableTables(
        suitableTables,
        dayReservations,
        startDateTimeISO,
        endDateTimeISO
      );

      if (availableTables.length > 0) {
        return {
          start: startDateTimeISO,
          available: true,
          tables: availableTables.map((t) => t.id),
        };
      } else {
        return {
          start: startDateTimeISO,
          available: false,
          reason: "no_capacity",
        };
      }
    });

    return {
      slotMinutes: SLOT_MINUTES,
      durationMinutes: RESERVATION_DURATION_MINUTES,
      slots: availabilitySlots,
    };
  }

  private findAvailableTables(
    suitableTables: Table[],
    reservations: Reservation[],
    startDateTimeISO: string,
    endDateTimeISO: string
  ): Table[] {
    const startTime = new Date(startDateTimeISO).getTime();
    const endTime = new Date(endDateTimeISO).getTime();

    const busyTableIds = new Set<string>();
    for (const reservation of reservations) {
      if (reservation.status === ReservationStatus.CANCELLED) continue;

      const resStart = new Date(reservation.startDateTimeISO).getTime();
      const resEnd = new Date(reservation.endDateTimeISO).getTime();

      if (resStart < endTime && startTime < resEnd) {
        reservation.tableIds.forEach((tableId) => busyTableIds.add(tableId));
      }
    }

    return suitableTables.filter((table) => !busyTableIds.has(table.id));
  }
}
