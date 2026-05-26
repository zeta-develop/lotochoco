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
    } : undefined
  }
}

export const winnersRepository = {
  async insertWinners(winners: any[]): Promise<void> {
    const winnersToInsert = winners.map((item) => ({
      id: generateId(),
      ticket_id: item.ticket_id,
      result_id: item.result_id,
      prize_amount: item.prize_amount,
      is_paid: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('winners').insert(winnersToInsert)
    if (error) throw error
  },

  async getWinners(options?: { isPaid?: boolean }): Promise<Winner[]> {
    let query = supabase.from('winners').select(`*, tickets (*)`).order('created_at', { ascending: false })
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
