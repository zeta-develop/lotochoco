import getPrisma from '@/lib/db'
import type { Result, Winner } from '@/lib/types'

export async function createResult(data: {
  gameId: string
  scheduleId: string
  winningNumber: string
  drawDate?: Date
}): Promise<Result> {
  const prisma = await getPrisma()
  const result = await prisma.result.create({
    data: {
      gameId: data.gameId,
      scheduleId: data.scheduleId,
      winningNumber: data.winningNumber,
      drawDate: data.drawDate || new Date()
    },
    include: {
      game: true,
      schedule: true
    }
  })

  return result as unknown as Result
}

export async function processResult(resultId: string): Promise<{
  winnersCount: number
  totalPrizes: number
}> {
  const prisma = await getPrisma()
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    include: {
      game: true,
      schedule: true
    }
  })

  if (!result) {
    throw new Error('Resultado no encontrado')
  }

  if (result.isProcessed) {
    throw new Error('Este resultado ya fue procesado')
  }

  // Get the date range for the draw (same day)
  const drawDate = new Date(result.drawDate)
  const startOfDay = new Date(drawDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(drawDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Find all active tickets with matching numbers
  const matchingItems = await prisma.ticketItem.findMany({
    where: {
      gameId: result.gameId,
      schedule: result.schedule.time,
      number: result.winningNumber,
      ticket: {
        status: 'active',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    },
    include: {
      ticket: true,
      game: true
    }
  })

  let totalPrizes = 0
  const winnerIds: string[] = []

  // Create winners for each matching item
  for (const item of matchingItems) {
    const prizeAmount = item.amount * result.game.multiplier
    totalPrizes += prizeAmount

    const winner = await prisma.winner.create({
      data: {
        ticketId: item.ticketId,
        resultId: result.id,
        prizeAmount
      }
    })
    winnerIds.push(winner.id)
  }

  // Mark result as processed
  await prisma.result.update({
    where: { id: resultId },
    data: { isProcessed: true }
  })

  return {
    winnersCount: matchingItems.length,
    totalPrizes
  }
}

export async function getResults(options?: {
  gameId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<Result[]> {
  const prisma = await getPrisma()
  const where: Record<string, unknown> = {}

  if (options?.gameId) {
    where.gameId = options.gameId
  }

  if (options?.startDate || options?.endDate) {
    where.drawDate = {}
    if (options.startDate) {
      (where.drawDate as Record<string, Date>).gte = options.startDate
    }
    if (options.endDate) {
      (where.drawDate as Record<string, Date>).lte = options.endDate
    }
  }

  const results = await prisma.result.findMany({
    where,
    include: {
      game: true,
      schedule: true,
      winners: {
        include: {
          ticket: true
        }
      }
    },
    orderBy: { drawDate: 'desc' },
    take: options?.limit || 50
  })

  return results as unknown as Result[]
}

export async function getTodayResults(): Promise<Result[]> {
  const prisma = await getPrisma()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const results = await prisma.result.findMany({
    where: {
      drawDate: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      game: true,
      schedule: true
    },
    orderBy: { drawDate: 'desc' }
  })

  return results as unknown as Result[]
}

export async function getWinners(options?: {
  isPaid?: boolean
  startDate?: Date
  endDate?: Date
}): Promise<Winner[]> {
  const prisma = await getPrisma()
  const where: Record<string, unknown> = {}

  if (options?.isPaid !== undefined) {
    where.isPaid = options.isPaid
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {}
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate
    }
  }

  const winners = await prisma.winner.findMany({
    where,
    include: {
      ticket: {
        include: {
          items: {
            include: {
              game: true
            }
          }
        }
      },
      result: {
        include: {
          game: true,
          schedule: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return winners as unknown as Winner[]
}

export async function markWinnerAsPaid(winnerId: string): Promise<Winner> {
  const prisma = await getPrisma()
  const winner = await prisma.winner.update({
    where: { id: winnerId },
    data: {
      isPaid: true,
      paidAt: new Date()
    },
    include: {
      ticket: true,
      result: true
    }
  })

  // Update cash session
  const openSession = await prisma.cashSession.findFirst({
    where: { status: 'open' }
  })

  if (openSession) {
    await prisma.cashSession.update({
      where: { id: openSession.id },
      data: {
        prizesTotal: {
          increment: winner.prizeAmount
        }
      }
    })

    await prisma.cashMovement.create({
      data: {
        cashSessionId: openSession.id,
        type: 'prize_payment',
        amount: -winner.prizeAmount,
        description: `Pago premio ticket ${winner.ticket.ticketNumber}`
      }
    })
  }

  return winner as unknown as Winner
}

export async function getHotColdNumbers(gameId: string, limit: number = 10): Promise<{
  hot: { number: string; frequency: number }[]
  cold: { number: string; frequency: number }[]
}> {
  const prisma = await getPrisma()
  const results = await prisma.result.findMany({
    where: { gameId },
    select: { winningNumber: true },
    orderBy: { drawDate: 'desc' },
    take: 100
  })

  const frequency: Record<string, number> = {}
  
  for (const result of results) {
    frequency[result.winningNumber] = (frequency[result.winningNumber] || 0) + 1
  }

  const sorted = Object.entries(frequency)
    .map(([number, freq]) => ({ number, frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency)

  return {
    hot: sorted.slice(0, limit),
    cold: sorted.slice(-limit).reverse()
  }
}
