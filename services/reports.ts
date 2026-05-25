import type { SalesReport } from '@/lib/types'
import { supabase } from '@/lib/supabase/client'

export async function getSalesReport(options?: { startDate?: Date; endDate?: Date }): Promise<SalesReport> {
  let ticketsQuery = supabase.from('tickets').select('total_amount').eq('status', 'active')
  if (options?.startDate) ticketsQuery = ticketsQuery.gte('created_at', options.startDate.toISOString())
  if (options?.endDate) ticketsQuery = ticketsQuery.lte('created_at', options.endDate.toISOString())
  const { data: tickets } = await ticketsQuery
  const totalSales = tickets ? tickets.reduce((sum, t) => sum + (t.total_amount || 0), 0) : 0
  const totalTickets = tickets ? tickets.length : 0
  let winnersQuery = supabase.from('winners').select('prize_amount, is_paid')
  if (options?.startDate) winnersQuery = winnersQuery.gte('created_at', options.startDate.toISOString())
  if (options?.endDate) winnersQuery = winnersQuery.lte('created_at', options.endDate.toISOString())
  const { data: winners } = await winnersQuery
  let totalPrizes = 0; let totalPaid = 0;
  if (winners) {
      for (const w of winners) {
          totalPrizes += (w.prize_amount || 0)
          if (w.is_paid === 1 || w.is_paid === true) { totalPaid += (w.prize_amount || 0) }
      }
  }
  const pendingPrizes = totalPrizes - totalPaid
  const netProfit = totalSales - totalPrizes
  return { totalSales, totalTickets, totalPrizes, totalPaid, pendingPrizes, netProfit }
}

export async function getHotColdNumbers(options?: { gameId?: string; limit?: number }): Promise<{ number: string; frequency: number; type: 'hot' | 'cold' }[]> {
  let query = supabase.from('results').select('winning_number')
  if (options?.gameId) { query = query.eq('game_id', options.gameId) }
  const { data: results } = await query
  if (!results || results.length === 0) return []
  const freqs: Record<string, number> = {}
  for (const r of results) { if (!r.winning_number) continue; freqs[r.winning_number] = (freqs[r.winning_number] || 0) + 1 }
  const sorted = Object.entries(freqs).map(([num, count]) => ({ number: num, frequency: count })).sort((a, b) => b.frequency - a.frequency)
  const limit = options?.limit || 5
  const hot = sorted.slice(0, limit).map(n => ({ ...n, type: 'hot' as const }))
  const cold = sorted.slice(-limit).reverse().map(n => ({ ...n, type: 'cold' as const }))
  return [...hot, ...cold]
}

export async function getGameStats(options?: { startDate?: Date; endDate?: Date }): Promise<any[]> {
  let ticketsQuery = supabase.from('ticket_items').select(`amount, game_id, games (name)`)
  if (options?.startDate) ticketsQuery = ticketsQuery.gte('created_at', options.startDate.toISOString())
  if (options?.endDate) ticketsQuery = ticketsQuery.lte('created_at', options.endDate.toISOString())
  const { data: items } = await ticketsQuery
  const statsMap: Record<string, any> = {}
  if (items) {
      for (const item of items) {
          const gameId = item.game_id
          if (!gameId) continue
          if (!statsMap[gameId]) { statsMap[gameId] = { gameId, gameName: item.games?.name || 'Desconocido', totalSales: 0, totalPrizes: 0, netProfit: 0 } }
          statsMap[gameId].totalSales += (item.amount || 0)
      }
  }
  let winnersQuery = supabase.from('winners').select(`prize_amount, results (game_id)`)
  if (options?.startDate) winnersQuery = winnersQuery.gte('created_at', options.startDate.toISOString())
  if (options?.endDate) winnersQuery = winnersQuery.lte('created_at', options.endDate.toISOString())
  const { data: winners } = await winnersQuery
  if (winners) {
      for (const w of winners) {
          const gameId = w.results?.game_id
          if (!gameId || !statsMap[gameId]) continue
          statsMap[gameId].totalPrizes += (w.prize_amount || 0)
      }
  }
  return Object.values(statsMap).map(stat => ({ ...stat, netProfit: stat.totalSales - stat.totalPrizes }))
}

export const reportsService = { getSales: getSalesReport, getHotColdNumbers, getGameStats }
