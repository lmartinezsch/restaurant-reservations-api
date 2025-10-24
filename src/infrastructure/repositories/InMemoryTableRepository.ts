import { Table } from "../../domain/entities";
import { TableRepository } from "../../domain/ports/repositories";

export class InMemoryTableRepository implements TableRepository {
  private tables: Map<string, Table> = new Map();

  async findById(id: string): Promise<Table | null> {
    return this.tables.get(id) || null;
  }

  async findBySectorId(sectorId: string): Promise<Table[]> {
    return Array.from(this.tables.values()).filter(
      (table) => table.sectorId === sectorId
    );
  }

  async save(table: Table): Promise<Table> {
    this.tables.set(table.id, table);
    return table;
  }
}
