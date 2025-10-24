import { Restaurant } from "../../domain/entities";
import { RestaurantRepository } from "../../domain/ports/repositories";

export class InMemoryRestaurantRepository implements RestaurantRepository {
  private restaurants: Map<string, Restaurant> = new Map();

  async findById(id: string): Promise<Restaurant | null> {
    return this.restaurants.get(id) || null;
  }

  async findAll(): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values());
  }

  async save(restaurant: Restaurant): Promise<Restaurant> {
    this.restaurants.set(restaurant.id, restaurant);
    return restaurant;
  }
}
