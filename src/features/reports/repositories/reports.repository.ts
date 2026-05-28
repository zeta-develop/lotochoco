import type { SalesReport } from '@/lib/types'
import { supabase } from '@/lib/supabase/client'

export async function getSalesReport(options?: { startDate?: Date; endDate?: Date }): Promise<SalesReport> {
  const start = options?.startDate || new Date()
  const end = options?.endDate || new Date()

  try {
    // Intentar usar la función RPC optimizada
    const { data, error } = await supabase.rpc('get_sales_report', {
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString()
    })

    if (!error && data && data.length > 0) {
      const row = data[0]
      return {
        totalSales: Number(row.total_sales),
        totalTickets: Number(row.total_tickets),
        totalPrizes: Number(row.total_prizes),
        totalPaid: Number(row.total_paid),
        pendingPrizes: Number(row.pending_prizes),
        netProfit: Number(row.net_profit)
      }
    }
  } catch (err) {
    console.warn('RPC get_sales_report no disponible, usando fallback manual:', err)
  }

  // FALLBACK: Lógica manual si el RPC falla o no existe
  let ticketsQuery = supabase
    .from('tickets')
    .select('total_amount')
    .eq('status', 'active')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
  
  const { data: tickets } = await ticketsQuery
  const totalSales = tickets ? tickets.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0) : 0
  const totalTickets = tickets ? tickets.length : 0
  
  let winnersQuery = supabase
    .from('winners')
    .select('prize_amount, is_paid')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
  
  const { data: winners } = await winnersQuery
  let totalPrizes = 0; let totalPaid = 0;
  if (winners) {
    for (const w of winners) {
      const prize = Number(w.prize_amount) || 0
      totalPrizes += prize
      if (w.is_paid === 1 || w.is_paid === true) { totalPaid += prize }
    }
  }
  
  return { 
    totalSales, 
    totalTickets, 
    totalPrizes, 
    totalPaid, 
    pendingPrizes: totalPrizes - totalPaid, 
    netProfit: totalSales - totalPrizes 
  }
}

export async function getHotColdNumbers(options?: { gameId?: string; limit?: number }): Promise<{ number: string; frequency: number; type: 'hot' | 'cold' }[]> {
  const limit = options?.limit || 5
  
  try {
    const { data, error } = await supabase.rpc('get_hot_cold_numbers', {
      p_game_id: options?.gameId || null,
      p_limit: limit
    })

    if (!error && data) {
      return data.map((row: any) => ({
        number: row.number,
        frequency: Number(row.frequency),
        type: row.type as 'hot' | 'cold'
      }))
    }
  } catch (err) {
    console.warn('RPC get_hot_cold_numbers no disponible, usando fallback manual:', err)
  }

  // FALLBACK: Lógica manual
  let query = supabase.from('results').select('winning_number')
  if (options?.gameId) { query = query.eq('game_id', options.gameId) }
  const { data: results } = await query
  if (!results || results.length === 0) return []
  const freqs: Record<string, number> = {}
  for (const r of results) { if (!r.winning_number) continue; freqs[r.winning_number] = (freqs[r.winning_number] || 0) + 1 }
  const sorted = Object.entries(freqs).map(([num, count]) => ({ number: num, frequency: count })).sort((a, b) => b.frequency - a.frequency)
  const hot = sorted.slice(0, limit).map(n => ({ ...n, type: 'hot' as const }))
  const cold = sorted.slice(-limit).reverse().map(n => ({ ...n, type: 'cold' as const }))
  return [...hot, ...cold]
}

export async function getGameStats(options?: { startDate?: Date; endDate?: Date }): Promise<any[]> {
  const start = options?.startDate || new Date()
  const end = options?.endDate || new Date()

  try {
    const { data, error } = await supabase.rpc('get_game_stats', {
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString()
    })

    if (!error && data) {
      return data.map((row: any) => ({
        gameId: row.game_id,
        gameName: row.game_name,
        totalSales: Number(row.total_sales),
        totalPrizes: Number(row.total_prizes),
        netProfit: Number(row.net_profit)
      }))
    }
  } catch (err) {
    console.warn('RPC get_game_stats no disponible, usando fallback manual:', err)
  }

  // FALLBACK: Lógica manual
  let ticketsQuery = supabase.from('ticket_items').select(`amount, game_id, games (name)`)
  if (options?.startDate) ticketsQuery = ticketsQuery.gte('created_at', options.startDate.toISOString())
  if (options?.endDate) ticketsQuery = ticketsQuery.lte('created_at', options.endDate.toISOString())
  const { data: items } = await ticketsQuery
  const statsMap: Record<string, any> = {}
  if (items) {
      for (const item of items) {
          const gameId = item.game_id
          if (!gameId) continue
          if (!statsMap[gameId]) { statsMap[gameId] = { gameId, gameName: (item.games as any)?.name || 'Desconocido', totalSales: 0, totalPrizes: 0, netProfit: 0 } }
          statsMap[gameId].totalSales += (Number(item.amount) || 0)
      }
  }
  let winnersQuery = supabase.from('winners').select(`prize_amount, results (game_id)`)
  if (options?.startDate) winnersQuery = winnersQuery.gte('created_at', options.startDate.toISOString())
  if (options?.endDate) winnersQuery = winnersQuery.lte('created_at', options.endDate.toISOString())
  const { data: winners } = await winnersQuery
  if (winners) {
      for (const w of winners) {
          const gameId = (w.results as any)?.game_id
          if (!gameId || !statsMap[gameId]) continue
          statsMap[gameId].totalPrizes += (Number(w.prize_amount) || 0)
      }
  }
  return Object.values(statsMap).map(stat => ({ ...stat, netProfit: stat.totalSales - stat.totalPrizes }))
}

export const reportsRepository = { getSales: getSalesReport, getHotColdNumbers, getGameStats }
