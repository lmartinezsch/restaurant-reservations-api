import { PrismaClient } from "@prisma/client";
import { IdempotencyKeyRepository } from "../../domain/ports/repositories";

export class PrismaIdempotencyKeyRepository
  implements IdempotencyKeyRepository
{
  constructor(private prisma: PrismaClient) {}

  async exists(key: string): Promise<boolean> {
    const result = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
    return result !== null;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
    return result?.reservationId || null;
  }

  async set(key: string, reservationId: string): Promise<void> {
    await this.prisma.idempotencyKey.create({
      data: {
        key,
        reservationId,
      },
    });
  }
}
