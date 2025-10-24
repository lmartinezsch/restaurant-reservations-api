import { PrismaClient } from "@prisma/client";
import { LockRepository } from "../../domain/ports/repositories";

export class PrismaLockRepository implements LockRepository {
  private readonly LOCK_TIMEOUT_MS = 10000; // 10 seconds

  constructor(private prisma: PrismaClient) {}

  async acquireLock(key: string): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.LOCK_TIMEOUT_MS);

    try {
      const existingLock = await this.prisma.lock.findUnique({
        where: { lockKey: key },
      });

      if (existingLock && existingLock.expiresAt > now) {
        return false;
      }

      await this.prisma.lock.upsert({
        where: { lockKey: key },
        update: {
          acquiredAt: now,
          expiresAt,
        },
        create: {
          lockKey: key,
          acquiredAt: now,
          expiresAt,
        },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    await this.prisma.lock
      .delete({
        where: { lockKey: key },
      })
      .catch(() => {
        // Ignore errors if lock doesn't exist
      });
  }
}
