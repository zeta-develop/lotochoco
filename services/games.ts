import { query, execute, getDb } from '@/lib/db'
import type { Game, DrawSchedule } from '@/lib/types'
import { generateId } from '@/lib/utils'

export async function getGames(): Promise<Game[]> {
  const games = await query<Game>('SELECT * FROM Game ORDER BY name ASC')
  
  for (const game of games) {
    game.isActive = Boolean(game.isActive)
    game.schedules = await query<DrawSchedule>(
      'SELECT * FROM DrawSchedule WHERE gameId = ? AND isActive = 1 ORDER BY time ASC',
      [game.id]
    )
    for (const s of game.schedules) s.isActive = Boolean(s.isActive)
  }
  
  return games
}

export async function getActiveGames(): Promise<Game[]> {
  const games = await query<Game>('SELECT * FROM Game WHERE isActive = 1 ORDER BY name ASC')
  
  for (const game of games) {
    game.isActive = true
    game.schedules = await query<DrawSchedule>(
      'SELECT * FROM DrawSchedule WHERE gameId = ? AND isActive = 1 ORDER BY time ASC',
      [game.id]
    )
    for (const s of game.schedules) s.isActive = true
  }
  
  return games
}

export async function getGameById(id: string): Promise<Game | null> {
  const games = await query<Game>('SELECT * FROM Game WHERE id = ?', [id])
  if (games.length === 0) return null
  
  const game = games[0]
  game.isActive = Boolean(game.isActive)
  game.schedules = await query<DrawSchedule>(
    'SELECT * FROM DrawSchedule WHERE gameId = ? ORDER BY time ASC',
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
    'INSERT INTO Game (id, name, digitCount, multiplier, isActive) VALUES (?, ?, ?, ?, 1)',
    [gameId, data.name, data.digitCount, data.multiplier]
  )
  
  if (data.schedules) {
    for (const s of data.schedules) {
      await execute(
        'INSERT INTO DrawSchedule (id, gameId, name, time, isActive) VALUES (?, ?, ?, ?, 1)',
        [generateId(), gameId, s.name, s.time]
      )
    }
  }
  
  return (await getGameById(gameId))!
}

export async function updateGame(
  id: string,
  data: Partial<{
    name: string
    digitCount: number
    multiplier: number
    isActive: boolean
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
    await execute(`UPDATE Game SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, values)
  }
  
  return (await getGameById(id))!
}

export async function deleteGame(id: string): Promise<void> {
  await execute('DELETE FROM Game WHERE id = ?', [id])
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
