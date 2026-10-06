import { requireCompanyId } from '@/lib/supabase/company'
import { supabase } from '@/lib/supabase/client'
import type { Winner } from '@/lib/types'

function mapWinner(row: any): Winner {
  const resultData = Array.isArray(row.results) ? row.results[0] : row.results;
  const ticketData = Array.isArray(row.tickets) ? row.tickets[0] : row.tickets;

  const gameData = resultData?.games ? (Array.isArray(resultData.games) ? resultData.games[0] : resultData.games) : undefined;
  const scheduleData = resultData?.draw_schedules ? (Array.isArray(resultData.draw_schedules) ? resultData.draw_schedules[0] : resultData.draw_schedules) : undefined;

  return {
    id: row.id, ticketId: row.ticket_id, resultId: row.result_id,
    prizeAmount: row.prize_amount, isPaid: row.is_paid === 1 || row.is_paid === true,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    ticket: ticketData ? {
      id: ticketData.id, ticketNumber: ticketData.ticket_number, totalAmount: ticketData.total_amount,
      status: ticketData.status as any, createdAt: new Date(ticketData.created_at), updatedAt: new Date(ticketData.updated_at), client: ticketData.client
    } : undefined,
    result: resultData ? {
      id: resultData.id,
      gameId: resultData.game_id,
      scheduleId: resultData.schedule_id,
      winningNumber: resultData.winning_number,
      drawDate: new Date(resultData.draw_date),
      isProcessed: resultData.is_processed === 1 || resultData.is_processed === true,
      createdAt: new Date(resultData.created_at),
      updatedAt: new Date(resultData.updated_at),
      game: gameData ? {
        id: gameData.id,
        name: gameData.name,
        isActive: gameData.is_active === 1 || gameData.is_active === true,
        digitCount: gameData.digit_count,
        multiplier: gameData.multiplier,
        createdAt: new Date(gameData.created_at),
        updatedAt: new Date(gameData.updated_at)
      } : undefined,
      schedule: scheduleData ? {
        id: scheduleData.id,
        gameId: scheduleData.game_id,
        name: scheduleData.name,
        time: scheduleData.time,
        isActive: scheduleData.is_active === 1 || scheduleData.is_active === true,
        createdAt: new Date(scheduleData.created_at),
        updatedAt: new Date(scheduleData.updated_at)
      } : undefined
    } : undefined
  }
}

export const winnersRepository = {
  async getWinners(options?: { isPaid?: boolean }): Promise<Winner[]> {
    let query = supabase.from('winners').select(`*, tickets (*), results (*, games (*), draw_schedules (*))`).eq('company_id', await requireCompanyId()).order('created_at', { ascending: false })
    if (options?.isPaid !== undefined) {
      query = query.eq('is_paid', options.isPaid ? 1 : 0)
    }
    const { data: winners, error } = await query
    if (error) throw error
    if (!winners) return []
    return winners.map(mapWinner)
  },

  async getPendingWinners(): Promise<Winner[]> {
    return this.getWinners({ isPaid: false })
  },

  async markAsPaid(winnerId: string): Promise<void> {
    const { error } = await supabase.rpc('pos_pay_winner', {
      p_company_id: await requireCompanyId(), p_winner_id: winnerId
    })
    if (error) throw error
  }
}
