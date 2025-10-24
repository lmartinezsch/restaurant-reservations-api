import { Reservation, ReservationStatus } from "../../domain/entities";
import { ReservationRepository } from "../../domain/ports/repositories";

export class InMemoryReservationRepository implements ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  async findById(id: string): Promise<Reservation | null> {
    return this.reservations.get(id) || null;
  }

  async findByDateAndRestaurant(
    date: string,
    restaurantId: string,
    sectorId?: string
  ): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter((reservation) => {
      if (reservation.restaurantId !== restaurantId) return false;
      if (reservation.status === ReservationStatus.CANCELLED) return false;
      if (sectorId && reservation.sectorId !== sectorId) return false;

      const reservationDate = reservation.startDateTimeISO.split("T")[0];
      return reservationDate === date;
    });
  }

  async findOverlapping(
    sectorId: string,
    startDateTimeISO: string,
    endDateTimeISO: string
  ): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter((reservation) => {
      if (reservation.sectorId !== sectorId) return false;
      if (reservation.status === ReservationStatus.CANCELLED) return false;

      // Check for overlap using half-open interval [start, end)
      // Two intervals [a1, a2) and [b1, b2) overlap if: a1 < b2 && b1 < a2
      const resStart = new Date(reservation.startDateTimeISO).getTime();
      const resEnd = new Date(reservation.endDateTimeISO).getTime();
      const queryStart = new Date(startDateTimeISO).getTime();
      const queryEnd = new Date(endDateTimeISO).getTime();

      return resStart < queryEnd && queryStart < resEnd;
    });
  }

  async save(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async delete(id: string): Promise<void> {
    this.reservations.delete(id);
  }
}
