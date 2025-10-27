import { PrismaClient } from "@prisma/client";
import { IdempotencyKeyRepository } from "../../domain/ports/repositories";
import { validateDatabaseId, sanitizeLockKey } from "../utils/validation";

export class PrismaIdempotencyKeyRepository
  implements IdempotencyKeyRepository
{
  constructor(private prisma: PrismaClient) {}

  async exists(key: string): Promise<boolean> {
    const sanitizedKey = sanitizeLockKey(key);

    const result = await this.prisma.idempotencyKey.findUnique({
      where: { key: sanitizedKey },
    });
    return result !== null;
  }

  async get(key: string): Promise<string | null> {
    const sanitizedKey = sanitizeLockKey(key);

    const result = await this.prisma.idempotencyKey.findUnique({
      where: { key: sanitizedKey },
    });
    return result?.reservationId || null;
  }

  async set(key: string, reservationId: string): Promise<void> {
    const sanitizedKey = sanitizeLockKey(key);
    validateDatabaseId(reservationId, "reservation id");

    await this.prisma.idempotencyKey.create({
      data: {
        key: sanitizedKey,
        reservationId,
      },
    });
  }
}
