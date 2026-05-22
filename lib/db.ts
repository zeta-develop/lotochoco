import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'

class DatabaseManager {
  private sqlite: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private initPromise: Promise<SQLiteDBConnection> | null = null

  private getSqlite(): SQLiteConnection {
    if (!this.sqlite) {
      this.sqlite = new SQLiteConnection(CapacitorSQLite)
    }
    return this.sqlite
  }

  /**
   * Obtiene la conexión a la base de datos de forma segura (Singleton)
   */
  async getDb(): Promise<SQLiteDBConnection> {
    // 1. Si ya tenemos una conexión abierta y lista, la devolvemos
    if (this.db) {
      try {
        const isOpen = await this.db.isDBOpen()
        if (isOpen.result) return this.db
      } catch (e) {
        // Si hay error al verificar, limpiamos y reintentamos
        this.db = null
      }
    }

    // 2. Si hay una inicialización en curso, esperamos a esa misma promesa
    if (this.initPromise) {
      return this.initPromise
    }

    // 3. Si no hay nada, iniciamos el proceso y guardamos la promesa
    this.initPromise = this.initialize()
    return this.initPromise
  }

  private async initialize(): Promise<SQLiteDBConnection> {
    const dbName = 'lotochoco_db'
    console.log(`[DB] Iniciando proceso de conexión para: ${dbName}`)

    try {
      const sqlite = this.getSqlite()
      let db: SQLiteDBConnection

      // En Capacitor SQLite, la forma más robusta de evitar el error "connection exist"
      // es intentar recuperarla primero del pool interno del plugin.
      try {
        const isConn = await sqlite.isConnection(dbName, false)
        if (isConn.result) {
          console.log('[DB] Recuperando conexión existente del pool...')
          db = await sqlite.retrieveConnection(dbName, false)
        } else {
          console.log('[DB] Creando nueva conexión...')
          db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false)
        }
      } catch (poolError) {
        console.warn('[DB] Fallo en gestión de pool, reintentando recuperación directa...', poolError)
        // Último recurso: intentar recuperar aunque isConnection fallara
        db = await sqlite.retrieveConnection(dbName, false)
      }

      // Asegurarnos de abrirla si está cerrada
      const isOpen = await db.isDBOpen()
      if (!isOpen.result) {
        await db.open()
        console.log('[DB] Base de datos abierta correctamente.')
      }

      // Sincronizar esquema
      await this.ensureSchema(db)

      this.db = db
      this.initPromise = null // Limpiamos para futuros chequeos si se desea
      return db
    } catch (error) {
      this.initPromise = null // Permitir reintentos en caso de fallo real
      console.error('[DB] ERROR CRÍTICO:', error)
      throw error
    }
  }

  private async ensureSchema(db: SQLiteDBConnection) {
    try {
      const tableCheck = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Game';")
      if (!tableCheck.values || tableCheck.values.length === 0) {
        console.log('[DB] Configurando tablas iniciales...')
        const statements = [
          `CREATE TABLE IF NOT EXISTS "Game" ("id" TEXT PRIMARY KEY, "name" TEXT UNIQUE, "isActive" INTEGER DEFAULT 1, "digitCount" INTEGER DEFAULT 2, "multiplier" REAL DEFAULT 70, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "isDirty" INTEGER DEFAULT 1, "deletedAt" DATETIME);`,
          `CREATE TABLE IF NOT EXISTS "DrawSchedule" ("id" TEXT PRIMARY KEY, "gameId" TEXT, "name" TEXT, "time" TEXT, "isActive" INTEGER DEFAULT 1, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "isDirty" INTEGER DEFAULT 1, "deletedAt" DATETIME, FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE);`,
          `CREATE TABLE IF NOT EXISTS "Ticket" ("id" TEXT PRIMARY KEY, "ticketNumber" TEXT UNIQUE, "client" TEXT, "totalAmount" REAL, "status" TEXT DEFAULT 'active', "cancelReason" TEXT, "cancelledAt" DATETIME, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "TicketItem" ("id" TEXT PRIMARY KEY, "ticketId" TEXT, "gameId" TEXT, "number" TEXT, "amount" REAL, "schedule" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE, FOREIGN KEY ("gameId") REFERENCES "Game" ("id"));`,
          `CREATE TABLE IF NOT EXISTS "Result" ("id" TEXT PRIMARY KEY, "gameId" TEXT, "scheduleId" TEXT, "winningNumber" TEXT, "drawDate" DATETIME DEFAULT CURRENT_TIMESTAMP, "isProcessed" INTEGER DEFAULT 0, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "isDirty" INTEGER DEFAULT 1, "deletedAt" DATETIME, FOREIGN KEY ("gameId") REFERENCES "Game" ("id"), FOREIGN KEY ("scheduleId") REFERENCES "DrawSchedule" ("id"));`,
          `CREATE TABLE IF NOT EXISTS "Winner" ("id" TEXT PRIMARY KEY, "ticketId" TEXT, "resultId" TEXT, "prizeAmount" REAL, "isPaid" INTEGER DEFAULT 0, "paidAt" DATETIME, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id"), FOREIGN KEY ("resultId") REFERENCES "Result" ("id"));`,
          `CREATE TABLE IF NOT EXISTS "CashSession" ("id" TEXT PRIMARY KEY, "openingAmount" REAL, "closingAmount" REAL, "salesTotal" REAL DEFAULT 0, "prizesTotal" REAL DEFAULT 0, "status" TEXT DEFAULT 'open', "openedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "closedAt" DATETIME, "notes" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "CashMovement" ("id" TEXT PRIMARY KEY, "cashSessionId" TEXT, "type" TEXT, "amount" REAL, "description" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("cashSessionId") REFERENCES "CashSession" ("id") ON DELETE CASCADE);`,
          `CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT PRIMARY KEY, "key" TEXT UNIQUE, "value" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "CancellationLog" ("id" TEXT PRIMARY KEY, "ticketId" TEXT, "ticketNumber" TEXT, "totalAmount" REAL, "reason" TEXT, "itemsJson" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "SyncState" ("tableName" TEXT PRIMARY KEY, "lastSync" DATETIME DEFAULT '1970-01-01T00:00:00.000Z');`
        ]
        await db.executeSet(statements.map(s => ({ statement: s, values: [] })))
        console.log('[DB] Esquema sincronizado con éxito.')
      } else {
        // Migración: Añadir columnas a tablas existentes si no las tienen
        console.log('[DB] Comprobando actualizaciones de esquema (Migraciones)...')
        try {
          // Usamos bloques try-catch individuales para que si una columna ya existe, no detenga las demás
          await db.execute(`ALTER TABLE "Game" ADD COLUMN "isDirty" INTEGER DEFAULT 1;`).catch(() => {});
          await db.execute(`ALTER TABLE "Game" ADD COLUMN "deletedAt" DATETIME;`).catch(() => {});

          await db.execute(`ALTER TABLE "DrawSchedule" ADD COLUMN "isDirty" INTEGER DEFAULT 1;`).catch(() => {});
          await db.execute(`ALTER TABLE "DrawSchedule" ADD COLUMN "deletedAt" DATETIME;`).catch(() => {});

          await db.execute(`ALTER TABLE "Result" ADD COLUMN "isDirty" INTEGER DEFAULT 1;`).catch(() => {});
          await db.execute(`ALTER TABLE "Result" ADD COLUMN "deletedAt" DATETIME;`).catch(() => {});

          await db.execute(`CREATE TABLE IF NOT EXISTS "SyncState" ("tableName" TEXT PRIMARY KEY, "lastSync" DATETIME DEFAULT '1970-01-01T00:00:00.000Z');`).catch(() => {});
        } catch (migErr) {
          console.warn('[DB] Alguna migración general falló:', migErr);
        }
      }
    } catch (e) {
      console.error('[DB] Error en ensureSchema:', e)
      throw e
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const db = await this.getDb()
      const result = await db.query(sql, params)
      return (result.values || []) as T[]
    } catch (e) {
      console.error(`[DB] Error en Query: ${sql}`, e)
      throw e
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const db = await this.getDb()
      return await db.run(sql, params)
    } catch (e) {
      console.error(`[DB] Error en Execute: ${sql}`, e)
      throw e
    }
  }

  async getSqliteConnection(): Promise<SQLiteConnection> {
    return this.getSqlite()
  }
}

const dbManager = new DatabaseManager()

export default dbManager
export const query = dbManager.query.bind(dbManager)
export const execute = dbManager.execute.bind(dbManager)
export const getDb = dbManager.getDb.bind(dbManager)
export const getSqliteConnection = dbManager.getSqliteConnection.bind(dbManager)
