import { supabase } from '@/lib/supabase/client'
import { generateId } from '@/lib/utils'
import type { Winner } from '@/lib/types'

function mapWinner(row: any): Winner {
  return {
    id: row.id, ticketId: row.ticket_id, resultId: row.result_id,
    prizeAmount: row.prize_amount, isPaid: row.is_paid === 1 || row.is_paid === true,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    ticket: row.tickets ? {
      id: row.tickets.id, ticketNumber: row.tickets.ticket_number, totalAmount: row.tickets.total_amount,
      status: row.tickets.status as any, createdAt: new Date(row.tickets.created_at), updatedAt: new Date(row.tickets.updated_at), client: row.tickets.client
    } : undefined,
    result: row.results ? {
      id: row.results.id,
      gameId: row.results.game_id,
      scheduleId: row.results.schedule_id,
      winningNumber: row.results.winning_number,
      drawDate: new Date(row.results.draw_date),
      isProcessed: row.results.is_processed === 1 || row.results.is_processed === true,
      createdAt: new Date(row.results.created_at),
      updatedAt: new Date(row.results.updated_at),
      game: row.results.games ? {
        id: row.results.games.id,
        name: row.results.games.name,
        isActive: row.results.games.is_active === 1 || row.results.games.is_active === true,
        digitCount: row.results.games.digit_count,
        multiplier: row.results.games.multiplier,
        createdAt: new Date(row.results.games.created_at),
        updatedAt: new Date(row.results.games.updated_at)
      } : undefined,
      schedule: row.results.draw_schedules ? {
        id: row.results.draw_schedules.id,
        gameId: row.results.draw_schedules.game_id,
        name: row.results.draw_schedules.name,
        time: row.results.draw_schedules.time,
        isActive: row.results.draw_schedules.is_active === 1 || row.results.draw_schedules.is_active === true,
        createdAt: new Date(row.results.draw_schedules.created_at),
        updatedAt: new Date(row.results.draw_schedules.updated_at)
      } : undefined
    } : undefined
  }
}

export const winnersRepository = {
  async insertWinners(winners: any[]): Promise<void> {
    const winnersToInsert = winners.map((item) => ({
      id: generateId(),
      company_id: item.company_id,
      ticket_id: item.ticket_id,
      result_id: item.result_id,
      prize_amount: item.prize_amount,
      is_paid: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('winners').insert(winnersToInsert)
    if (error) {
      console.error("Error inserting winners:", error)
      throw new Error(`Error al insertar ganadores: ${error.message}`)
    }
  },

  async getWinners(options?: { isPaid?: boolean }): Promise<Winner[]> {
    let query = supabase.from('winners').select(`*, tickets (*), results (*, games (*), draw_schedules (*))`).order('created_at', { ascending: false })
    if (options?.isPaid !== undefined) {
      query = query.eq('is_paid', options.isPaid ? 1 : 0)
    }
    const { data: winners, error } = await query
    if (error || !winners) return []
    return winners.map(mapWinner)
  },

  async getPendingWinners(): Promise<Winner[]> {
    return this.getWinners({ isPaid: false })
  },

  async markAsPaid(winnerId: string): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabase.from('winners').update({
      is_paid: 1,
      paid_at: now,
      updated_at: now
    }).eq('id', winnerId)

    if (error) throw error
  }
}
