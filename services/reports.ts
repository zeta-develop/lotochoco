import { query } from '@/lib/db'
import type { SalesReport } from '@/lib/types'

export async function getSalesReport(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<SalesReport> {
  const params = []
  let whereStr = " WHERE status = 'active'"
  
  if (options?.startDate) {
    whereStr += " AND createdAt >= ?"
    params.push(options.startDate.toISOString())
  }
  if (options?.endDate) {
    whereStr += " AND createdAt <= ?"
    params.push(options.endDate.toISOString())
  }

  // Ventas totales
  const salesResult = await query(`SELECT SUM(totalAmount) as totalSales, COUNT(*) as totalTickets FROM Ticket ${whereStr}`, params)
  
  // Premios totales
  let prizeWhereStr = ""
  const prizeParams = []
  if (options?.startDate || options?.endDate) {
    prizeWhereStr = " WHERE createdAt >= ? AND createdAt <= ?"
    prizeParams.push(options?.startDate?.toISOString() || '1970-01-01T00:00:00.000Z')
    prizeParams.push(options?.endDate?.toISOString() || new Date().toISOString())
  }

  const prizesResult = await query(`SELECT SUM(prizeAmount) as totalPrizes FROM Winner ${prizeWhereStr}`, prizeParams)
  
  // Premios pagados
  let paidWhereStr = prizeWhereStr ? prizeWhereStr + " AND isPaid = 1" : " WHERE isPaid = 1"
  const paidResult = await query(`SELECT SUM(prizeAmount) as totalPaid FROM Winner ${paidWhereStr}`, prizeParams)

  const totalSales = salesResult[0]?.totalSales || 0
  const totalTickets = salesResult[0]?.totalTickets || 0
  const totalPrizes = prizesResult[0]?.totalPrizes || 0
  const totalPaid = paidResult[0]?.totalPaid || 0
  const pendingPrizes = totalPrizes - totalPaid
  const netProfit = totalSales - totalPrizes

  return {
    totalSales,
    totalTickets,
    totalPrizes,
    totalPaid,
    pendingPrizes,
    netProfit
  }
}

export async function getDailyReport(date: Date): Promise<SalesReport> {
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)
  return getSalesReport({ startDate, endDate })
}

export async function getWeeklyReport(): Promise<{
  days: { date: string; sales: number; prizes: number }[]
  totals: SalesReport
}> {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const days = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const report = await getDailyReport(date)
    days.push({
      date: date.toISOString().split('T')[0],
      sales: report.totalSales,
      prizes: report.totalPrizes
    })
  }

  const totals = await getSalesReport({ startDate: weekAgo, endDate: today })
  return { days, totals }
}

export async function getGameReport(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<any[]> {
  const params = []
  let whereStr = " WHERE t.status = 'active'"
  
  if (options?.startDate) {
    whereStr += " AND t.createdAt >= ?"
    params.push(options.startDate.toISOString())
  }
  if (options?.endDate) {
    whereStr += " AND t.createdAt <= ?"
    params.push(options.endDate.toISOString())
  }

  const sql = `
    SELECT 
      g.id as gameId, 
      g.name as gameName, 
      COUNT(ti.id) as ticketCount, 
      SUM(ti.amount) as totalAmount
    FROM Game g
    LEFT JOIN TicketItem ti ON g.id = ti.gameId
    LEFT JOIN Ticket t ON ti.ticketId = t.id
    ${whereStr}
    GROUP BY g.id
  `
  
  const games = await query(sql, params)
  
  for (const g of games) {
    const prizes = await query(
      "SELECT SUM(prizeAmount) as prizesAmount FROM Winner w JOIN Result r ON w.resultId = r.id WHERE r.gameId = ?",
      [g.gameId]
    )
    g.prizesAmount = prizes[0]?.prizesAmount || 0
  }

  return games
}

export async function getNumberFrequency(options?: {
  gameId?: string
  limit?: number
}): Promise<{ number: string; frequency: number }[]> {
  let sql = "SELECT number, COUNT(*) as frequency FROM TicketItem"
  const params = []
  if (options?.gameId) {
    sql += " WHERE gameId = ?"
    params.push(options.gameId)
  }
  sql += " GROUP BY number ORDER BY frequency DESC"
  if (options?.limit) {
    sql += " LIMIT ?"
    params.push(options.limit)
  }
  return await query(sql, params)
}

export const reportService = {
  getSalesReport,
  getDailyReport,
  getWeeklyReport,
  getGameReport,
  getNumberFrequency
}
