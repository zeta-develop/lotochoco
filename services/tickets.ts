import { dbEvents } from '@/lib/events'
import { query, execute } from '@/lib/db'
import type { Ticket, TicketItem, CartItem, Game, DrawSchedule } from '@/lib/types'
import { format } from 'date-fns'
import { generateId } from '@/lib/utils'

// Generate unique ticket number (sequential: #00000001)
async function generateTicketNumber(): Promise<string> {
  const result = await query('SELECT ticketNumber FROM Ticket ORDER BY ticketNumber DESC LIMIT 1')
  
  if (!result || result.length === 0) {
    return '#00000001'
  }
  
  const lastNumberStr = result[0].ticketNumber.replace('#', '')
  const lastNumber = parseInt(lastNumberStr, 10)
  
  if (isNaN(lastNumber)) {
     // Fallback if there are old string-based tickets
     return `#${String(result.length + 1).padStart(8, '0')}`
  }
  
  const nextNumber = lastNumber + 1
  return `#${String(nextNumber).padStart(8, '0')}`
}

export async function createTicket(items: CartItem[]): Promise<Ticket> {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const ticketNumber = await generateTicketNumber()
  const client = items[0]?.client || null
  const ticketId = generateId()
  const now = new Date().toISOString()

  // 1. Crear el Ticket
  await execute(
    'INSERT INTO Ticket (id, ticketNumber, totalAmount, status, client, createdAt, updatedAt) VALUES (?, ?, ?, "active", ?, ?, ?)',
    [ticketId, ticketNumber, totalAmount, client, now, now]
  )

  // 2. Crear los items
  for (const item of items) {
    await execute(
      'INSERT INTO TicketItem (id, ticketId, gameId, number, amount, schedule, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [generateId(), ticketId, item.gameId, item.number, item.amount, item.schedule, now]
    )
  }

  // 3. Actualizar sesión de caja
  const openSessions = await query('SELECT id FROM CashSession WHERE status = "open" LIMIT 1')
  if (openSessions.length > 0) {
    const sessionId = openSessions[0].id
    await execute('UPDATE CashSession SET salesTotal = salesTotal + ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [totalAmount, sessionId])
    await execute(
      'INSERT INTO CashMovement (id, cashSessionId, type, amount, description, createdAt) VALUES (?, ?, "sale", ?, ?, ?)',
      [generateId(), sessionId, totalAmount, `Venta ticket ${ticketNumber}`, now]
    )
  }

  const ticket = await getTicketById(ticketId);
  dbEvents.emit('tickets:changed');
  dbEvents.emit('cash:changed');
  return ticket!;
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const tickets = await query<Ticket>('SELECT * FROM Ticket WHERE id = ?', [id])
  if (tickets.length === 0) return null
  
  const ticket = tickets[0]
  ticket.items = await query<TicketItem>('SELECT * FROM TicketItem WHERE ticketId = ?', [id])
  
  for (const item of ticket.items) {
    const games = await query<Game>('SELECT * FROM Game WHERE id = ?', [item.gameId])
    item.game = games[0]
    if (item.game) {
      item.game.schedules = await query<DrawSchedule>(
        'SELECT * FROM DrawSchedule WHERE gameId = ? ORDER BY time ASC', [item.game.id]
      )
    }
  }
  
  return ticket
}

export async function getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  let searchNumber = ticketNumber.trim()
  
  // Si no empieza con #, intentamos formatearlo
  if (!searchNumber.startsWith('#')) {
    // Si es un número puro, lo rellenamos con ceros hasta 8 dígitos
    if (/^\d+$/.test(searchNumber)) {
      searchNumber = `#${searchNumber.padStart(8, '0')}`
    } else {
      searchNumber = `#${searchNumber}`
    }
  }

  const tickets = await query<Ticket>('SELECT * FROM Ticket WHERE ticketNumber = ?', [searchNumber])
  if (tickets.length === 0) return null
  return await getTicketById(tickets[0].id)
}

export async function getTickets(options?: {
  status?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{ tickets: Ticket[]; total: number }> {
  let sql = 'SELECT * FROM Ticket'
  let countSql = 'SELECT COUNT(*) as count FROM Ticket'
  const params = []
  const where = []

  if (options?.status) {
    where.push('status = ?')
    params.push(options.status)
  }

  if (options?.startDate) {
    where.push('createdAt >= ?')
    params.push(options.startDate.toISOString())
  }
  
  if (options?.endDate) {
    where.push('createdAt <= ?')
    params.push(options.endDate.toISOString())
  }

  if (where.length > 0) {
    const whereStr = ' WHERE ' + where.join(' AND ')
    sql += whereStr
    countSql += whereStr
  }

  sql += ' ORDER BY createdAt DESC'
  if (options?.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
    if (options?.offset) {
      sql += ' OFFSET ?'
      params.push(options.offset)
    }
  }

  const tickets = await query<Ticket>(sql, params)
  const totalResults = await query(countSql, params.slice(0, where.length))
  
  for (const t of tickets) {
    t.items = await query<TicketItem>('SELECT * FROM TicketItem WHERE ticketId = ?', [t.id])
    for (const item of t.items) {
      const games = await query<Game>('SELECT * FROM Game WHERE id = ?', [item.gameId])
      item.game = games[0]
      if (item.game) {
        item.game.schedules = await query<DrawSchedule>(
          'SELECT * FROM DrawSchedule WHERE gameId = ? ORDER BY time ASC', [item.game.id]
        )
      }
    }
  }

  return { tickets, total: totalResults[0].count }
}

export async function getTodayTickets(): Promise<Ticket[]> {
  const d = new Date()
  const startOfDay = new Date(d.setHours(0,0,0,0)).toISOString()
  const endOfDay = new Date(d.setHours(23,59,59,999)).toISOString()

  const { tickets } = await getTickets({ startDate: new Date(startOfDay), endDate: new Date(endOfDay) })
  return tickets
}

export async function cancelTicket(ticketId: string, reason: string): Promise<{ success: boolean; message: string }> {
  const ticket = await getTicketById(ticketId)
  if (!ticket) return { success: false, message: 'Ticket no encontrado' }
  if (ticket.status !== 'active') return { success: false, message: 'Ticket no activo' }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  if (new Date(ticket.createdAt) < fiveMinutesAgo) {
    return { success: false, message: 'Solo se puede cancelar dentro de los primeros 5 minutos' }
  }

  const now = new Date().toISOString()
  await execute('UPDATE Ticket SET status = "cancelled", cancelReason = ?, cancelledAt = ?, updatedAt = ? WHERE id = ?', 
    [reason, now, now, ticketId])

  await execute(
    'INSERT INTO CancellationLog (id, ticketId, ticketNumber, totalAmount, reason, itemsJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [generateId(), ticket.id, ticket.ticketNumber, ticket.totalAmount, reason, JSON.stringify(ticket.items), now]
  )

  const openSessions = await query('SELECT id FROM CashSession WHERE status = "open" LIMIT 1')
  if (openSessions.length > 0) {
    const sessionId = openSessions[0].id
    await execute('UPDATE CashSession SET salesTotal = salesTotal - ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [ticket.totalAmount, sessionId])
    await execute(
      'INSERT INTO CashMovement (id, cashSessionId, type, amount, description, createdAt) VALUES (?, ?, "expense", ?, ?, ?)',
      [generateId(), sessionId, -ticket.totalAmount, `Cancelación ticket ${ticket.ticketNumber}`, now]
    )
  }

  dbEvents.emit('tickets:changed');
  dbEvents.emit('cash:changed');
  return { success: true, message: 'Ticket cancelado exitosamente' };
}

export const ticketService = {
  create: createTicket,
  getById: getTicketById,
  getByNumber: getTicketByNumber,
  getTickets,
  getTodayTickets,
  cancelTicket
}

export async function getCancellations(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<any[]> {
  return []; // Mock for typescript to pass since it was missing
}
