import { Sector } from "../../domain/entities";
import { SectorRepository } from "../../domain/ports/repositories";

export class InMemorySectorRepository implements SectorRepository {
  private sectors: Map<string, Sector> = new Map();

  async findById(id: string): Promise<Sector | null> {
    return this.sectors.get(id) || null;
  }

  async findByRestaurantId(restaurantId: string): Promise<Sector[]> {
    return Array.from(this.sectors.values()).filter(
      (sector) => sector.restaurantId === restaurantId
    );
  }

  async save(sector: Sector): Promise<Sector> {
    this.sectors.set(sector.id, sector);
    return sector;
  }
}
