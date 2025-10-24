import { IdempotencyKeyRepository } from "../../domain/ports/repositories";

export class InMemoryIdempotencyKeyRepository
  implements IdempotencyKeyRepository
{
  private keys: Map<string, string> = new Map();

  async exists(key: string): Promise<boolean> {
    return this.keys.has(key);
  }

  async get(key: string): Promise<string | null> {
    return this.keys.get(key) || null;
  }

  async set(key: string, reservationId: string): Promise<void> {
    this.keys.set(key, reservationId);
  }
}
