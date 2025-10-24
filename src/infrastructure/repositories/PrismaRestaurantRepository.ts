import { PrismaClient } from "@prisma/client";
import { Restaurant } from "../../domain/entities";
import { RestaurantRepository } from "../../domain/ports/repositories";

export class PrismaRestaurantRepository implements RestaurantRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Restaurant | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      return null;
    }

    return this.toDomain(restaurant);
  }

  async findAll(): Promise<Restaurant[]> {
    const restaurants = await this.prisma.restaurant.findMany();
    return restaurants.map((r: any) => this.toDomain(r));
  }

  async save(restaurant: Restaurant): Promise<Restaurant> {
    const saved = await this.prisma.restaurant.upsert({
      where: { id: restaurant.id },
      update: {
        name: restaurant.name,
        timezone: restaurant.timezone,
        shifts: restaurant.shifts as any,
        updatedAt: new Date(restaurant.updatedAt),
      },
      create: {
        id: restaurant.id,
        name: restaurant.name,
        timezone: restaurant.timezone,
        shifts: restaurant.shifts as any,
        createdAt: new Date(restaurant.createdAt),
        updatedAt: new Date(restaurant.updatedAt),
      },
    });

    return this.toDomain(saved);
  }

  private toDomain(prismaRestaurant: any): Restaurant {
    return {
      id: prismaRestaurant.id,
      name: prismaRestaurant.name,
      timezone: prismaRestaurant.timezone,
      shifts: prismaRestaurant.shifts as
        | Array<{ start: string; end: string }>
        | undefined,
      createdAt: prismaRestaurant.createdAt.toISOString(),
      updatedAt: prismaRestaurant.updatedAt.toISOString(),
    };
  }
}
