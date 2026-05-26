import { dbEvents } from '@/lib/events'
import type { Ticket, TicketItem, Game, DrawSchedule } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

function mapTicket(row: any): Ticket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    client: row.client,
    totalAmount: row.total_amount,
    status: row.status,
    cancelReason: row.cancel_reason,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    items: row.ticket_items ? row.ticket_items.map(mapTicketItem) : undefined
  }
}

function mapTicketItem(row: any): TicketItem {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    gameId: row.game_id,
    number: row.number,
    amount: row.amount,
    schedule: row.schedule,
    createdAt: new Date(row.created_at),
    game: row.games ? mapGameFromJoin(row.games) : undefined
  }
}

function mapGameFromJoin(row: any): Game {
    return {
        id: row.id,
        name: row.name,
        isActive: row.is_active === 1 || row.is_active === true,
        digitCount: row.digit_count,
        multiplier: row.multiplier,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
        schedules: row.draw_schedules ? row.draw_schedules.map((s: any) => ({
            id: s.id, gameId: s.game_id, name: s.name, time: s.time,
            isActive: s.is_active === 1 || s.is_active === true,
            createdAt: new Date(s.created_at), updatedAt: new Date(s.updated_at), deletedAt: s.deleted_at ? new Date(s.deleted_at) : null
        })) : undefined
    }
}

async function generateTicketNumber(): Promise<string> {
  const { data: result } = await supabase.from('tickets').select('ticket_number').order('ticket_number', { ascending: false }).limit(1).single()
  if (!result || !result.ticket_number) { return '#00000001' }
  const currentNum = parseInt(result.ticket_number.replace('#', ''))
  return `#${(currentNum + 1).toString().padStart(8, '0')}`
}

export async function createTicket(items: Omit<TicketItem, 'id' | 'ticketId' | 'createdAt'>[], client?: string): Promise<Ticket> {
  const ticketId = generateId()
  const ticketNumber = await generateTicketNumber()
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const now = new Date().toISOString()
  const { error: ticketError } = await supabase.from('tickets').insert({ id: ticketId, ticket_number: ticketNumber, total_amount: totalAmount, status: 'active', client: client || null, created_at: now, updated_at: now })
  if (ticketError) throw ticketError
  const itemsToInsert = items.map(item => ({ id: generateId(), ticket_id: ticketId, game_id: item.gameId, number: item.number, amount: item.amount, schedule: item.schedule, created_at: now, updated_at: now }))
  const { error: itemsError } = await supabase.from('ticket_items').insert(itemsToInsert)
  if (itemsError) throw itemsError
  const { data: openSession } = await supabase.from('cash_sessions').select('id').eq('status', 'open').limit(1).single()
  if (openSession) {
    const sessionId = openSession.id;
    const { data: currentSession } = await supabase.from('cash_sessions').select('sales_total').eq('id', sessionId).single();
    if (currentSession) { await supabase.from('cash_sessions').update({ sales_total: currentSession.sales_total + totalAmount, updated_at: now }).eq('id', sessionId) }
    await supabase.from('cash_movements').insert({ id: generateId(), cash_session_id: sessionId, type: 'sale', amount: totalAmount, description: `Venta Ticket ${ticketNumber}`, created_at: now, updated_at: now })
  }
  const newTicket = await getTicketById(ticketId);
  dbEvents.emit('tickets:changed');
  dbEvents.emit('cash:changed');
  return newTicket!;
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const { data: ticket, error } = await supabase.from('tickets').select(`*, ticket_items (*, games (*, draw_schedules (*)))`).eq('id', id).single()
  if (error || !ticket) return null
  return mapTicket(ticket)
}

export async function searchTicket(searchNumber: string): Promise<Ticket | null> {
  if (!searchNumber.startsWith('#')) { searchNumber = `#${searchNumber}` }
  const { data: ticket, error } = await supabase.from('tickets').select(`*, ticket_items (*, games (*, draw_schedules (*)))`).eq('ticket_number', searchNumber).single()
  if (error || !ticket) return null
  return mapTicket(ticket)
}

export async function getTickets(options?: { startDate?: Date; endDate?: Date; status?: string; limit?: number; offset?: number }): Promise<{ tickets: Ticket[]; total: number }> {
  let query = supabase.from('tickets').select(`*, ticket_items (*, games (*, draw_schedules (*)))`, { count: 'exact' })
  if (options?.startDate) { query = query.gte('created_at', options.startDate.toISOString()) }
  if (options?.endDate) { query = query.lte('created_at', options.endDate.toISOString()) }
  if (options?.status) { query = query.eq('status', options.status) }
  query = query.order('created_at', { ascending: false })
  if (options?.limit) { const offset = options.offset || 0; query = query.range(offset, offset + options.limit - 1) }
  const { data: tickets, count, error } = await query
  if (error || !tickets) { return { tickets: [], total: 0 } }
  return { tickets: tickets.map(mapTicket), total: count || 0 }
}

export async function cancelTicket(id: string, reason: string): Promise<void> {
  const ticket = await getTicketById(id)
  if (!ticket) throw new Error('Ticket no encontrado')
  if (ticket.status === 'cancelled') throw new Error('El ticket ya está anulado')
  const now = new Date().toISOString()
  await supabase.from('tickets').update({ status: 'cancelled', cancel_reason: reason, cancelled_at: now, updated_at: now }).eq('id', id)
  await supabase.from('cancellation_logs').insert({ id: generateId(), ticket_id: ticket.id, ticket_number: ticket.ticketNumber, total_amount: ticket.totalAmount, reason: reason, items_json: JSON.stringify(ticket.items), created_at: now })
  const { data: openSession } = await supabase.from('cash_sessions').select('id').eq('status', 'open').limit(1).single()
  if (openSession) {
    const sessionId = openSession.id
    const { data: currentSession } = await supabase.from('cash_sessions').select('sales_total').eq('id', sessionId).single();
    if (currentSession) { await supabase.from('cash_sessions').update({ sales_total: currentSession.sales_total - ticket.totalAmount, updated_at: now }).eq('id', sessionId) }
    await supabase.from('cash_movements').insert({ id: generateId(), cash_session_id: sessionId, type: 'expense', amount: ticket.totalAmount, description: `Anulación Ticket ${ticket.ticketNumber}`, created_at: now, updated_at: now })
  }
  dbEvents.emit('tickets:changed')
  dbEvents.emit('cash:changed')
}

export const ticketsRepository = { createTicket, getTicketById, searchTicket, getTickets, cancelTicket }
