import { Restaurant, Sector, Table, Reservation } from "../entities";

export interface RestaurantRepository {
  findById(id: string): Promise<Restaurant | null>;
  findAll(): Promise<Restaurant[]>;
}

export interface SectorRepository {
  findById(id: string): Promise<Sector | null>;
  findByRestaurantId(restaurantId: string): Promise<Sector[]>;
}

export interface TableRepository {
  findById(id: string): Promise<Table | null>;
  findBySectorId(sectorId: string): Promise<Table[]>;
}

export interface ReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  findByDateAndRestaurant(
    date: string,
    restaurantId: string,
    sectorId?: string
  ): Promise<Reservation[]>;
  findOverlapping(
    sectorId: string,
    startDateTimeISO: string,
    endDateTimeISO: string
  ): Promise<Reservation[]>;
  save(reservation: Reservation): Promise<Reservation>;
  delete(id: string): Promise<void>;
}

export interface IdempotencyKeyRepository {
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, reservationId: string): Promise<void>;
}

export interface LockRepository {
  acquireLock(key: string): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
}
