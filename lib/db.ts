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
      // Intentar recuperar una conexión existente o crear una nueva
      const db = await sqlite.createConnection('lotochoco_db', false, 'no-encryption', 1, false)
      await db.open()
      
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
