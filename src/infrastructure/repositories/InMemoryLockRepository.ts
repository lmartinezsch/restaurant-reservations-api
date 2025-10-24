import { LockRepository } from "../../domain/ports/repositories";

export class InMemoryLockRepository implements LockRepository {
  private locks: Map<string, boolean> = new Map();

  async acquireLock(key: string): Promise<boolean> {
    if (this.locks.get(key)) {
      return false; // Lock already held
    }
    this.locks.set(key, true);
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }
}
