import { supabase } from '@/lib/supabase/client'
import { generateId } from '@/lib/utils'
import type { Result, Game, DrawSchedule } from '@/lib/types'

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
    schedule: row.draw_schedules ? mapScheduleFromJoin(row.draw_schedules) : undefined,
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
    let query = supabase.from('results').select(`*, games (*), draw_schedules (*), winners (*)`).is('deleted_at', null).order('draw_date', { ascending: false })
    if (options?.startDate) { query = query.gte('draw_date', options.startDate.toISOString()) }
    if (options?.endDate) { query = query.lte('draw_date', options.endDate.toISOString()) }
    if (options?.gameId) { query = query.eq('game_id', options.gameId) }
    if (options?.limit) { query = query.limit(options.limit) }
    
    const { data: results, error } = await query
    if (error || !results) return []
    return results.map(mapResult)
  },

  async getResultById(id: string): Promise<Result | null> {
    const { data: result, error } = await supabase.from('results').select(`*, games (*), draw_schedules (*), winners (*)`).eq('id', id).single()
    if (error || !result) return null
    return mapResult(result)
  },

  async addResult(data: { gameId: string; scheduleId: string; winningNumber: string; drawDate?: Date; }): Promise<Result> {
    const id = generateId()
    const drawDate = data.drawDate || new Date()
    const { data: result, error } = await supabase.from('results').insert({ 
      id, 
      game_id: data.gameId, 
      schedule_id: data.scheduleId, 
      winning_number: data.winningNumber, 
      draw_date: drawDate.toISOString(), 
      is_processed: 0 
    }).select(`*, games (*), draw_schedules (*), winners (*)`).single()

    if (error) {
      console.error("Error inserting result:", error)
      throw new Error(`Error al insertar resultado: ${error.message}`)
    }
    
    if (!result) throw new Error("No se pudo recuperar el resultado insertado")
    return mapResult(result)
  },

  async updateResultStatus(id: string, isProcessed: boolean): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabase.from('results').update({ is_processed: isProcessed ? 1 : 0, updated_at: now }).eq('id', id)
    if (error) throw error
  },

  async findMatchingTicketsForProcessing(gameId: string, scheduleTime: string, scheduleName: string, winningNumber: string) {
    const { data: matchingItems } = await supabase
      .from('ticket_items')
      .select(`*, tickets!inner(status)`)
      .eq('game_id', gameId)
      .eq('number', winningNumber)
      .eq('tickets.status', 'active')
      .or(`schedule.eq."${scheduleTime}",schedule.eq."${scheduleName}"`)
    
    return matchingItems || []
  },

  async getHotColdNumbers(gameId?: string, limit?: number): Promise<{ hot: { number: string; frequency: number }[]; cold: { number: string; frequency: number }[] }> {
    let query = supabase.from('results').select('winning_number').is('deleted_at', null)
    if (gameId) {
      query = query.eq('game_id', gameId)
    }
    const { data: results, error } = await query
    if (error || !results) return { hot: [], cold: [] }

    const frequencies: Record<string, number> = {}
    for (const res of results) {
      if (res.winning_number) {
        frequencies[res.winning_number] = (frequencies[res.winning_number] || 0) + 1
      }
    }

    const sorted = Object.entries(frequencies).map(([number, frequency]) => ({ number, frequency })).sort((a, b) => b.frequency - a.frequency)
    const n = limit || 5
    return { hot: sorted.slice(0, n), cold: sorted.slice(-n).reverse() }
  }
}
