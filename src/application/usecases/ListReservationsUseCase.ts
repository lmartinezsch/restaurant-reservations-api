import {
  ReservationRepository,
  RestaurantRepository,
} from "../../domain/ports/repositories";
import { Reservation } from "../../domain/entities";
import { NotFoundError } from "../../domain/errors";

export interface ListReservationsInput {
  restaurantId: string;
  date: string;
  sectorId?: string;
}

export interface ListReservationsOutput {
  date: string;
  items: Reservation[];
}

export class ListReservationsUseCase {
  constructor(
    private reservationRepository: ReservationRepository,
    private restaurantRepo: RestaurantRepository
  ) {}

  async execute(input: ListReservationsInput): Promise<ListReservationsOutput> {
    const { restaurantId, date, sectorId } = input;

    const restaurant = await this.restaurantRepo.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError("Restaurant", restaurantId);
    }

    const reservations =
      await this.reservationRepository.findByDateAndRestaurant(
        date,
        restaurantId,
        sectorId
      );

    return {
      date,
      items: reservations,
    };
  }
}
