import { dbEvents } from "@/lib/events";
import type { Result, Winner, Game, DrawSchedule } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

function mapResult(row: any): Result {
  return {
    id: row.id,
    gameId: row.game_id,
    scheduleId: row.schedule_id,
    winningNumber: row.winning_number,
    drawDate: new Date(row.draw_date),
    isProcessed: row.is_processed === 1 || row.is_processed === true,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    game: row.games ? mapGameFromJoin(row.games) : undefined,
    schedule: row.draw_schedules ? mapScheduleFromJoin(row.draw_schedules) : undefined
  }
}

function mapGameFromJoin(row: any): Game {
    return {
        id: row.id, name: row.name, isActive: row.is_active === 1 || row.is_active === true,
        digitCount: row.digit_count, multiplier: row.multiplier,
        createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at), deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
    }
}

function mapScheduleFromJoin(row: any): DrawSchedule {
    return {
        id: row.id, gameId: row.game_id, name: row.name, time: row.time,
        isActive: row.is_active === 1 || row.is_active === true,
        createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at), deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
    }
}

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

export async function addResult(data: { gameId: string; scheduleId: string; winningNumber: string; drawDate?: Date; }): Promise<Result> {
  const id = generateId();
  const drawDate = data.drawDate || new Date();
  const { error } = await supabase.from('results').insert({ id, game_id: data.gameId, schedule_id: data.scheduleId, winning_number: data.winningNumber, draw_date: drawDate.toISOString(), is_processed: 0 });
  if (error) throw error;
  dbEvents.emit("results:changed");
  const newResult = await getResultById(id);
  return newResult!;
}

export async function getResultById(id: string): Promise<Result | null> {
  const { data: result, error } = await supabase.from('results').select(`*, games (*), draw_schedules (*)`).eq('id', id).single();
  if (error || !result) return null;
  return mapResult(result);
}

export async function processResult(id: string): Promise<void> {
  const result = await getResultById(id);
  if (!result) throw new Error("Resultado no encontrado");
  if (result.isProcessed) throw new Error("El resultado ya fue procesado");
  const { data: matchingItems } = await supabase.from('ticket_items').select(`*, tickets!inner(status)`).eq('game_id', result.gameId).eq('schedule', result.schedule?.name || '').eq('number', result.winningNumber).eq('tickets.status', 'active');
  if (matchingItems && matchingItems.length > 0) {
      const winnersToInsert = matchingItems.map((item: any) => ({
          id: generateId(), ticket_id: item.ticket_id, result_id: id, prize_amount: item.amount * (result.game?.multiplier || 70), is_paid: 0,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }));
      const { error: winnersError } = await supabase.from('winners').insert(winnersToInsert);
      if (winnersError) throw winnersError;
  }
  const now = new Date().toISOString();
  await supabase.from('results').update({ is_processed: 1, updated_at: now }).eq('id', id);
  dbEvents.emit("results:changed");
  dbEvents.emit("winners:changed");
}

export async function getResults(options?: { startDate?: Date; endDate?: Date; gameId?: string; limit?: number; }): Promise<Result[]> {
  let query = supabase.from('results').select(`*, games (*), draw_schedules (*)`).is('deleted_at', null).order('draw_date', { ascending: false });
  if (options?.startDate) { query = query.gte('draw_date', options.startDate.toISOString()); }
  if (options?.endDate) { query = query.lte('draw_date', options.endDate.toISOString()); }
  if (options?.gameId) { query = query.eq('game_id', options.gameId); }
  if (options?.limit) { query = query.limit(options.limit); }
  const { data: results, error } = await query;
  if (error || !results) return [];
  return results.map(mapResult);
}

export async function getPendingWinners(): Promise<Winner[]> {
  const { data: winners, error } = await supabase.from('winners').select(`*, tickets (*)`).eq('is_paid', 0).order('created_at', { ascending: false });
  if (error || !winners) return [];
  return winners.map(mapWinner);
}

export async function getPaidWinners(options?: { startDate?: Date; endDate?: Date; limit?: number; }): Promise<Winner[]> {
  let query = supabase.from('winners').select(`*, tickets (*)`).eq('is_paid', 1).order('paid_at', { ascending: false });
  if (options?.startDate) { query = query.gte('paid_at', options.startDate.toISOString()); }
  if (options?.endDate) { query = query.lte('paid_at', options.endDate.toISOString()); }
  if (options?.limit) { query = query.limit(options.limit); }
  const { data: winners, error } = await query;
  if (error || !winners) return [];
  return winners.map(mapWinner);
}

export async function payWinner(winnerId: string): Promise<void> {
  const { data: winner } = await supabase.from('winners').select('*').eq('id', winnerId).single();
  if (!winner) throw new Error("Premio no encontrado");
  if (winner.is_paid) throw new Error("El premio ya fue pagado");
  const { data: openSession } = await supabase.from('cash_sessions').select('*').eq('status', 'open').limit(1).single();
  if (!openSession) throw new Error("No hay una sesión de caja abierta");
  const now = new Date().toISOString();
  await supabase.from('winners').update({ is_paid: 1, paid_at: now, updated_at: now }).eq('id', winnerId);
  await supabase.from('cash_movements').insert({ id: generateId(), cash_session_id: openSession.id, type: 'prize_payment', amount: winner.prize_amount, description: `Pago de premio (ID: ${winnerId.substring(0, 8)})`, created_at: now, updated_at: now });
  await supabase.from('cash_sessions').update({ prizes_total: openSession.prizes_total + winner.prize_amount, updated_at: now }).eq('id', openSession.id);
  dbEvents.emit("winners:changed");
  dbEvents.emit("cash:changed");
}

export async function deleteResult(id: string): Promise<void> {
  const result = await getResultById(id);
  if (result?.isProcessed) { throw new Error("No se puede eliminar un resultado que ya fue procesado"); }
  const now = new Date().toISOString();
  await supabase.from('results').update({ deleted_at: now, updated_at: now }).eq('id', id);
  dbEvents.emit("results:changed");
}

export const resultsService = { add: addResult, getById: getResultById, getAll: getResults, process: processResult, getPendingWinners, getPaidWinners, payWinner, delete: deleteResult, };
