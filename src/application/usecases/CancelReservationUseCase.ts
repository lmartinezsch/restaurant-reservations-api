import { ReservationRepository } from "../../domain/ports/repositories";
import { NotFoundError } from "../../domain/errors";

export class CancelReservationUseCase {
  constructor(private reservationRepo: ReservationRepository) {}

  async execute(reservationId: string): Promise<void> {
    const reservation = await this.reservationRepo.findById(reservationId);

    if (!reservation) {
      throw new NotFoundError("Reservation", reservationId);
    }

    await this.reservationRepo.delete(reservationId);
  }
}
