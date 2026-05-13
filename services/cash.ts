import prisma from '@/lib/db'
import type { CashSession, CashMovement } from '@/lib/types'

export async function openCashSession(openingAmount: number): Promise<CashSession> {
  // Check if there's already an open session
  const existingSession = await prisma.cashSession.findFirst({
    where: { status: 'open' }
  })

  if (existingSession) {
    throw new Error('Ya existe una sesión de caja abierta')
  }

  const session = await prisma.cashSession.create({
    data: {
      openingAmount,
      status: 'open'
    },
    include: {
      movements: true
    }
  })

  return session as unknown as CashSession
}

export async function getCurrentSession(): Promise<CashSession | null> {
  const session = await prisma.cashSession.findFirst({
    where: { status: 'open' },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return session as unknown as CashSession | null
}

export async function closeCashSession(
  sessionId: string,
  notes?: string
): Promise<CashSession> {
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { movements: true }
  })

  if (!session) {
    throw new Error('Sesión no encontrada')
  }

  if (session.status === 'closed') {
    throw new Error('Esta sesión ya está cerrada')
  }

  const closingAmount = 
    session.openingAmount + 
    session.salesTotal - 
    session.prizesTotal + 
    session.movements
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0) -
    session.movements
      .filter(m => m.type === 'expense' && m.amount > 0)
      .reduce((sum, m) => sum + m.amount, 0)

  const updatedSession = await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      status: 'closed',
      closingAmount,
      closedAt: new Date(),
      notes
    },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return updatedSession as unknown as CashSession
}

export async function addCashMovement(data: {
  cashSessionId: string
  type: 'income' | 'expense'
  amount: number
  description: string
}): Promise<CashMovement> {
  const movement = await prisma.cashMovement.create({
    data
  })

  return movement as CashMovement
}

export async function getCashSessions(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<CashSession[]> {
  const where: Record<string, unknown> = {}

  if (options?.startDate || options?.endDate) {
    where.openedAt = {}
    if (options.startDate) {
      (where.openedAt as Record<string, Date>).gte = options.startDate
    }
    if (options.endDate) {
      (where.openedAt as Record<string, Date>).lte = options.endDate
    }
  }

  const sessions = await prisma.cashSession.findMany({
    where,
    include: {
      movements: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { openedAt: 'desc' },
    take: options?.limit || 30
  })

  return sessions as unknown as CashSession[]
}

export async function getCashSessionById(id: string): Promise<CashSession | null> {
  const session = await prisma.cashSession.findUnique({
    where: { id },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return session as unknown as CashSession | null
}

export async function getCashSummary(sessionId?: string): Promise<{
  openingAmount: number
  salesTotal: number
  prizesTotal: number
  incomeTotal: number
  expenseTotal: number
  balance: number
}> {
  let session: CashSession | null = null

  if (sessionId) {
    session = await getCashSessionById(sessionId)
  } else {
    session = await getCurrentSession()
  }

  if (!session) {
    return {
      openingAmount: 0,
      salesTotal: 0,
      prizesTotal: 0,
      incomeTotal: 0,
      expenseTotal: 0,
      balance: 0
    }
  }

  const incomeTotal = session.movements
    ?.filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0) || 0

  const expenseTotal = session.movements
    ?.filter(m => m.type === 'expense' && m.amount > 0)
    .reduce((sum, m) => sum + m.amount, 0) || 0

  const balance = 
    session.openingAmount + 
    session.salesTotal - 
    session.prizesTotal + 
    incomeTotal - 
    expenseTotal

  return {
    openingAmount: session.openingAmount,
    salesTotal: session.salesTotal,
    prizesTotal: session.prizesTotal,
    incomeTotal,
    expenseTotal,
    balance
  }
}
