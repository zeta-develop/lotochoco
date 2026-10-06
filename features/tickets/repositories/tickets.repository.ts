import { requireCompanyId } from '@/lib/supabase/company'
import { dbEvents } from '@/lib/events'
import type { Ticket, TicketItem, Game, DrawSchedule } from '@/lib/types'
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
    game: row.games ? mapGameFromJoin({ ...row.games, multiplier: row.multiplier_snapshot ?? row.games.multiplier }) : undefined
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

export async function createTicket(items: Omit<TicketItem, 'id' | 'ticketId' | 'createdAt'>[], client?: string): Promise<Ticket> {
  // Use the same atomic sale path as the checkout terminal.
  const { salesService } = await import('@/features/sales/services/sales.service')
  const { useSalesStore } = await import('@/features/sales/store/sales.store')
  const request = useSalesStore.getState().beginSale({ items: items.map(item => ({ ...item, gameName: '', scheduleName: '' })), client }, await requireCompanyId())
  try {
    const ticket = await salesService.processSale(request)
    if (useSalesStore.getState().pendingSale?.requestId !== request.requestId) {
      throw new Error('La venta cambió de cuenta. Recupera la operación original')
    }
    useSalesStore.getState().completeSale()
    return ticket
  } catch (error) {
    if ((error as { saleRolledBack?: boolean })?.saleRolledBack && useSalesStore.getState().pendingSale?.requestId === request.requestId) useSalesStore.setState({ pendingSale: null })
    throw error
  }
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const { data: ticket, error } = await supabase.from('tickets').select(`*, ticket_items (*, games (*, draw_schedules (*)))`).eq('company_id', await requireCompanyId()).eq('id', id).single()
  if (error || !ticket) return null
  return mapTicket(ticket)
}

export async function searchTicket(searchNumber: string): Promise<Ticket | null> {
  const cleanSearch = searchNumber.trim()

  // 1. Si el texto escaneado es un UUID (32 caracteres sin guiones o 36 con guiones)
  if (cleanSearch.length === 32 || cleanSearch.length === 36) {
    const formattedId = cleanSearch.length === 32
      ? `${cleanSearch.slice(0, 8)}-${cleanSearch.slice(8, 12)}-${cleanSearch.slice(12, 16)}-${cleanSearch.slice(16, 20)}-${cleanSearch.slice(20)}`.toLowerCase()
      : cleanSearch.toLowerCase()
    const ticketById = await getTicketById(formattedId)
    if (ticketById) return ticketById
  }

  // 2. Búsqueda por folio (#00000001, etc.)
  let formattedNumber = cleanSearch
  if (!formattedNumber.startsWith('#')) { formattedNumber = `#${formattedNumber}` }
  const { data: ticket, error } = await supabase.from('tickets').select(`*, ticket_items (*, games (*, draw_schedules (*)))`).eq('company_id', await requireCompanyId()).eq('ticket_number', formattedNumber).single()
  if (error || !ticket) return null
  return mapTicket(ticket)
}

export async function getTickets(options?: { startDate?: Date; endDate?: Date; status?: string; limit?: number; offset?: number }): Promise<{ tickets: Ticket[]; total: number }> {
  let query = supabase.from('tickets').select(`*, ticket_items (*, games (*, draw_schedules (*)))`, { count: 'exact' }).eq('company_id', await requireCompanyId())
  if (options?.startDate) { query = query.gte('created_at', options.startDate.toISOString()) }
  if (options?.endDate) { query = query.lte('created_at', options.endDate.toISOString()) }
  if (options?.status) { query = query.eq('status', options.status) }
  query = query.order('created_at', { ascending: false })
  if (options?.limit) { const offset = options.offset || 0; query = query.range(offset, offset + options.limit - 1) }
  const { data: tickets, count, error } = await query
  if (error) throw error
  if (!tickets) return { tickets: [], total: 0 }
  return { tickets: tickets.map(mapTicket), total: count || 0 }
}

export async function cancelTicket(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('pos_cancel_ticket', {
    p_company_id: await requireCompanyId(), p_ticket_id: id, p_reason: reason
  })
  if (error) throw error
  dbEvents.emit('tickets:changed')
  dbEvents.emit('cash:changed')
  dbEvents.emit('winners:changed')
}

export async function deleteTicket(id: string): Promise<void> {
  return cancelTicket(id, 'Eliminado por el usuario (anulación)')
}

export const ticketsRepository = { createTicket, getTicketById, searchTicket, getTickets, cancelTicket, deleteTicket }
