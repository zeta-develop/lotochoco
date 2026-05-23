import { dbEvents } from '@/lib/events'
import { query, execute, getDb } from '@/lib/db'
import type { Game, DrawSchedule } from '@/lib/types'
import { generateId } from '@/lib/utils'

export async function getGames(): Promise<Game[]> {
  const games = await query<Game>('SELECT * FROM "Game" ORDER BY "name" ASC')
  
  for (const game of games) {
    game.isActive = Boolean(game.isActive)
    game.schedules = await query<DrawSchedule>(
      'SELECT * FROM "DrawSchedule" WHERE "gameId" = ? AND "isActive" = 1 AND ("deletedAt" IS NULL) ORDER BY "time" ASC',
      [game.id]
    )
    for (const s of game.schedules) s.isActive = Boolean(s.isActive)
  }
  
  return games
}

export async function getActiveGames(): Promise<Game[]> {
  const games = await query<Game>('SELECT * FROM "Game" WHERE "isActive" = 1 AND ("deletedAt" IS NULL) ORDER BY "name" ASC')
  
  for (const game of games) {
    game.isActive = true
    game.schedules = await query<DrawSchedule>(
      'SELECT * FROM "DrawSchedule" WHERE "gameId" = ? AND "isActive" = 1 AND ("deletedAt" IS NULL) ORDER BY "time" ASC',
      [game.id]
    )
    for (const s of game.schedules) s.isActive = true
  }
  
  return games
}

export async function getGameById(id: string): Promise<Game | null> {
  const games = await query<Game>('SELECT * FROM Game WHERE id = ? AND ("deletedAt" IS NULL)', [id])
  if (games.length === 0) return null
  
  const game = games[0]
  game.isActive = Boolean(game.isActive)
  game.schedules = await query<DrawSchedule>(
    'SELECT * FROM DrawSchedule WHERE gameId = ? AND ("deletedAt" IS NULL) ORDER BY time ASC',
    [game.id]
  )
  for (const s of game.schedules) s.isActive = Boolean(s.isActive)
  
  return game
}

export async function createGame(data: {
  name: string
  digitCount: number
  multiplier: number
  schedules?: { name: string; time: string }[]
}): Promise<Game> {
  const gameId = generateId()
  
  await execute(
    'INSERT INTO Game (id, name, digitCount, multiplier, isActive, isDirty) VALUES (?, ?, ?, ?, 1, 1)',
    [gameId, data.name, data.digitCount, data.multiplier]
  )
  
  if (data.schedules) {
    for (const s of data.schedules) {
      await execute(
        'INSERT INTO DrawSchedule (id, gameId, name, time, isActive, isDirty) VALUES (?, ?, ?, ?, 1, 1)',
        [generateId(), gameId, s.name, s.time]
      )
    }
  }
  
  const game = await getGameById(gameId);
  dbEvents.emit('games:changed');
  return game!;
}

export async function updateGame(
  id: string,
  data: Partial<{
    name: string
    digitCount: number
    multiplier: number
    isActive: boolean
    schedules: { id?: string; name: string; time: string }[]
  }>
): Promise<Game> {
  const fields: string[] = []
  const values: any[] = []
  
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.digitCount !== undefined) { fields.push('digitCount = ?'); values.push(data.digitCount) }
  if (data.multiplier !== undefined) { fields.push('multiplier = ?'); values.push(data.multiplier) }
  if (data.isActive !== undefined) { fields.push('isActive = ?'); values.push(data.isActive ? 1 : 0) }
  
  if (fields.length > 0) {
    values.push(id)
    await execute(`UPDATE Game SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP, isDirty = 1 WHERE id = ?`, values)
  }

  if (data.schedules !== undefined) {
    const existing = await query<DrawSchedule>('SELECT * FROM DrawSchedule WHERE gameId = ? AND isActive = 1 AND ("deletedAt" IS NULL)', [id])
    const newIds = data.schedules.map(s => s.id).filter(Boolean) as string[]
    
    for (const ex of existing) {
      if (!newIds.includes(ex.id)) {
        await execute('UPDATE DrawSchedule SET isActive = 0, isDirty = 1, deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [ex.id])
      }
    }

    for (const s of data.schedules) {
      if (s.id) {
        await execute('UPDATE DrawSchedule SET name = ?, time = ?, isDirty = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [s.name, s.time, s.id])
      } else {
        await execute('INSERT INTO DrawSchedule (id, gameId, name, time, isActive, isDirty) VALUES (?, ?, ?, ?, 1, 1)', [generateId(), id, s.name, s.time])
      }
    }
  }
  
  const game = await getGameById(id);
  dbEvents.emit('games:changed');
  return game!;
}

export async function deleteGame(id: string): Promise<void> {
  // Soft delete instead of physical delete to allow syncing deletions
  await execute('UPDATE Game SET isDirty = 1, deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  // También marcamos los schedules
  await execute('UPDATE DrawSchedule SET isDirty = 1, deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE gameId = ?', [id]);

  dbEvents.emit('games:changed');
}

// Seed default games
export async function seedDefaultGames(): Promise<void> {
  const results = await query('SELECT COUNT(*) as count FROM Game')
  if (results[0].count === 0) {
    const defaultGames = [
      {
        name: 'Tica',
        digitCount: 2,
        multiplier: 70,
        schedules: [
          { name: 'Mañana', time: '11:00' },
          { name: 'Tarde', time: '15:00' },
          { name: 'Noche', time: '21:00' }
        ]
      },
      {
        name: 'Nica',
        digitCount: 2,
        multiplier: 70,
        schedules: [
          { name: 'Mañana', time: '11:00' },
          { name: 'Tarde', time: '15:00' },
          { name: 'Noche', time: '21:00' }
        ]
      },
      {
        name: 'Fechas',
        digitCount: 2,
        multiplier: 60,
        schedules: [
          { name: 'Única', time: '20:00' }
        ]
      },
      {
        name: 'Tres Monazos',
        digitCount: 3,
        multiplier: 500,
        schedules: [
          { name: 'Mañana', time: '11:00' },
          { name: 'Noche', time: '21:00' }
        ]
      }
    ]

    for (const gameData of defaultGames) {
      await createGame(gameData)
    }
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
