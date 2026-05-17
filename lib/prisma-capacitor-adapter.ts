import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DriverAdapter, ResultSet, Query, Queryable } from '@prisma/driver-adapter-utils';

export class PrismaCapacitorSQLite implements DriverAdapter {
  readonly flavour = 'sqlite';

  constructor(private db: SQLiteDBConnection) {}

  async queryRaw(query: Query): Promise<ResultSet> {
    // Prisma usa '?' para los parámetros en SQLite, que coincide con Capacitor SQLite
    const result = await this.db.query(query.sql, query.args);
    
    // Mapear los resultados de Capacitor al formato esperado por Prisma
    const rows = result.values ?? [];
    const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columnNames,
      columnTypes: [], // Prisma puede inferir la mayoría de los tipos
      rows: rows as any[],
    };
  }

  async executeRaw(query: Query): Promise<number> {
    const result = await this.db.run(query.sql, query.args);
    // Retornar el número de filas afectadas
    return result.changes?.changes ?? 0;
  }

  async transactionContext(): Promise<Queryable> {
    // Capacitor SQLite maneja las transacciones a nivel de conexión
    // Para una implementación robusta, se podrían usar los métodos transaction del plugin
    return this;
  }
}
