import { query, execute, withTransaction } from '@/lib/db'
import type { CashSession, CashMovement } from '@/lib/types'
import { generateId } from '@/lib/utils'

export async function openCashSession(openingAmount: number): Promise<CashSession> {
  return withTransaction(async (db) => {
    const existing = await db.query('SELECT id FROM CashSession WHERE status = "open" LIMIT 1')
    if (existing.values && existing.values.length > 0) {
      throw new Error('Ya existe una sesión de caja abierta')
    }

    const id = generateId()
    const now = new Date().toISOString()
    
    await db.run(
      'INSERT INTO CashSession (id, openingAmount, status, salesTotal, prizesTotal, openedAt, createdAt, updatedAt) VALUES (?, ?, "open", 0, 0, ?, ?, ?)',
      [id, openingAmount, now, now, now]
    )

    const sessions = await db.query<CashSession>('SELECT * FROM CashSession WHERE id = ?', [id])
    return sessions.values![0]
  })
}

export async function getCurrentSession(): Promise<CashSession | null> {
  const sessions = await query<CashSession>('SELECT * FROM CashSession WHERE status = "open" LIMIT 1')
  if (sessions.length === 0) return null
  
  const session = sessions[0]
  session.movements = await query<CashMovement>(
    'SELECT * FROM CashMovement WHERE cashSessionId = ? ORDER BY createdAt DESC',
    [session.id]
  )
  
  return session
}

export async function closeCashSession(sessionId: string, notes?: string): Promise<CashSession> {
  return withTransaction(async (db) => {
    const sessionRows = await db.query('SELECT * FROM CashSession WHERE id = ?', [sessionId])
    if (!sessionRows.values || sessionRows.values.length === 0) throw new Error('Sesión no encontrada')
    const session = sessionRows.values[0] as CashSession

    if (session.status === 'closed') throw new Error('Esta sesión ya está cerrada')

    const summary = await getCashSummary(sessionId)
    const now = new Date().toISOString()
    
    await db.run(
      'UPDATE CashSession SET status = "closed", closingAmount = ?, closedAt = ?, notes = ?, updatedAt = ? WHERE id = ?',
      [summary.balance, now, notes, now, sessionId]
    )

    const closedSessions = await db.query('SELECT * FROM CashSession WHERE id = ?', [sessionId])
    const closedSession = closedSessions.values![0] as CashSession
    closedSession.movements = await query<CashMovement>(
      'SELECT * FROM CashMovement WHERE cashSessionId = ? ORDER BY createdAt DESC',
      [closedSession.id]
    )
    
    return closedSession
  })
}

export async function addCashMovement(data: {
  cashSessionId: string
  type: 'income' | 'expense'
  amount: number
  description: string
}): Promise<CashMovement> {
  return withTransaction(async (db) => {
    const id = generateId()
    const now = new Date().toISOString()
    
    await db.run(
      'INSERT INTO CashMovement (id, cashSessionId, type, amount, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.cashSessionId, data.type, data.amount, data.description, now]
    )

    const results = await db.query('SELECT * FROM CashMovement WHERE id = ?', [id])
    return results.values![0] as CashMovement
  })
}

export async function getCashSessions(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<CashSession[]> {
  let sql = 'SELECT * FROM CashSession'
  const params = []
  const where = []

  if (options?.startDate) {
    where.push('openedAt >= ?')
    params.push(options.startDate.toISOString())
  }
  if (options?.endDate) {
    where.push('openedAt <= ?')
    params.push(options.endDate.toISOString())
  }

  if (where.length > 0) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY openedAt DESC'
  if (options?.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }

  const sessions = await query<CashSession>(sql, params)
  for (const s of sessions) {
    s.movements = await query<CashMovement>('SELECT * FROM CashMovement WHERE cashSessionId = ?', [s.id])
  }
  return sessions
}

export async function getCashSessionById(id: string): Promise<CashSession | null> {
  const sessions = await query<CashSession>('SELECT * FROM CashSession WHERE id = ?', [id])
  if (sessions.length === 0) return null
  
  const session = sessions[0]
  session.movements = await query<CashMovement>(
    'SELECT * FROM CashMovement WHERE cashSessionId = ? ORDER BY createdAt DESC',
    [session.id]
  )
  
  return session
}

export async function getCashSummary(sessionId?: string): Promise<{
  openingAmount: number
  salesTotal: number
  prizesTotal: number
  incomeTotal: number
  expenseTotal: number
  balance: number
}> {
  const session = sessionId ? await getCashSessionById(sessionId) : await getCurrentSession()

  if (!session) {
    return { openingAmount: 0, salesTotal: 0, prizesTotal: 0, incomeTotal: 0, expenseTotal: 0, balance: 0 }
  }

  const incomeTotal = session.movements
    ?.filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0) || 0

  const expenseTotal = session.movements
    ?.filter(m => m.type === 'expense' && m.amount > 0)
    .reduce((sum, m) => sum + m.amount, 0) || 0

  const balance = session.openingAmount + session.salesTotal - session.prizesTotal + incomeTotal - expenseTotal

  return {
    openingAmount: session.openingAmount,
    salesTotal: session.salesTotal,
    prizesTotal: session.prizesTotal,
    incomeTotal,
    expenseTotal,
    balance
  }
}
