import { v4 as uuidv4 } from "uuid";
import { Restaurant, Sector, Table } from "../../domain/entities";
import {
  RestaurantRepository,
  SectorRepository,
  TableRepository,
} from "../../domain/ports/repositories";
import { logger } from "../logging/logger";

export async function seedData(
  restaurantRepo: RestaurantRepository,
  sectorRepo: SectorRepository,
  tableRepo: TableRepository
): Promise<void> {
  const now = new Date().toISOString();

  const restaurant: Restaurant = {
    id: uuidv4(),
    name: "Restaurant Reservations Test Restaurant",
    timezone: "America/Argentina/Buenos_Aires",
    shifts: [
      { start: "12:00", end: "16:00" }, // Lunch shift
      { start: "20:00", end: "00:00" }, // Dinner shift
    ],
    createdAt: now,
    updatedAt: now,
  };
  const savedRestaurant = await restaurantRepo.save(restaurant);

  const mainHall: Sector = {
    id: uuidv4(),
    restaurantId: savedRestaurant.id,
    name: "Main Hall",
    createdAt: now,
    updatedAt: now,
  };
  const savedMainHall = await sectorRepo.save(mainHall);

  const terrace: Sector = {
    id: uuidv4(),
    restaurantId: savedRestaurant.id,
    name: "Terrace",
    createdAt: now,
    updatedAt: now,
  };
  const savedTerrace = await sectorRepo.save(terrace);

  const tables: Table[] = [
    {
      id: uuidv4(),
      sectorId: savedMainHall.id,
      name: "Table 1",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedMainHall.id,
      name: "Table 2",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedMainHall.id,
      name: "Table 3",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedMainHall.id,
      name: "Table 4",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedMainHall.id,
      name: "Table 5",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedMainHall.id,
      name: "Table 6",
      minSize: 5,
      maxSize: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedTerrace.id,
      name: "Terrace 1",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedTerrace.id,
      name: "Terrace 2",
      minSize: 1,
      maxSize: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedTerrace.id,
      name: "Terrace 3",
      minSize: 3,
      maxSize: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      sectorId: savedTerrace.id,
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
    { restaurant: savedRestaurant.name, restaurantId: savedRestaurant.id },
    "Restaurant seeded"
  );
  logger.info(
    { sectors: [savedMainHall.name, savedTerrace.name] },
    "Sectors seeded"
  );
  logger.info({ tableCount: tables.length }, "Tables seeded");
}
