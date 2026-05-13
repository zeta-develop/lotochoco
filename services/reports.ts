import prisma from '@/lib/db'
import type { SalesReport } from '@/lib/types'

export async function getSalesReport(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<SalesReport> {
  const where: Record<string, unknown> = {
    status: 'active'
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

  // Get total sales
  const salesResult = await prisma.ticket.aggregate({
    where,
    _sum: {
      totalAmount: true
    },
    _count: true
  })

  // Get total prizes
  const prizeWhere: Record<string, unknown> = {}
  if (options?.startDate || options?.endDate) {
    prizeWhere.createdAt = where.createdAt
  }

  const prizesResult = await prisma.winner.aggregate({
    where: prizeWhere,
    _sum: {
      prizeAmount: true
    }
  })

  // Get paid prizes
  const paidResult = await prisma.winner.aggregate({
    where: {
      ...prizeWhere,
      isPaid: true
    },
    _sum: {
      prizeAmount: true
    }
  })

  const totalSales = salesResult._sum.totalAmount || 0
  const totalTickets = salesResult._count
  const totalPrizes = prizesResult._sum.prizeAmount || 0
  const totalPaid = paidResult._sum.prizeAmount || 0
  const pendingPrizes = totalPrizes - totalPaid
  const netProfit = totalSales - totalPrizes

  return {
    totalSales,
    totalTickets,
    totalPrizes,
    totalPaid,
    pendingPrizes,
    netProfit
  }
}

export async function getDailyReport(date: Date): Promise<SalesReport> {
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)

  return getSalesReport({ startDate, endDate })
}

export async function getWeeklyReport(): Promise<{
  days: { date: string; sales: number; prizes: number }[]
  totals: SalesReport
}> {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const days: { date: string; sales: number; prizes: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const dayReport = await getDailyReport(date)
    
    days.push({
      date: date.toISOString().split('T')[0],
      sales: dayReport.totalSales,
      prizes: dayReport.totalPrizes
    })
  }

  const totals = await getSalesReport({
    startDate: weekAgo,
    endDate: today
  })

  return { days, totals }
}

export async function getGameReport(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<{
  gameId: string
  gameName: string
  ticketCount: number
  totalAmount: number
  prizesAmount: number
}[]> {
  const where: Record<string, unknown> = {}
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {}
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate
    }
  }

  const items = await prisma.ticketItem.groupBy({
    by: ['gameId'],
    where: {
      ticket: {
        status: 'active',
        ...where
      }
    },
    _sum: {
      amount: true
    },
    _count: true
  })

  const games = await prisma.game.findMany()
  const gameMap = new Map(games.map(g => [g.id, g.name]))

  const results = await Promise.all(
    items.map(async (item) => {
      const prizeWhere: Record<string, unknown> = {
        result: {
          gameId: item.gameId
        }
      }
      
      if (options?.startDate || options?.endDate) {
        prizeWhere.createdAt = where.createdAt
      }

      const prizes = await prisma.winner.aggregate({
        where: prizeWhere,
        _sum: {
          prizeAmount: true
        }
      })

      return {
        gameId: item.gameId,
        gameName: gameMap.get(item.gameId) || 'Desconocido',
        ticketCount: item._count,
        totalAmount: item._sum.amount || 0,
        prizesAmount: prizes._sum.prizeAmount || 0
      }
    })
  )

  return results
}

export async function getNumberFrequency(options?: {
  gameId?: string
  limit?: number
}): Promise<{ number: string; frequency: number }[]> {
  const where: Record<string, unknown> = {}
  
  if (options?.gameId) {
    where.gameId = options.gameId
  }

  const items = await prisma.ticketItem.groupBy({
    by: ['number'],
    where,
    _count: true,
    orderBy: {
      _count: {
        number: 'desc'
      }
    },
    take: options?.limit || 20
  })

  return items.map(item => ({
    number: item.number,
    frequency: item._count
  }))
}
