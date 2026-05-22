import { dbEvents } from '@/lib/events'
import { query, execute } from '@/lib/db'
import type { CashSession, CashMovement } from '@/lib/types'
import { generateId } from '@/lib/utils'

export async function openCashSession(openingAmount: number): Promise<CashSession> {
  // Check if there's already an open session
  const existing = await query('SELECT id FROM CashSession WHERE status = "open" LIMIT 1')
  if (existing.length > 0) throw new Error('Ya existe una sesión de caja abierta')

  const id = generateId()
  const now = new Date().toISOString()
  
  await execute(
    'INSERT INTO CashSession (id, openingAmount, status, salesTotal, prizesTotal, openedAt, createdAt, updatedAt) VALUES (?, ?, "open", 0, 0, ?, ?, ?)',
    [id, openingAmount, now, now, now]
  )

  const retSession = await getCashSessionById(id);
  dbEvents.emit('cash:changed');
  return retSession!;
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
  const session = await getCashSessionById(sessionId)
  if (!session) throw new Error('Sesión no encontrada')
  if (session.status === 'closed') throw new Error('Esta sesión ya está cerrada')

  const summary = await getCashSummary(sessionId)
  const now = new Date().toISOString()
  
  await execute(
    'UPDATE CashSession SET status = "closed", closingAmount = ?, closedAt = ?, notes = ?, updatedAt = ? WHERE id = ?',
    [summary.balance, now, notes, now, sessionId]
  )

  const retSession = await getCashSessionById(sessionId);
  dbEvents.emit('cash:changed');
  return retSession!;
}

export async function addCashMovement(data: {
  cashSessionId: string
  type: 'income' | 'expense'
  amount: number
  description: string
}): Promise<CashMovement> {
  const id = generateId()
  const now = new Date().toISOString()
  
  await execute(
    'INSERT INTO CashMovement (id, cashSessionId, type, amount, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.cashSessionId, data.type, data.amount, data.description, now]
  )

  const results = await query<CashMovement>('SELECT * FROM CashMovement WHERE id = ?', [id])
  return results[0]
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

  if (sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id)
    const placeholders = sessionIds.map(() => '?').join(', ')
    const movements = await query<CashMovement>(
      `SELECT * FROM CashMovement WHERE cashSessionId IN (${placeholders})`,
      sessionIds
    )

    const movementsBySessionId = movements.reduce((acc, m) => {
      if (!acc[m.cashSessionId]) acc[m.cashSessionId] = []
      acc[m.cashSessionId].push(m)
      return acc
    }, {} as Record<string, CashMovement[]>)

    for (const s of sessions) {
      s.movements = movementsBySessionId[s.id] || []
    }
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
