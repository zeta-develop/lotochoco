import { dbEvents } from '@/lib/events'
import type { Game, DrawSchedule } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

function mapGame(row: any): Game {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1 || row.is_active === true,
    digitCount: row.digit_count,
    multiplier: row.multiplier,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    schedules: row.draw_schedules ? row.draw_schedules.map(mapSchedule) : undefined
  }
}

function mapSchedule(row: any): DrawSchedule {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    time: row.time,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
  }
}

export async function getGames(): Promise<Game[]> {
  const { data: games, error } = await supabase.from('games').select(`*, draw_schedules (*)`).order('name', { ascending: true })
  if (error) { console.error('Error fetching games:', error); return [] }
  return (games || []).map(mapGame)
}

export async function getActiveGames(): Promise<Game[]> {
  const { data: games, error } = await supabase.from('games').select(`*, draw_schedules (*)`).eq('is_active', 1).is('deleted_at', null).order('name', { ascending: true })
  if (error) { console.error('Error fetching active games:', error); return [] }
  return (games || []).map((g: any) => {
    const game = mapGame(g)
    if (game.schedules) {
      game.schedules = game.schedules.filter((s: DrawSchedule) => s.isActive && !s.deletedAt)
      game.schedules.sort((a: DrawSchedule, b: DrawSchedule) => a.time.localeCompare(b.time))
    }
    return game
  })
}

export async function getGameById(id: string): Promise<Game | null> {
  const { data: game, error } = await supabase.from('games').select(`*, draw_schedules (*)`).eq('id', id).is('deleted_at', null).single()
  if (error || !game) return null
  const mappedGame = mapGame(game);
  if (mappedGame.schedules) {
      mappedGame.schedules = mappedGame.schedules.filter((s: DrawSchedule) => !s.deletedAt);
      mappedGame.schedules.sort((a: DrawSchedule, b: DrawSchedule) => a.time.localeCompare(b.time));
  }
  return mappedGame
}

export async function createGame(data: { name: string; digitCount: number; multiplier: number; schedules?: { name: string; time: string }[] }): Promise<Game> {
  const gameId = generateId()
  const { error: gameError } = await supabase.from('games').insert({ id: gameId, name: data.name, digit_count: data.digitCount, multiplier: data.multiplier, is_active: 1 })
  if (gameError) throw gameError
  if (data.schedules && data.schedules.length > 0) {
    const schedulesToInsert = data.schedules.map((s: any) => ({ id: generateId(), game_id: gameId, name: s.name, time: s.time, is_active: 1 }))
    const { error: scheduleError } = await supabase.from('draw_schedules').insert(schedulesToInsert)
    if (scheduleError) throw scheduleError
  }
  const game = await getGameById(gameId);
  dbEvents.emit('games:changed');
  return game!;
}

export async function updateGame(id: string, data: Partial<{ name: string; digitCount: number; multiplier: number; isActive: boolean; schedules: { id?: string; name: string; time: string }[] }>): Promise<Game> {
  const updates: any = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updates.name = data.name
  if (data.digitCount !== undefined) updates.digit_count = data.digitCount
  if (data.multiplier !== undefined) updates.multiplier = data.multiplier
  if (data.isActive !== undefined) updates.is_active = data.isActive ? 1 : 0
  if (Object.keys(updates).length > 1) {
    const { error } = await supabase.from('games').update(updates).eq('id', id)
    if (error) throw error
  }
  if (data.schedules !== undefined) {
    const { data: existing } = await supabase.from('draw_schedules').select('*').eq('game_id', id).eq('is_active', 1).is('deleted_at', null)
    const newIds = data.schedules.map((s: any) => s.id).filter(Boolean) as string[]
    if (existing) {
      for (const ex of existing) {
        if (!newIds.includes(ex.id)) {
          await supabase.from('draw_schedules').update({ is_active: 0, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', ex.id)
        }
      }
    }
    for (const s of data.schedules) {
      if (s.id) {
        await supabase.from('draw_schedules').update({ name: s.name, time: s.time, updated_at: new Date().toISOString() }).eq('id', s.id)
      } else {
        await supabase.from('draw_schedules').insert({ id: generateId(), game_id: id, name: s.name, time: s.time, is_active: 1 })
      }
    }
  }
  const game = await getGameById(id);
  dbEvents.emit('games:changed');
  return game!;
}

export async function deleteGame(id: string): Promise<void> {
  const now = new Date().toISOString()
  await supabase.from('games').update({ deleted_at: now, updated_at: now }).eq('id', id)
  await supabase.from('draw_schedules').update({ deleted_at: now, updated_at: now }).eq('game_id', id)
  dbEvents.emit('games:changed');
}

export async function seedDefaultGames(): Promise<void> {
  const { count } = await supabase.from('games').select('*', { count: 'exact', head: true })
  if (count === 0) {
    const defaultGames = [
      { name: 'Tica', digitCount: 2, multiplier: 70, schedules: [{ name: 'Mañana', time: '11:00' }, { name: 'Tarde', time: '15:00' }, { name: 'Noche', time: '21:00' }] },
      { name: 'Nica', digitCount: 2, multiplier: 70, schedules: [{ name: 'Mañana', time: '11:00' }, { name: 'Tarde', time: '15:00' }, { name: 'Noche', time: '21:00' }] },
      { name: 'Fechas', digitCount: 2, multiplier: 60, schedules: [{ name: 'Única', time: '20:00' }] },
      { name: 'Tres Monazos', digitCount: 3, multiplier: 500, schedules: [{ name: 'Mañana', time: '11:00' }, { name: 'Noche', time: '21:00' }] }
    ]
    for (const gameData of defaultGames) { await createGame(gameData) }
  }
}

export const gamesService = {
  getAll: getGames,
  getActive: getActiveGames,
  getById: getGameById,
  create: async (data: any) => {
    const digitCount = data.digitCount ?? (data.playType === '3_digits' ? 3 : data.playType === '1_digit' ? 1 : 2)
    return createGame({ ...data, digitCount })
  },
  update: updateGame,
  delete: deleteGame,
  seedDefaultGames
}
