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

  async getDb(): Promise<SQLiteDBConnection> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = this.initialize()
    return this.initPromise
  }

  private async initialize(): Promise<SQLiteDBConnection> {
    try {
      const sqlite = this.getSqlite()
      console.log('Iniciando conexión SQLite nativa...')
      
      const dbName = 'lotochoco_db'
      let db: SQLiteDBConnection
      
      // Comprobar si la conexión ya existe en el pool del plugin
      const isConn = await sqlite.isConnection(dbName, false)

      if (isConn.result) {
        // Si existe, la recuperamos
        db = await sqlite.retrieveConnection(dbName, false)
      } else {
        // Si no existe, la creamos
        db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false)
      }
      
      // Asegurarnos de que esté abierta
      const isOpen = await db.isDBOpen()
      if (!isOpen.result) {
        await db.open()
      }
      
      console.log('Conexión SQLite lista y abierta.')
      
      // Inicializar esquema si no existe
      await this.ensureSchema(db)
      
      this.db = db
      return db
    } catch (error) {
      this.initPromise = null // Permitir reintento si falló
      console.error('Error crítico inicializando base de datos:', error)
      throw error
    }
  }

  private async ensureSchema(db: SQLiteDBConnection) {
    try {
      const tableCheck = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Game';")
      if (!tableCheck.values || tableCheck.values.length === 0) {
        console.log('Configurando esquema inicial (Database First Run)...')
        const statements = [
          `CREATE TABLE IF NOT EXISTS "Game" ("id" TEXT PRIMARY KEY, "name" TEXT UNIQUE, "isActive" INTEGER DEFAULT 1, "digitCount" INTEGER DEFAULT 2, "multiplier" REAL DEFAULT 70, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "DrawSchedule" ("id" TEXT PRIMARY KEY, "gameId" TEXT, "name" TEXT, "time" TEXT, "isActive" INTEGER DEFAULT 1, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE);`,
          `CREATE TABLE IF NOT EXISTS "Ticket" ("id" TEXT PRIMARY KEY, "ticketNumber" TEXT UNIQUE, "client" TEXT, "totalAmount" REAL, "status" TEXT DEFAULT 'active', "cancelReason" TEXT, "cancelledAt" DATETIME, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "TicketItem" ("id" TEXT PRIMARY KEY, "ticketId" TEXT, "gameId" TEXT, "number" TEXT, "amount" REAL, "schedule" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE, FOREIGN KEY ("gameId") REFERENCES "Game" ("id"));`,
          `CREATE TABLE IF NOT EXISTS "Result" ("id" TEXT PRIMARY KEY, "gameId" TEXT, "scheduleId" TEXT, "winningNumber" TEXT, "drawDate" DATETIME DEFAULT CURRENT_TIMESTAMP, "isProcessed" INTEGER DEFAULT 0, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("gameId") REFERENCES "Game" ("id"), FOREIGN KEY ("scheduleId") REFERENCES "DrawSchedule" ("id"));`,
          `CREATE TABLE IF NOT EXISTS "Winner" ("id" TEXT PRIMARY KEY, "ticketId" TEXT, "resultId" TEXT, "prizeAmount" REAL, "isPaid" INTEGER DEFAULT 0, "paidAt" DATETIME, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id"), FOREIGN KEY ("resultId") REFERENCES "Result" ("id"));`,
          `CREATE TABLE IF NOT EXISTS "CashSession" ("id" TEXT PRIMARY KEY, "openingAmount" REAL, "closingAmount" REAL, "salesTotal" REAL DEFAULT 0, "prizesTotal" REAL DEFAULT 0, "status" TEXT DEFAULT 'open', "openedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "closedAt" DATETIME, "notes" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "CashMovement" ("id" TEXT PRIMARY KEY, "cashSessionId" TEXT, "type" TEXT, "amount" REAL, "description" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("cashSessionId") REFERENCES "CashSession" ("id") ON DELETE CASCADE);`,
          `CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT PRIMARY KEY, "key" TEXT UNIQUE, "value" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`,
          `CREATE TABLE IF NOT EXISTS "CancellationLog" ("id" TEXT PRIMARY KEY, "ticketId" TEXT, "ticketNumber" TEXT, "totalAmount" REAL, "reason" TEXT, "itemsJson" TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP);`
        ]
        await db.executeSet(statements.map(s => ({ statement: s, values: [] })))
        console.log('Esquema creado exitosamente.')
      }
    } catch (e) {
      console.error('Error al asegurar esquema:', e)
      throw e
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const db = await this.getDb()
      const result = await db.query(sql, params)
      return (result.values || []) as T[]
    } catch (e) {
      console.error('Error en consulta SQL:', sql, e)
      throw e
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const db = await this.getDb()
      return await db.run(sql, params)
    } catch (e) {
      console.error('Error en ejecución SQL:', sql, e)
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
