import { PrismaClient } from "@prisma/client";
import { Sector } from "../../domain/entities";
import { SectorRepository } from "../../domain/ports/repositories";
import { validateDatabaseId } from "../utils/validation";

export class PrismaSectorRepository implements SectorRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Sector | null> {
    validateDatabaseId(id, "sector id");

    const sector = await this.prisma.sector.findUnique({
      where: { id },
    });

    if (!sector) {
      return null;
    }

    return this.toDomain(sector);
  }

  async findByRestaurantId(restaurantId: string): Promise<Sector[]> {
    validateDatabaseId(restaurantId, "restaurant id");

    const sectors = await this.prisma.sector.findMany({
      where: { restaurantId },
    });

    return sectors.map((s: any) => this.toDomain(s));
  }

  async save(sector: Sector): Promise<Sector> {
    const saved = await this.prisma.sector.upsert({
      where: { id: sector.id },
      update: {
        name: sector.name,
        restaurantId: sector.restaurantId,
        updatedAt: new Date(sector.updatedAt),
      },
      create: {
        id: sector.id,
        name: sector.name,
        restaurantId: sector.restaurantId,
        createdAt: new Date(sector.createdAt),
        updatedAt: new Date(sector.updatedAt),
      },
    });

    return this.toDomain(saved);
  }

  private toDomain(prismaSector: any): Sector {
    return {
      id: prismaSector.id,
      restaurantId: prismaSector.restaurantId,
      name: prismaSector.name,
      createdAt: prismaSector.createdAt.toISOString(),
      updatedAt: prismaSector.updatedAt.toISOString(),
    };
  }
}
