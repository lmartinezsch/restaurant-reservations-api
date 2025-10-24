import { Restaurant, Sector, Table } from "../../domain/entities";
import { InMemoryRestaurantRepository } from "../repositories/InMemoryRestaurantRepository";
import { InMemorySectorRepository } from "../repositories/InMemorySectorRepository";
import { InMemoryTableRepository } from "../repositories/InMemoryTableRepository";
import { logger } from "../logging/logger";

export async function seedData(
  restaurantRepo: InMemoryRestaurantRepository,
  sectorRepo: InMemorySectorRepository,
  tableRepo: InMemoryTableRepository
): Promise<void> {
  const now = new Date().toISOString();

  const restaurant: Restaurant = {
    id: "R1",
    name: "Restaurant Reservations Test Restaurant",
    timezone: "America/Argentina/Buenos_Aires",
    shifts: [
      { start: "12:00", end: "16:00" }, // Lunch shift
      { start: "20:00", end: "00:00" }, // Dinner shift
    ],
    createdAt: now,
    updatedAt: now,
  };
  await restaurantRepo.save(restaurant);

  const mainHall: Sector = {
    id: "S1",
    restaurantId: "R1",
    name: "Main Hall",
    createdAt: now,
    updatedAt: now,
  };
  await sectorRepo.save(mainHall);

  const terrace: Sector = {
    id: "S2",
    restaurantId: "R1",
    name: "Terrace",
    createdAt: now,
    updatedAt: now,
  };
  await sectorRepo.save(terrace);

  const tables: Table[] = [
    {
      id: "T1",
      sectorId: "S1",
      name: "Table 1",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T2",
      sectorId: "S1",
      name: "Table 2",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T3",
      sectorId: "S1",
      name: "Table 3",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T4",
      sectorId: "S1",
      name: "Table 4",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T5",
      sectorId: "S1",
      name: "Table 5",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T6",
      sectorId: "S1",
      name: "Table 6",
      minSize: 5,
      maxSize: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T7",
      sectorId: "S2",
      name: "Terrace 1",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T8",
      sectorId: "S2",
      name: "Terrace 2",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T9",
      sectorId: "S2",
      name: "Terrace 3",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "T10",
      sectorId: "S2",
      name: "Terrace 4",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const table of tables) {
    await tableRepo.save(table);
  }

  logger.info("✅ Seed data created successfully");
  logger.info(
    { restaurant: restaurant.name, restaurantId: restaurant.id },
    "Restaurant seeded"
  );
  logger.info({ sectors: [mainHall.name, terrace.name] }, "Sectors seeded");
  logger.info({ tableCount: tables.length }, "Tables seeded");
}
