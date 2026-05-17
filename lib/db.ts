import { PrismaClient } from '@prisma/client'
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { PrismaCapacitorSQLite } from './prisma-capacitor-adapter'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

async function createPrismaClient() {
  // Si estamos en un entorno nativo (Android/iOS) con Capacitor
  if (Capacitor.isNativePlatform()) {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    try {
      console.log('Iniciando conexión SQLite nativa...')
      let db;
      const isConn = await sqlite.isConnection('lotochoco_db', false);
      if (isConn.result) {
        db = await sqlite.retrieveConnection('lotochoco_db', false);
      } else {
        db = await sqlite.createConnection('lotochoco_db', false, 'no-encryption', 1, false);
      }
      
      await db.open()
      console.log('Conexión SQLite abierta.')
      
      // Verificar si las tablas existen, si no, crearlas
      const tableCheck = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Game';")
      if (!tableCheck.values || tableCheck.values.length === 0) {
        console.log('Inicializando esquema de base de datos nativa (primera vez)...')
        
        // Usar executeSet para múltiples sentencias es más confiable
        const statements = [
          `CREATE TABLE IF NOT EXISTS "Game" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "name" TEXT NOT NULL,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "digitCount" INTEGER NOT NULL DEFAULT 2,
              "multiplier" REAL NOT NULL DEFAULT 70,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL
          );`,
          `CREATE TABLE IF NOT EXISTS "DrawSchedule" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "gameId" TEXT NOT NULL,
              "name" TEXT NOT NULL,
              "time" TEXT NOT NULL,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL,
              CONSTRAINT "DrawSchedule_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
          );`,
          `CREATE TABLE IF NOT EXISTS "Ticket" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "ticketNumber" TEXT NOT NULL,
              "client" TEXT,
              "totalAmount" REAL NOT NULL,
              "status" TEXT NOT NULL DEFAULT 'active',
              "cancelReason" TEXT,
              "cancelledAt" DATETIME,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL
          );`,
          `CREATE TABLE IF NOT EXISTS "TicketItem" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "ticketId" TEXT NOT NULL,
              "gameId" TEXT NOT NULL,
              "number" TEXT NOT NULL,
              "amount" REAL NOT NULL,
              "schedule" TEXT NOT NULL,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "TicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT "TicketItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );`,
          `CREATE TABLE IF NOT EXISTS "Result" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "gameId" TEXT NOT NULL,
              "scheduleId" TEXT NOT NULL,
              "winningNumber" TEXT NOT NULL,
              "drawDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "isProcessed" BOOLEAN NOT NULL DEFAULT false,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL,
              CONSTRAINT "Result_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
              CONSTRAINT "Result_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DrawSchedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );`,
          `CREATE TABLE IF NOT EXISTS "Winner" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "ticketId" TEXT NOT NULL,
              "resultId" TEXT NOT NULL,
              "prizeAmount" REAL NOT NULL,
              "isPaid" BOOLEAN NOT NULL DEFAULT false,
              "paidAt" DATETIME,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL,
              CONSTRAINT "Winner_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
              CONSTRAINT "Winner_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );`,
          `CREATE TABLE IF NOT EXISTS "CashSession" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "openingAmount" REAL NOT NULL,
              "closingAmount" REAL,
              "salesTotal" REAL NOT NULL DEFAULT 0,
              "prizesTotal" REAL NOT NULL DEFAULT 0,
              "status" TEXT NOT NULL DEFAULT 'open',
              "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "closedAt" DATETIME,
              "notes" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL
          );`,
          `CREATE TABLE IF NOT EXISTS "CashMovement" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "cashSessionId" TEXT NOT NULL,
              "type" TEXT NOT NULL,
              "amount" REAL NOT NULL,
              "description" TEXT NOT NULL,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "CashMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
          );`,
          `CREATE TABLE IF NOT EXISTS "Setting" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "key" TEXT NOT NULL,
              "value" TEXT NOT NULL,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL
          );`,
          `CREATE TABLE IF NOT EXISTS "CancellationLog" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "ticketId" TEXT NOT NULL,
              "ticketNumber" TEXT NOT NULL,
              "totalAmount" REAL NOT NULL,
              "reason" TEXT NOT NULL,
              "itemsJson" TEXT NOT NULL,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "Game_name_key" ON "Game"("name");`,
          `CREATE INDEX IF NOT EXISTS "Game_isActive_idx" ON "Game"("isActive");`,
          `CREATE INDEX IF NOT EXISTS "DrawSchedule_gameId_idx" ON "DrawSchedule"("gameId");`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "DrawSchedule_gameId_time_key" ON "DrawSchedule"("gameId", "time");`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");`,
          `CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");`,
          `CREATE INDEX IF NOT EXISTS "Ticket_createdAt_idx" ON "Ticket"("createdAt");`,
          `CREATE INDEX IF NOT EXISTS "TicketItem_ticketId_idx" ON "TicketItem"("ticketId");`,
          `CREATE INDEX IF NOT EXISTS "TicketItem_gameId_idx" ON "TicketItem"("gameId");`,
          `CREATE INDEX IF NOT EXISTS "TicketItem_number_idx" ON "TicketItem"("number");`,
          `CREATE INDEX IF NOT EXISTS "Result_drawDate_idx" ON "Result"("drawDate");`,
          `CREATE INDEX IF NOT EXISTS "Result_gameId_idx" ON "Result"("gameId");`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "Result_gameId_scheduleId_drawDate_key" ON "Result"("gameId", "scheduleId", "drawDate");`,
          `CREATE INDEX IF NOT EXISTS "Winner_ticketId_idx" ON "Winner"("ticketId");`,
          `CREATE INDEX IF NOT EXISTS "Winner_resultId_idx" ON "Winner"("resultId");`,
          `CREATE INDEX IF NOT EXISTS "Winner_isPaid_idx" ON "Winner"("isPaid");`,
          `CREATE INDEX IF NOT EXISTS "CashSession_status_idx" ON "CashSession"("status");`,
          `CREATE INDEX IF NOT EXISTS "CashSession_openedAt_idx" ON "CashSession"("openedAt");`,
          `CREATE INDEX IF NOT EXISTS "CashMovement_cashSessionId_idx" ON "CashMovement"("cashSessionId");`,
          `CREATE INDEX IF NOT EXISTS "CashMovement_type_idx" ON "CashMovement"("type");`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");`,
          `CREATE INDEX IF NOT EXISTS "CancellationLog_createdAt_idx" ON "CancellationLog"("createdAt");`
        ];
        
        // executeSet envia todas las sentencias en una sola transacción
        await db.executeSet(statements.map(s => ({ statement: s, values: [] })));
        console.log('Esquema de base de datos inicializado con éxito.');
      }
      
      const adapter = new PrismaCapacitorSQLite(db)
      return new PrismaClient({ adapter })
    } catch (e) {
      console.error('Error inicializando SQLite nativo para Prisma:', e)
      // Fallback a cliente normal si algo falla (aunque probablemente falle en móvil)
      return new PrismaClient()
    }
  }

  // Si estamos en la web o desarrollo, usamos el cliente normal (Node.js)
  return new PrismaClient()
}

// Inicialización asíncrona para el cliente global
export const prismaPromise = globalForPrisma.prisma 
  ? Promise.resolve(globalForPrisma.prisma) 
  : createPrismaClient().then(client => {
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
      return client
    })

// Exportar un proxy o función para facilitar el acceso
export const getPrisma = () => prismaPromise

export default getPrisma
