import getPrisma from '@/lib/db'
import type { Ticket, TicketItem, CartItem } from '@/lib/types'
import { format } from 'date-fns'

// Generate unique ticket number
function generateTicketNumber(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const time = Date.now().toString(36).toUpperCase().slice(-4)
  return `TKT-${date}-${random}${time}`
}

export async function createTicket(items: CartItem[]): Promise<Ticket> {
  const prisma = await getPrisma()
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const ticketNumber = generateTicketNumber()
  const client = items[0]?.client || null

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      totalAmount,
      status: 'active',
      client,
      items: {
        create: items.map((item) => ({
          gameId: item.gameId,
          number: item.number,
          amount: item.amount,
          schedule: item.schedule
        }))
      }
    },
    include: {
      items: {
        include: {
          game: true
        }
      }
    }
  })

  // Update cash session sales if there's an open session
  const openSession = await prisma.cashSession.findFirst({
    where: { status: 'open' }
  })

  if (openSession) {
    await prisma.cashSession.update({
      where: { id: openSession.id },
      data: {
        salesTotal: {
          increment: totalAmount
        }
      }
    })

    await prisma.cashMovement.create({
      data: {
        cashSessionId: openSession.id,
        type: 'sale',
        amount: totalAmount,
        description: `Venta ticket ${ticketNumber}`
      }
    })
  }

  return ticket as unknown as Ticket
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const prisma = await getPrisma()
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          game: true
        }
      },
      winners: {
        include: {
          result: true
        }
      }
    }
  })
  return ticket as unknown as Ticket | null
}

export async function getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  const prisma = await getPrisma()
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      items: {
        include: {
          game: true
        }
      },
      winners: {
        include: {
          result: true
        }
      }
    }
  })
  return ticket as unknown as Ticket | null
}

export async function getTickets(options?: {
  status?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{ tickets: Ticket[]; total: number }> {
  const prisma = await getPrisma()
  const where: Record<string, unknown> = {}
  
  if (options?.status) {
    where.status = options.status
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

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        items: {
          include: {
            game: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0
    }),
    prisma.ticket.count({ where })
  ])

  return { tickets: tickets as unknown as Ticket[], total }
}

export async function getTodayTickets(): Promise<Ticket[]> {
  const prisma = await getPrisma()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      items: {
        include: {
          game: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return tickets as unknown as Ticket[]
}

export async function cancelTicket(
  ticketId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const prisma = await getPrisma()
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { items: true }
  })

  if (!ticket) {
    return { success: false, message: 'Ticket no encontrado' }
  }

  if (ticket.status !== 'active') {
    return { success: false, message: 'El ticket ya fue cancelado o pagado' }
  }

  // Check if within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  if (ticket.createdAt < fiveMinutesAgo) {
    return { 
      success: false, 
      message: 'Solo se puede cancelar dentro de los primeros 5 minutos' 
    }
  }

  // Cancel the ticket
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: new Date()
    }
  })

  // Log the cancellation
  await prisma.cancellationLog.create({
    data: {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      totalAmount: ticket.totalAmount,
      reason,
      itemsJson: JSON.stringify(ticket.items)
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
        salesTotal: {
          decrement: ticket.totalAmount
        }
      }
    })

    await prisma.cashMovement.create({
      data: {
        cashSessionId: openSession.id,
        type: 'expense',
        amount: -ticket.totalAmount,
        description: `Cancelación ticket ${ticket.ticketNumber}: ${reason}`
      }
    })
  }

  return { success: true, message: 'Ticket cancelado exitosamente' }
}

export async function getCancellations(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<{ id: string; ticketNumber: string; totalAmount: number; reason: string; createdAt: Date }[]> {
  const prisma = await getPrisma()
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

  return prisma.cancellationLog.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })
}

export const ticketService = {
  create: createTicket,
  getById: getTicketById,
  getByNumber: getTicketByNumber,
  getTickets,
  getTodayTickets,
  cancelTicket,
  getCancellations
}
