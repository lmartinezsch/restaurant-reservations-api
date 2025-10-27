import { PrismaClient } from "@prisma/client";
import { LockRepository } from "../../domain/ports/repositories";
import { sanitizeLockKey } from "../utils/validation";

export class PrismaLockRepository implements LockRepository {
  private readonly LOCK_TIMEOUT_MS = 10000; // 10 seconds

  constructor(private prisma: PrismaClient) {}

  async acquireLock(key: string): Promise<boolean> {
    const sanitizedKey = sanitizeLockKey(key);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.LOCK_TIMEOUT_MS);

    try {
      await this.prisma.$transaction(async (tx) => {
        const existingLock = await tx.lock.findUnique({
          where: { lockKey: sanitizedKey },
        });

        if (existingLock && existingLock.expiresAt > now) {
          throw new Error("Lock already acquired");
        }

        await tx.lock.upsert({
          where: { lockKey: sanitizedKey },
          update: {
            acquiredAt: now,
            expiresAt,
          },
          create: {
            lockKey: sanitizedKey,
            acquiredAt: now,
            expiresAt,
          },
        });
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    const sanitizedKey = sanitizeLockKey(key);

    await this.prisma.lock
      .delete({
        where: { lockKey: sanitizedKey },
      })
      .catch(() => {});
  }
}
