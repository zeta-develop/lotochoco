import { dbEvents } from '@/lib/events'
import type { CashSession, CashMovement } from '@/lib/types'
import { generateId } from '@/lib/utils'
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
  const { count } = await supabase.from('cash_sessions').select('*', { count: 'exact', head: true }).eq('status', 'open')
  if (count && count > 0) throw new Error('Ya existe una sesión de caja abierta')
  const id = generateId()
  const now = new Date().toISOString()
  const { error } = await supabase.from('cash_sessions').insert({ id, opening_amount: openingAmount, status: 'open', sales_total: 0, prizes_total: 0, opened_at: now, created_at: now, updated_at: now })
  if (error) throw error
  const retSession = await getCashSessionById(id);
  dbEvents.emit('cash:changed');
  return retSession!;
}

export async function getCurrentSession(): Promise<CashSession | null> {
  const { data: session, error } = await supabase.from('cash_sessions').select(`*, cash_movements (*)`).eq('status', 'open').limit(1).single()
  if (error || !session) return null
  const mapped = mapSession(session)
  if (mapped.movements) { mapped.movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) }
  return mapped
}

export async function closeCashSession(sessionId: string, notes?: string): Promise<CashSession> {
  const session = await getCashSessionById(sessionId)
  if (!session) throw new Error('Sesión no encontrada')
  if (session.status === 'closed') throw new Error('La sesión ya está cerrada')
  const summary = await getCashSummary(sessionId)
  const now = new Date().toISOString()
  const { error } = await supabase.from('cash_sessions').update({ status: 'closed', closing_amount: summary.balance, closed_at: now, notes: notes || null, updated_at: now }).eq('id', sessionId)
  if (error) throw error
  const retSession = await getCashSessionById(sessionId);
  dbEvents.emit('cash:changed');
  return retSession!;
}

export async function addCashMovement(data: { cashSessionId: string; type: 'income' | 'expense' | 'sale' | 'prize_payment'; amount: number; description: string }): Promise<CashMovement> {
  const id = generateId()
  const now = new Date().toISOString()
  const { error } = await supabase.from('cash_movements').insert({ id, cash_session_id: data.cashSessionId, type: data.type, amount: data.amount, description: data.description, created_at: now })
  if (error) throw error
  const { data: movement } = await supabase.from('cash_movements').select('*').eq('id', id).single()
  dbEvents.emit('cash:changed');
  return mapMovement(movement)
}

export async function getCashSessions(options?: { startDate?: Date; endDate?: Date; limit?: number }): Promise<CashSession[]> {
  let query = supabase.from('cash_sessions').select(`*, cash_movements (*)`).order('opened_at', { ascending: false })
  if (options?.startDate) { query = query.gte('opened_at', options.startDate.toISOString()) }
  if (options?.endDate) { query = query.lte('opened_at', options.endDate.toISOString()) }
  if (options?.limit) { query = query.limit(options.limit) }
  const { data: sessions, error } = await query
  if (error || !sessions) return []
  return sessions.map((s: any) => {
      const mapped = mapSession(s)
      if (mapped.movements) { mapped.movements.sort((a: CashMovement, b: CashMovement) => b.createdAt.getTime() - a.createdAt.getTime()) }
      return mapped
  })
}

export async function getCashSessionById(id: string): Promise<CashSession | null> {
  const { data: session, error } = await supabase.from('cash_sessions').select(`*, cash_movements (*)`).eq('id', id).single()
  if (error || !session) return null
  const mapped = mapSession(session)
  if (mapped.movements) { mapped.movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) }
  return mapped
}

export async function getCashSummary(sessionId?: string): Promise<{ openingAmount: number; salesTotal: number; prizesTotal: number; incomes: number; expenses: number; balance: number }> {
  let session = null
  if (sessionId) { session = await getCashSessionById(sessionId) } else { session = await getCurrentSession() }
  if (!session) { return { openingAmount: 0, salesTotal: 0, prizesTotal: 0, incomes: 0, expenses: 0, balance: 0 } }
  let incomes = 0
  let expenses = 0
  if (session.movements) {
    for (const m of session.movements) {
      if (m.type === 'income') incomes += m.amount
      else if (m.type === 'expense') expenses += m.amount
    }
  }
  return { openingAmount: session.openingAmount, salesTotal: session.salesTotal, prizesTotal: session.prizesTotal, incomes, expenses, balance: session.openingAmount + session.salesTotal + incomes - session.prizesTotal - expenses }
}

export const cashService = { openSession: openCashSession, closeSession: closeCashSession, getCurrentSession, getSessionById: getCashSessionById, getSessions: getCashSessions, addMovement: addCashMovement, getSummary: getCashSummary }
