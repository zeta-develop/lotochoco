import getPrisma from '@/lib/db'
import type { Game, DrawSchedule } from '@/lib/types'

export async function getGames(): Promise<Game[]> {
  const prisma = await getPrisma()
  const games = await prisma.game.findMany({
    include: {
      schedules: {
        where: { isActive: true },
        orderBy: { time: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  })
  return games as Game[]
}

export async function getActiveGames(): Promise<Game[]> {
  const prisma = await getPrisma()
  const games = await prisma.game.findMany({
    where: { isActive: true },
    include: {
      schedules: {
        where: { isActive: true },
        orderBy: { time: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  })
  return games as Game[]
}

export async function getGameById(id: string): Promise<Game | null> {
  const prisma = await getPrisma()
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      schedules: {
        orderBy: { time: 'asc' }
      }
    }
  })
  return game as Game | null
}

export async function createGame(data: {
  name: string
  digitCount: number
  multiplier: number
  schedules?: { name: string; time: string }[]
}): Promise<Game> {
  const prisma = await getPrisma()
  const game = await prisma.game.create({
    data: {
      name: data.name,
      digitCount: data.digitCount,
      multiplier: data.multiplier,
      schedules: data.schedules ? {
        create: data.schedules
      } : undefined
    },
    include: {
      schedules: true
    }
  })
  return game as Game
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
  const prisma = await getPrisma()
  const game = await prisma.game.update({
    where: { id },
    data,
    include: {
      schedules: true
    }
  })
  return game as Game
}

export async function deleteGame(id: string): Promise<void> {
  const prisma = await getPrisma()
  await prisma.game.delete({
    where: { id }
  })
}

// Schedule functions
export async function getSchedulesByGame(gameId: string): Promise<DrawSchedule[]> {
  const prisma = await getPrisma()
  const schedules = await prisma.drawSchedule.findMany({
    where: { gameId },
    orderBy: { time: 'asc' }
  })
  return schedules as DrawSchedule[]
}

export async function createSchedule(data: {
  gameId: string
  name: string
  time: string
}): Promise<DrawSchedule> {
  const prisma = await getPrisma()
  const schedule = await prisma.drawSchedule.create({
    data
  })
  return schedule as DrawSchedule
}

export async function updateSchedule(
  id: string,
  data: Partial<{
    name: string
    time: string
    isActive: boolean
  }>
): Promise<DrawSchedule> {
  const prisma = await getPrisma()
  const schedule = await prisma.drawSchedule.update({
    where: { id },
    data
  })
  return schedule as DrawSchedule
}

export async function deleteSchedule(id: string): Promise<void> {
  const prisma = await getPrisma()
  await prisma.drawSchedule.delete({
    where: { id }
  })
}

// Seed default games
export async function seedDefaultGames(): Promise<void> {
  const prisma = await getPrisma()
  const existingGames = await prisma.game.count()
  
  if (existingGames === 0) {
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
  create: async (data: {
    name: string
    playType?: string
    digitCount?: number
    multiplier: number
    isActive?: boolean
    schedules?: { name: string; time: string }[]
  }) => {
    const digitCount =
      data.digitCount ??
      (data.playType === '3_digits' ? 3 : data.playType === '1_digit' ? 1 : 2)

    return createGame({
      name: data.name,
      digitCount,
      multiplier: data.multiplier,
      schedules: data.schedules
    })
  },
  update: updateGame,
  delete: deleteGame,
  addSchedule: async (gameId: string, schedule: { name: string; time: string }) => {
    return createSchedule({ gameId, ...schedule })
  },
  updateSchedule,
  deleteSchedule,
  seedDefaultGames
}
