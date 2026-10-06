import { requireCompanyId } from '@/lib/supabase/company'
import { supabase } from '@/lib/supabase/client'
import { generateId } from '@/lib/utils'
import type { Result, Game, DrawSchedule } from '@/lib/types'

function mapResult(row: any): Result {
  const game = Array.isArray(row.games) ? row.games[0] : row.games;
  const schedule = Array.isArray(row.draw_schedules) ? row.draw_schedules[0] : row.draw_schedules;

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
    game: game ? mapGameFromJoin(game) : undefined,
    schedule: schedule ? mapScheduleFromJoin(schedule) : undefined,
    winners: row.winners || []
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

export const resultsRepository = {
  async getResults(options?: { startDate?: Date; endDate?: Date; gameId?: string; limit?: number; }): Promise<Result[]> {
    let query = supabase.from('results').select(`*, games (*), draw_schedules (*), winners (*)`).eq('company_id', await requireCompanyId()).is('deleted_at', null).order('draw_date', { ascending: false })
    if (options?.startDate) { query = query.gte('draw_date', options.startDate.toISOString()) }
    if (options?.endDate) { query = query.lte('draw_date', options.endDate.toISOString()) }
    if (options?.gameId) { query = query.eq('game_id', options.gameId) }
    if (options?.limit) { query = query.limit(options.limit) }
    
    const { data: results, error } = await query
    if (error) throw error
    if (!results) return []
    return results.map(mapResult)
  },

  async getResultById(id: string): Promise<Result | null> {
    const { data: result, error } = await supabase.from('results').select(`*, games (*), draw_schedules (*), winners (*)`).eq('company_id', await requireCompanyId()).eq('id', id).single()
    if (error || !result) return null
    return mapResult(result)
  },

  async addResult(data: { gameId: string; scheduleId: string; winningNumber: string; drawDate?: Date; }): Promise<Result> {
    const id = generateId()
    const drawDate = data.drawDate || new Date()
    const { error } = await supabase.from('results').insert({ 
      id,
      company_id: await requireCompanyId(),
      game_id: data.gameId, 
      schedule_id: data.scheduleId, 
      winning_number: data.winningNumber, 
      draw_date: drawDate.toISOString(), 
      is_processed: 0 
    })
    if (error) throw error
    const newResult = await this.getResultById(id)
    return newResult!
  },

  async getHotColdNumbers(gameId?: string, limit?: number): Promise<{ hot: { number: string; frequency: number }[]; cold: { number: string; frequency: number }[] }> {
    const { data, error } = await supabase.rpc('pos_hot_cold_numbers', {
      p_company_id: await requireCompanyId(), p_game_id: gameId || null, p_limit: limit || 5
    })
    if (error) throw error
    const rows = data || []
    return { hot: rows.filter((r: any) => r.type === 'hot'), cold: rows.filter((r: any) => r.type === 'cold') }
  }
}
