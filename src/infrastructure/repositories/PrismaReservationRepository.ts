import { PrismaClient } from "@prisma/client";
import { Reservation, ReservationStatus } from "../../domain/entities";
import { ReservationRepository } from "../../domain/ports/repositories";

export class PrismaReservationRepository implements ReservationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Reservation | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    if (!reservation) {
      return null;
    }

    return this.toDomain(reservation);
  }

  async findByDateAndRestaurant(
    date: string,
    restaurantId: string,
    sectorId?: string
  ): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        sectorId: sectorId || undefined,
        startDateTimeISO: {
          gte: date,
        },
      },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    return reservations.map((r: any) => this.toDomain(r));
  }

  async findOverlapping(
    sectorId: string,
    startDateTimeISO: string,
    endDateTimeISO: string
  ): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        sectorId,
        status: ReservationStatus.CONFIRMED,
        OR: [
          {
            AND: [
              { startDateTimeISO: { lte: startDateTimeISO } },
              { endDateTimeISO: { gt: startDateTimeISO } },
            ],
          },
          {
            AND: [
              { startDateTimeISO: { lt: endDateTimeISO } },
              { endDateTimeISO: { gte: endDateTimeISO } },
            ],
          },
          {
            AND: [
              { startDateTimeISO: { gte: startDateTimeISO } },
              { endDateTimeISO: { lte: endDateTimeISO } },
            ],
          },
        ],
      },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    return reservations.map((r: any) => this.toDomain(r));
  }

  async save(reservation: Reservation): Promise<Reservation> {
    // Delete existing reservation tables if updating
    await this.prisma.reservationTable.deleteMany({
      where: { reservationId: reservation.id },
    });

    const saved = await this.prisma.reservation.upsert({
      where: { id: reservation.id },
      update: {
        restaurantId: reservation.restaurantId,
        sectorId: reservation.sectorId,
        partySize: reservation.partySize,
        startDateTimeISO: reservation.startDateTimeISO,
        endDateTimeISO: reservation.endDateTimeISO,
        status: reservation.status,
        customerName: reservation.customer.name,
        customerEmail: reservation.customer.email,
        customerPhone: reservation.customer.phone,
        customerCreatedAt: reservation.customer.createdAt,
        customerUpdatedAt: reservation.customer.updatedAt,
        updatedAt: new Date(reservation.updatedAt),
        tables: {
          create: reservation.tableIds.map((tableId) => ({
            tableId,
          })),
        },
      },
      create: {
        id: reservation.id,
        restaurantId: reservation.restaurantId,
        sectorId: reservation.sectorId,
        partySize: reservation.partySize,
        startDateTimeISO: reservation.startDateTimeISO,
        endDateTimeISO: reservation.endDateTimeISO,
        status: reservation.status,
        customerName: reservation.customer.name,
        customerEmail: reservation.customer.email,
        customerPhone: reservation.customer.phone,
        customerCreatedAt: reservation.customer.createdAt,
        customerUpdatedAt: reservation.customer.updatedAt,
        createdAt: new Date(reservation.createdAt),
        updatedAt: new Date(reservation.updatedAt),
        tables: {
          create: reservation.tableIds.map((tableId) => ({
            tableId,
          })),
        },
      },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reservation.delete({
      where: { id },
    });
  }

  private toDomain(prismaReservation: any): Reservation {
    return {
      id: prismaReservation.id,
      restaurantId: prismaReservation.restaurantId,
      sectorId: prismaReservation.sectorId,
      partySize: prismaReservation.partySize,
      startDateTimeISO: prismaReservation.startDateTimeISO,
      endDateTimeISO: prismaReservation.endDateTimeISO,
      status: prismaReservation.status,
      tableIds: prismaReservation.tables.map((rt: any) => rt.tableId),
      customer: {
        name: prismaReservation.customerName,
        email: prismaReservation.customerEmail,
        phone: prismaReservation.customerPhone,
        createdAt: prismaReservation.createdAt.toISOString(),
        updatedAt: prismaReservation.updatedAt.toISOString(),
      },
      createdAt: prismaReservation.createdAt.toISOString(),
      updatedAt: prismaReservation.updatedAt.toISOString(),
    };
  }
}
