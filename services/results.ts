import { query, execute } from '@/lib/db'
import type { Result, Winner, Game, DrawSchedule } from '@/lib/types'
import { generateId } from '@/lib/utils'

export async function createResult(data: {
  gameId: string
  scheduleId: string
  winningNumber: string
  drawDate?: Date
}): Promise<Result> {
  const id = generateId()
  const drawDate = data.drawDate || new Date()
  
  await execute(
    'INSERT INTO "Result" (id, gameId, scheduleId, winningNumber, drawDate, isProcessed) VALUES (?, ?, ?, ?, ?, 0)',
    [id, data.gameId, data.scheduleId, data.winningNumber, drawDate.toISOString()]
  )

  const results = await query<Result>('SELECT * FROM "Result" WHERE id = ?', [id])
  const result = results[0]
  
  // Incluir relaciones
  const games = await query<Game>('SELECT * FROM "Game" WHERE id = ?', [result.gameId])
  result.game = games[0]
  
  const schedules = await query<DrawSchedule>('SELECT * FROM "DrawSchedule" WHERE id = ?', [result.scheduleId])
  result.schedule = schedules[0]
  
  return result
}

export async function processResult(resultId: string): Promise<{
  winnersCount: number
  totalPrizes: number
}> {
  const results = await query<Result>('SELECT * FROM "Result" WHERE id = ?', [resultId])
  const result = results[0]

  if (!result) throw new Error('Resultado no encontrado')
  if (Boolean(result.isProcessed)) throw new Error('Este resultado ya fue procesado')

  const schedules = await query<DrawSchedule>('SELECT * FROM "DrawSchedule" WHERE id = ?', [result.scheduleId])
  const schedule = schedules[0]
  
  const games = await query<Game>('SELECT * FROM "Game" WHERE id = ?', [result.gameId])
  const game = games[0]

  // Rango de fecha para el sorteo (mismo día)
  const d = new Date(result.drawDate)
  const startOfDay = new Date(new Date(d).setHours(0,0,0,0)).toISOString()
  const endOfDay = new Date(new Date(d).setHours(23,59,59,999)).toISOString()

  // Buscar items ganadores
  const matchingItems = await query<any>(
    `SELECT ti.*, t.ticketNumber 
     FROM TicketItem ti
     JOIN Ticket t ON ti.ticketId = t.id
     WHERE ti.gameId = ? AND ti.schedule = ? AND ti.number = ?
     AND t.status = 'active' AND t.createdAt >= ? AND t.createdAt <= ?`,
    [result.gameId, schedule.time, result.winningNumber, startOfDay, endOfDay]
  )

  let totalPrizes = 0
  for (const item of matchingItems) {
    const prizeAmount = item.amount * game.multiplier
    totalPrizes += prizeAmount

    await execute(
      'INSERT INTO "Winner" (id, ticketId, resultId, prizeAmount, isPaid) VALUES (?, ?, ?, ?, 0)',
      [generateId(), item.ticketId, result.id, prizeAmount]
    )
  }

  await execute('UPDATE "Result" SET isProcessed = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [resultId])

  return {
    winnersCount: matchingItems.length,
    totalPrizes
  }
}

export async function getTodayResults(): Promise<Result[]> {
  try {
    const d = new Date()
    const startOfDay = new Date(new Date(d).setHours(0,0,0,0)).toISOString()
    const endOfDay = new Date(new Date(d).setHours(23,59,59,999)).toISOString()

    console.log(`Buscando resultados entre ${startOfDay} y ${endOfDay}`)

    const results = await query<Result>(
      'SELECT * FROM "Result" WHERE drawDate >= ? AND drawDate <= ? ORDER BY drawDate DESC',
      [startOfDay, endOfDay]
    )

    console.log(`Se encontraron ${results.length} resultados`)

    for (const r of results) {
      r.isProcessed = Boolean(r.isProcessed)
      const games = await query<Game>('SELECT * FROM "Game" WHERE id = ?', [r.gameId])
      r.game = games[0]
      const schedules = await query<DrawSchedule>('SELECT * FROM "DrawSchedule" WHERE id = ?', [r.scheduleId])
      r.schedule = schedules[0]
    }

    return results
  } catch (error) {
    console.error('Error detallado en getTodayResults:', error)
    throw error
  }
}

export async function getWinners(options?: { isPaid?: boolean }): Promise<Winner[]> {
  let sql = 'SELECT * FROM Winner'
  const params = []
  
  if (options?.isPaid !== undefined) {
    sql += ' WHERE isPaid = ?'
    params.push(options.isPaid ? 1 : 0)
  }
  
  sql += ' ORDER BY createdAt DESC'
  
  const winners = await query<Winner>(sql, params)
  for (const w of winners) {
    w.isPaid = Boolean(w.isPaid)
    const tickets = await query<any>('SELECT * FROM Ticket WHERE id = ?', [w.ticketId])
    w.ticket = tickets[0]
    const results = await query<any>('SELECT * FROM Result WHERE id = ?', [w.resultId])
    w.result = results[0]
  }
  
  return winners
}

export async function markWinnerAsPaid(winnerId: string): Promise<void> {
  await execute('UPDATE Winner SET isPaid = 1, paidAt = CURRENT_TIMESTAMP WHERE id = ?', [winnerId])
  
  // Actualizar sesión de caja (simplificado para este ejemplo)
  const session = await query('SELECT id FROM CashSession WHERE status = "open" LIMIT 1')
  if (session.length > 0) {
    const winner = (await query<Winner>('SELECT prizeAmount FROM Winner WHERE id = ?', [winnerId]))[0]
    await execute('UPDATE CashSession SET prizesTotal = prizesTotal + ? WHERE id = ?', [winner.prizeAmount, session[0].id])
  }
}
