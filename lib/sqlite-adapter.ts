// Adapter to migrate localStorage JSON into a simple key/value SQLite table
// Uses @capacitor-community/sqlite when available on device. Safe to import in browser/server.
const STORAGE_KEY = 'lotochoco.offline.v1'

async function tryImportSqlite() {
  try {
    // dynamic import so Node/SSR builds won't fail
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>
    const mod = await dynamicImport('@capacitor-community/sqlite')
    return mod
  } catch (e) {
    return null
  }
}

export async function isSQLiteAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const mod = await tryImportSqlite()
  if (!mod) return false
  try {
    // plugin may expose CapacitorSQLite or SQLiteConnection
    return true
  } catch {
    return false
  }
}

export async function migrateLocalStorageToSQLite(): Promise<void> {
  if (typeof window === 'undefined') return

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return

  const mod = await tryImportSqlite()
  if (!mod) return

  try {
    // Prefer exported SQLiteConnection if available
    const { SQLiteConnection, CapacitorSQLite } = mod as any
    let sqliteConn: any
    if (SQLiteConnection) {
      sqliteConn = new SQLiteConnection(CapacitorSQLite)
      const db = await sqliteConn.createConnection('lotochoco_db', false, 'no-encryption', 1)
      await db.open()
      // create a simple key/value table
      await db.execute({ statements: `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);` })
      // insert or replace the STORAGE_KEY
      await db.run({ statements: `INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);`, values: [STORAGE_KEY, raw] })
      await sqliteConn.closeConnection('lotochoco_db')
    } else if (CapacitorSQLite && CapacitorSQLite.open) {
      // older shape: use CapacitorSQLite directly
      await CapacitorSQLite.open({ database: 'lotochoco_db' })
      await CapacitorSQLite.execute({ statements: `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);` })
      await CapacitorSQLite.run({ statements: `INSERT OR REPLACE INTO kv (key, value) VALUES ('${STORAGE_KEY}', ?);`, values: [raw] })
      await CapacitorSQLite.close({ database: 'lotochoco_db' })
    }
  } catch (e) {
    // ignore migration failures — keep using localStorage fallback
    // console.debug('SQLite migration failed', e)
  }
}

export async function readStateFromSQLite(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const mod = await tryImportSqlite()
  if (!mod) return null
  try {
    const { SQLiteConnection, CapacitorSQLite } = mod as any
    if (SQLiteConnection) {
      const sqliteConn = new SQLiteConnection(CapacitorSQLite)
      const db = await sqliteConn.createConnection('lotochoco_db', false, 'no-encryption', 1)
      await db.open()
      const res = await db.query(`SELECT value FROM kv WHERE key = ?;`, [STORAGE_KEY])
      await sqliteConn.closeConnection('lotochoco_db')
      if (res && res.values && res.values[0] && res.values[0].value) return res.values[0].value as string
      return null
    } else if (CapacitorSQLite && CapacitorSQLite.query) {
      await CapacitorSQLite.open({ database: 'lotochoco_db' })
      const q = await CapacitorSQLite.query({ statement: `SELECT value FROM kv WHERE key = '${STORAGE_KEY}';` })
      await CapacitorSQLite.close({ database: 'lotochoco_db' })
      if (q && q.values && q.values[0] && q.values[0].value) return q.values[0].value as string
      return null
    }
  } catch {
    return null
  }

  return null
}

export async function writeStateToSQLite(json: string): Promise<void> {
  if (typeof window === 'undefined') return
  const mod = await tryImportSqlite()
  if (!mod) return
  try {
    const { SQLiteConnection, CapacitorSQLite } = mod as any
    if (SQLiteConnection) {
      const sqliteConn = new SQLiteConnection(CapacitorSQLite)
      const db = await sqliteConn.createConnection('lotochoco_db', false, 'no-encryption', 1)
      await db.open()
      await db.execute({ statements: `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);` })
      await db.run({ statements: `INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);`, values: [STORAGE_KEY, json] })
      await sqliteConn.closeConnection('lotochoco_db')
    } else if (CapacitorSQLite && CapacitorSQLite.run) {
      await CapacitorSQLite.open({ database: 'lotochoco_db' })
      await CapacitorSQLite.execute({ statements: `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);` })
      await CapacitorSQLite.run({ statements: `INSERT OR REPLACE INTO kv (key, value) VALUES ('${STORAGE_KEY}', ?);`, values: [json] })
      await CapacitorSQLite.close({ database: 'lotochoco_db' })
    }
  } catch (e) {
    // ignore errors
  }
}

export default {
  isSQLiteAvailable,
  migrateLocalStorageToSQLite,
  readStateFromSQLite,
  writeStateToSQLite,
}
