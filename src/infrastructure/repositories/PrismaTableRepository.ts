import { PrismaClient } from "@prisma/client";
import { Table } from "../../domain/entities";
import { TableRepository } from "../../domain/ports/repositories";
import { validateDatabaseId } from "../utils/validation";

export class PrismaTableRepository implements TableRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Table | null> {
    validateDatabaseId(id, "table id");

    const table = await this.prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      return null;
    }

    return this.toDomain(table);
  }

  async findBySectorId(sectorId: string): Promise<Table[]> {
    validateDatabaseId(sectorId, "sector id");

    const tables = await this.prisma.table.findMany({
      where: { sectorId },
    });

    return tables.map((t: any) => this.toDomain(t));
  }

  async save(table: Table): Promise<Table> {
    const saved = await this.prisma.table.upsert({
      where: { id: table.id },
      update: {
        name: table.name,
        sectorId: table.sectorId,
        minSize: table.minSize,
        maxSize: table.maxSize,
        updatedAt: new Date(table.updatedAt),
      },
      create: {
        id: table.id,
        name: table.name,
        sectorId: table.sectorId,
        minSize: table.minSize,
        maxSize: table.maxSize,
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt),
      },
    });

    return this.toDomain(saved);
  }

  private toDomain(prismaTable: any): Table {
    return {
      id: prismaTable.id,
      sectorId: prismaTable.sectorId,
      name: prismaTable.name,
      minSize: prismaTable.minSize,
      maxSize: prismaTable.maxSize,
      createdAt: prismaTable.createdAt.toISOString(),
      updatedAt: prismaTable.updatedAt.toISOString(),
    };
  }
}
