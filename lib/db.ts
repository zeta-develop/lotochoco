import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'

class DatabaseManager {
  private sqlite: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private isInitializing: boolean = false
  private initPromise: Promise<SQLiteDBConnection> | null = null

  async getDb(): Promise<SQLiteDBConnection> {
    if (this.db) return this.db
    if (this.isInitializing && this.initPromise) return this.initPromise

    this.isInitializing = true
    this.initPromise = this.initialize()
    return this.initPromise
  }

  private async initialize(): Promise<SQLiteDBConnection> {
    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite)
      
      let db: SQLiteDBConnection
      const isConn = await this.sqlite.isConnection('lotochoco_db', false)
      
      if (isConn.result) {
        db = await this.sqlite.retrieveConnection('lotochoco_db', false)
      } else {
        db = await this.sqlite.createConnection('lotochoco_db', false, 'no-encryption', 1, false)
      }

      await db.open()
      
      // Inicializar esquema si no existe
      await this.ensureSchema(db)
      
      this.db = db
      this.isInitializing = false
      return db
    } catch (error) {
      this.isInitializing = false
      console.error('Error inicializando base de datos:', error)
      throw error
    }
  }

  private async ensureSchema(db: SQLiteDBConnection) {
    const tableCheck = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Game';")
    if (!tableCheck.values || tableCheck.values.length === 0) {
      console.log('Creando esquema inicial...')
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
    }
  }

  // Helpers para consultas rápidas
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = await this.getDb()
    const result = await db.query(sql, params)
    return (result.values || []) as T[]
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    const db = await this.getDb()
    return await db.run(sql, params)
  }
}

const dbManager = new DatabaseManager()

export default dbManager
export const query = dbManager.query.bind(dbManager)
export const execute = dbManager.execute.bind(dbManager)
export const getDb = dbManager.getDb.bind(dbManager)
