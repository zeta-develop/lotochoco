import { requireCompanyId } from '@/lib/supabase/company'
import { dbEvents } from '@/lib/events'
import type { CashSession, CashMovement } from '@/lib/types'
import { supabase } from '@/lib/supabase/client'

function mapSession(row: any): CashSession {
  return {
    id: row.id,
    openingAmount: row.opening_amount,
    closingAmount: row.closing_amount,
    salesTotal: row.sales_total,
    prizesTotal: row.prizes_total,
    status: row.status,
    openedAt: new Date(row.opened_at),
    closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    movements: row.cash_movements ? row.cash_movements.map(mapMovement) : undefined
  }
}

function mapMovement(row: any): CashMovement {
  return {
    id: row.id,
    cashSessionId: row.cash_session_id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    createdAt: new Date(row.created_at)
  }
}

export async function openCashSession(openingAmount: number): Promise<CashSession> {
  const { data: id, error } = await supabase.rpc('pos_open_cash', {
    p_company_id: await requireCompanyId(), p_opening_amount: openingAmount
  })
  if (error) throw error
  const session = await getCashSessionById(id)
  if (!session) throw new Error('No se pudo recuperar la caja abierta')
  dbEvents.emit('cash:changed')
  return session
}

export async function getCurrentSession(): Promise<CashSession | null> {
  const { data: session, error } = await supabase.from('cash_sessions').select(`*, cash_movements (*)`).eq('company_id', await requireCompanyId()).eq('status', 'open').limit(1).single()
  if (error || !session) return null
  const mapped = mapSession(session)
  if (mapped.movements) { mapped.movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) }
  return mapped
}

export async function closeCashSession(sessionId: string, notes?: string): Promise<CashSession> {
  const { error } = await supabase.rpc('pos_close_cash', {
    p_company_id: await requireCompanyId(), p_session_id: sessionId, p_notes: notes || null
  })
  if (error) throw error
  const session = await getCashSessionById(sessionId)
  if (!session) throw new Error('No se pudo recuperar la caja cerrada')
  dbEvents.emit('cash:changed')
  return session
}

export async function addCashMovement(data: { cashSessionId: string; type: 'income' | 'expense'; amount: number; description: string }): Promise<CashMovement> {
  const companyId = await requireCompanyId()
  const { data: id, error } = await supabase.rpc('pos_add_cash_movement', {
    p_company_id: companyId, p_session_id: data.cashSessionId,
    p_type: data.type, p_amount: data.amount, p_description: data.description
  })
  if (error) throw error
  const { data: movement, error: readError } = await supabase.from('cash_movements')
    .select('*').eq('company_id', companyId).eq('id', id).single()
  if (readError) throw readError
  dbEvents.emit('cash:changed')
  return mapMovement(movement)
}

export async function getCashSessions(options?: { startDate?: Date; endDate?: Date; limit?: number }): Promise<CashSession[]> {
  let query = supabase.from('cash_sessions').select(`*, cash_movements (*)`).eq('company_id', await requireCompanyId()).order('opened_at', { ascending: false })
  if (options?.startDate) { query = query.gte('opened_at', options.startDate.toISOString()) }
  if (options?.endDate) { query = query.lte('opened_at', options.endDate.toISOString()) }
  if (options?.limit) { query = query.limit(options.limit) }
  const { data: sessions, error } = await query
  if (error) throw error
  if (!sessions) return []
  return sessions.map((s: any) => {
      const mapped = mapSession(s)
      if (mapped.movements) { mapped.movements.sort((a: CashMovement, b: CashMovement) => b.createdAt.getTime() - a.createdAt.getTime()) }
      return mapped
  })
}

export async function getCashSessionById(id: string): Promise<CashSession | null> {
  const { data: session, error } = await supabase.from('cash_sessions').select(`*, cash_movements (*)`).eq('company_id', await requireCompanyId()).eq('id', id).single()
  if (error || !session) return null
  const mapped = mapSession(session)
  if (mapped.movements) { mapped.movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) }
  return mapped
}

export async function getCashSummary(sessionId?: string): Promise<{ openingAmount: number; salesTotal: number; prizesTotal: number; incomeTotal: number; expenseTotal: number; balance: number }> {
  const { data, error } = await supabase.rpc('pos_cash_summary', {
    p_company_id: await requireCompanyId(), p_session_id: sessionId || null
  })
  if (error) throw error
  return data
}

export const cashRepository = { openSession: openCashSession, closeSession: closeCashSession, getCurrentSession, getSessionById: getCashSessionById, getSessions: getCashSessions, addMovement: addCashMovement, getSummary: getCashSummary }
