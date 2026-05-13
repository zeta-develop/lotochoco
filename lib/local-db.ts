import type {
  CashMovement,
  CashSession,
  CancellationLog,
  CartItem,
  DrawSchedule,
  Game,
  PyramidResult,
  Result,
  SalesReport,
  SettingKey,
  Ticket,
  TicketItem,
  Winner,
} from '@/lib/types'

type LocalState = {
  games: Game[]
  tickets: Ticket[]
  results: Result[]
  winners: Winner[]
  cashSessions: CashSession[]
  cancellations: CancellationLog[]
  settings: Record<string, string>
}

const STORAGE_KEY = 'lotochoco.offline.v1'
export const OFFLINE_DB_UPDATED_EVENT = 'lotochoco:offline-db-updated'

const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  businessName: 'Loteria La Fortuna',
  currency: 'C$',
  ticketMessage: 'Gracias por su compra! Buena suerte!',
  printerType: 'network',
  printerAddress: '',
  darkMode: 'false',
}

const DEFAULT_GAMES: Array<{
  name: string
  digitCount: number
  multiplier: number
  schedules: { name: string; time: string }[]
}> = [
  {
    name: 'Quiniela',
    digitCount: 2,
    multiplier: 70,
    schedules: [
      { name: 'Mañana', time: '11:00' },
      { name: 'Mediodia', time: '14:00' },
      { name: 'Tarde', time: '18:00' },
      { name: 'Noche', time: '21:00' },
    ],
  },
  {
    name: 'Nica',
    digitCount: 3,
    multiplier: 500,
    schedules: [
      { name: 'Mediodia', time: '12:00' },
      { name: 'Noche', time: '20:00' },
    ],
  },
  {
    name: 'Tica',
    digitCount: 3,
    multiplier: 500,
    schedules: [
      { name: 'Mediodia', time: '13:00' },
      { name: 'Noche', time: '19:00' },
    ],
  },
  {
    name: 'La Diaria',
    digitCount: 2,
    multiplier: 65,
    schedules: [
      { name: '11AM', time: '11:00' },
      { name: '3PM', time: '15:00' },
      { name: '9PM', time: '21:00' },
    ],
  },
  {
    name: 'Super Chance',
    digitCount: 1,
    multiplier: 8,
    schedules: [
      { name: 'Mañana', time: '10:00' },
      { name: 'Tarde', time: '16:00' },
      { name: 'Noche', time: '22:00' },
    ],
  },
]

function now() {
  return new Date().toISOString()
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function createInitialState(): LocalState {
  const gameSeeds = DEFAULT_GAMES.map((game) => ({
    id: createId(),
    name: game.name,
    isActive: true,
    digitCount: game.digitCount,
    multiplier: game.multiplier,
    createdAt: now(),
    updatedAt: now(),
    schedules: game.schedules.map((schedule) => ({
      id: createId(),
      gameId: '',
      name: schedule.name,
      time: schedule.time,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    })),
  }))

  for (const game of gameSeeds) {
    for (const schedule of game.schedules ?? []) {
      schedule.gameId = game.id
    }
  }

  return {
    games: gameSeeds,
    tickets: [],
    results: [],
    winners: [],
    cashSessions: [],
    cancellations: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

function loadState(): LocalState {
  if (typeof window === 'undefined') {
    return createInitialState()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initialState = createInitialState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState))
    return initialState
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalState>
    return {
      games: parsed.games || [],
      tickets: parsed.tickets || [],
      results: parsed.results || [],
      winners: parsed.winners || [],
      cashSessions: parsed.cashSessions || [],
      cancellations: parsed.cancellations || [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    }
  } catch {
    const initialState = createInitialState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState))
    return initialState
  }
}

function saveState(state: LocalState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function notifyStateUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OFFLINE_DB_UPDATED_EVENT))
}

function withState<T>(mutator: (state: LocalState) => T): T {
  const state = loadState()
  const result = mutator(state)
  saveState(state)
  notifyStateUpdated()
  return result
}

function dateOnly(value: string | Date) {
  const date = new Date(value)
  return date.toISOString().slice(0, 10)
}

function sameDay(a: string | Date, b: string | Date) {
  return dateOnly(a) === dateOnly(b)
}

function getGameMap(state: LocalState) {
  return new Map(state.games.map((game) => [game.id, game]))
}

function getScheduleMap(state: LocalState) {
  const map = new Map<string, DrawSchedule>()
  for (const game of state.games) {
    for (const schedule of game.schedules || []) {
      map.set(schedule.id, schedule)
    }
  }
  return map
}

function hydrateTicket(ticket: Ticket, state: LocalState): Ticket {
  const gameMap = getGameMap(state)
  return {
    ...ticket,
    items: (ticket.items || []).map((item) => ({
      ...item,
      game: gameMap.get(item.gameId),
    })),
    winners: state.winners
      .filter((winner) => winner.ticketId === ticket.id)
      .map((winner) => ({
        ...winner,
        ticket: undefined,
        result: undefined,
      })),
  }
}

function hydrateResult(result: Result, state: LocalState): Result {
  const gameMap = getGameMap(state)
  const scheduleMap = getScheduleMap(state)
  return {
    ...result,
    game: gameMap.get(result.gameId),
    schedule: scheduleMap.get(result.scheduleId),
    winners: state.winners
      .filter((winner) => winner.resultId === result.id)
      .map((winner) => ({
        ...winner,
        ticket: undefined,
        result: undefined,
      })),
  }
}

function hydrateWinner(winner: Winner, state: LocalState): Winner {
  const ticket = state.tickets.find((item) => item.id === winner.ticketId)
  const result = state.results.find((item) => item.id === winner.resultId)
  return {
    ...winner,
    ticket: ticket
      ? {
          ...hydrateTicket(ticket, state),
          winners: [],
        }
      : undefined,
    result: result
      ? {
          ...hydrateResult(result, state),
          winners: [],
        }
      : undefined,
  }
}

function hydrateSession(session: CashSession, state: LocalState): CashSession {
  return {
    ...session,
    movements: session.movements || [],
  }
}

function getOpenSession(state: LocalState) {
  return state.cashSessions.find((session) => session.status === 'open') || null
}

export function bootstrapOfflineData() {
  if (typeof window === 'undefined') return
  loadState()
  // Attempt async migration to SQLite on native devices for durability.
  // Fire-and-forget: failures will not break the app and localStorage remains the fallback.
  ;(async () => {
    try {
      const adapter = await import('./sqlite-adapter')
      await adapter.migrateLocalStorageToSQLite()
    } catch {
      // ignore
    }
  })()
}

export function getOfflineGames(activeOnly = true): Game[] {
  const state = loadState()
  return [...state.games]
    .filter((game) => (activeOnly ? game.isActive : true))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((game) => ({
      ...game,
      schedules: [...(game.schedules || [])].filter((schedule) => schedule.isActive).sort((a, b) => a.time.localeCompare(b.time)),
    }))
}

export function getOfflineGameById(id: string): Game | null {
  const state = loadState()
  const game = state.games.find((item) => item.id === id)
  if (!game) return null
  return {
    ...game,
    schedules: [...(game.schedules || [])].sort((a, b) => a.time.localeCompare(b.time)),
  }
}

export function createOfflineGame(data: {
  name: string
  digitCount: number
  multiplier: number
  schedules?: { name: string; time: string }[]
}): Game {
  return withState((state) => {
    const game: Game = {
      id: createId(),
      name: data.name,
      isActive: true,
      digitCount: data.digitCount,
      multiplier: data.multiplier,
      createdAt: now(),
      updatedAt: now(),
      schedules: (data.schedules || []).map((schedule) => ({
        id: createId(),
        gameId: '',
        name: schedule.name,
        time: schedule.time,
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      })),
    }

    for (const schedule of game.schedules || []) {
      schedule.gameId = game.id
    }

    state.games.push(game)
    return game
  })
}

export function updateOfflineGame(id: string, data: Partial<{ name: string; digitCount: number; multiplier: number; isActive: boolean }>): Game {
  return withState((state) => {
    const game = state.games.find((item) => item.id === id)
    if (!game) {
      throw new Error('Juego no encontrado')
    }

    Object.assign(game, data, { updatedAt: now() })
    return game
  })
}

export function deleteOfflineGame(id: string): void {
  withState((state) => {
    state.games = state.games.filter((game) => game.id !== id)
    state.results = state.results.filter((result) => result.gameId !== id)
    state.tickets = state.tickets.filter((ticket) => !ticket.items?.some((item) => item.gameId === id))
    state.winners = state.winners.filter((winner) => {
      const ticket = state.tickets.find((item) => item.id === winner.ticketId)
      return ticket ? ticket.items?.every((item) => item.gameId !== id) : false
    })
  })
}

export function createOfflineSchedule(gameId: string, schedule: { name: string; time: string }): DrawSchedule {
  return withState((state) => {
    const game = state.games.find((item) => item.id === gameId)
    if (!game) {
      throw new Error('Juego no encontrado')
    }

    const newSchedule: DrawSchedule = {
      id: createId(),
      gameId,
      name: schedule.name,
      time: schedule.time,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    }

    game.schedules = [...(game.schedules || []), newSchedule]
    game.updatedAt = now()
    return newSchedule
  })
}

export function updateOfflineSchedule(id: string, data: Partial<{ name: string; time: string; isActive: boolean }>): DrawSchedule {
  return withState((state) => {
    for (const game of state.games) {
      const schedule = game.schedules?.find((item) => item.id === id)
      if (schedule) {
        Object.assign(schedule, data, { updatedAt: now() })
        game.updatedAt = now()
        return schedule
      }
    }

    throw new Error('Horario no encontrado')
  })
}

export function deleteOfflineSchedule(id: string): void {
  withState((state) => {
    for (const game of state.games) {
      game.schedules = (game.schedules || []).filter((schedule) => schedule.id !== id)
    }
  })
}

export function getOfflineSettings(): Record<string, string> {
  const state = loadState()
  return { ...state.settings }
}

export function updateOfflineSettings(settings: Partial<Record<SettingKey, string>>): Record<string, string> {
  return withState((state) => {
    state.settings = {
      ...state.settings,
      ...settings,
    }
    return { ...state.settings }
  })
}

export function openOfflineCashSession(openingAmount: number): CashSession {
  return withState((state) => {
    const session: CashSession = {
      id: createId(),
      openingAmount,
      closingAmount: null,
      salesTotal: 0,
      prizesTotal: 0,
      status: 'open',
      openedAt: now(),
      closedAt: null,
      notes: null,
      createdAt: now(),
      updatedAt: now(),
      movements: [],
    }

    state.cashSessions.push(session)
    return session
  })
}

export function closeOfflineCashSession(sessionId: string, notes?: string): CashSession {
  return withState((state) => {
    const session = state.cashSessions.find((item) => item.id === sessionId)
    if (!session) {
      throw new Error('Sesión de caja no encontrada')
    }

    session.status = 'closed'
    session.closedAt = now()
    session.notes = notes || null
    session.closingAmount = session.openingAmount + session.salesTotal - session.prizesTotal + getIncomeTotal(session) - getExpenseTotal(session)
    session.updatedAt = now()
    return session
  })
}

export function addOfflineCashMovement(data: { cashSessionId: string; type: 'income' | 'expense' | 'sale' | 'prize_payment'; amount: number; description: string }): CashMovement {
  return withState((state) => {
    const session = state.cashSessions.find((item) => item.id === data.cashSessionId)
    if (!session) {
      throw new Error('Sesión de caja no encontrada')
    }

    const movement: CashMovement = {
      id: createId(),
      cashSessionId: data.cashSessionId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      createdAt: now(),
    }

    session.movements = [...(session.movements || []), movement]
    if (data.type === 'sale') session.salesTotal += data.amount
    if (data.type === 'prize_payment') session.prizesTotal += data.amount
    session.updatedAt = now()
    return movement
  })
}

function getIncomeTotal(session: CashSession) {
  return session.movements?.filter((movement) => movement.type === 'income').reduce((sum, movement) => sum + movement.amount, 0) || 0
}

function getExpenseTotal(session: CashSession) {
  return session.movements?.filter((movement) => movement.type === 'expense').reduce((sum, movement) => sum + movement.amount, 0) || 0
}

export function getOfflineCurrentSession(): CashSession | null {
  const state = loadState()
  const session = getOpenSession(state)
  return session ? hydrateSession(session, state) : null
}

export function getOfflineCashSummary(sessionId?: string): {
  openingAmount: number
  salesTotal: number
  prizesTotal: number
  incomeTotal: number
  expenseTotal: number
  balance: number
} {
  const state = loadState()
  const session = sessionId ? state.cashSessions.find((item) => item.id === sessionId) : getOpenSession(state)
  if (!session) {
    return { openingAmount: 0, salesTotal: 0, prizesTotal: 0, incomeTotal: 0, expenseTotal: 0, balance: 0 }
  }

  const incomeTotal = getIncomeTotal(session)
  const expenseTotal = getExpenseTotal(session)
  const balance = session.openingAmount + session.salesTotal - session.prizesTotal + incomeTotal - expenseTotal

  return {
    openingAmount: session.openingAmount,
    salesTotal: session.salesTotal,
    prizesTotal: session.prizesTotal,
    incomeTotal,
    expenseTotal,
    balance,
  }
}

export function getOfflineCashSessions(options?: { startDate?: Date; endDate?: Date; limit?: number }): CashSession[] {
  const state = loadState()
  const sessions = state.cashSessions.filter((session) => {
    if (options?.startDate && new Date(session.openedAt) < options.startDate) return false
    if (options?.endDate && new Date(session.openedAt) > options.endDate) return false
    return true
  })

  return sessions.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()).slice(0, options?.limit || sessions.length).map((session) => hydrateSession(session, state))
}

export function createOfflineTicket(items: CartItem[]): Ticket {
  return withState((state) => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
    const ticketNumber = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const ticket: Ticket = {
      id: createId(),
      ticketNumber,
      totalAmount,
      status: 'active',
      cancelReason: null,
      cancelledAt: null,
      createdAt: now(),
      updatedAt: now(),
      items: items.map((item) => ({
        id: createId(),
        ticketId: '',
        gameId: item.gameId,
        number: item.number,
        amount: item.amount,
        schedule: item.schedule,
        createdAt: now(),
      })),
      winners: [],
    }

    for (const item of ticket.items || []) {
      item.ticketId = ticket.id
    }

    state.tickets.push(ticket)

    const openSession = getOpenSession(state)
    if (openSession) {
      openSession.salesTotal += totalAmount
      openSession.movements = [...(openSession.movements || []), {
        id: createId(),
        cashSessionId: openSession.id,
        type: 'sale',
        amount: totalAmount,
        description: `Venta ticket ${ticketNumber}`,
        createdAt: now(),
      }]
      openSession.updatedAt = now()
    }

    return hydrateTicket(ticket, state)
  })
}

export function getOfflineTicketById(id: string): Ticket | null {
  const state = loadState()
  const ticket = state.tickets.find((item) => item.id === id)
  return ticket ? hydrateTicket(ticket, state) : null
}

export function getOfflineTicketByNumber(ticketNumber: string): Ticket | null {
  const state = loadState()
  const ticket = state.tickets.find((item) => item.ticketNumber === ticketNumber)
  return ticket ? hydrateTicket(ticket, state) : null
}

export function getOfflineTickets(options?: { status?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }): { tickets: Ticket[]; total: number } {
  const state = loadState()
  const filtered = state.tickets.filter((ticket) => {
    if (options?.status && ticket.status !== options.status) return false
    if (options?.startDate && new Date(ticket.createdAt) < options.startDate) return false
    if (options?.endDate && new Date(ticket.createdAt) > options.endDate) return false
    return true
  })

  const total = filtered.length
  const paged = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50))
  return { tickets: paged.map((ticket) => hydrateTicket(ticket, state)), total }
}

export function getOfflineTodayTickets(): Ticket[] {
  const state = loadState()
  const today = new Date().toISOString().slice(0, 10)
  return state.tickets.filter((ticket) => sameDay(ticket.createdAt, today)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((ticket) => hydrateTicket(ticket, state))
}

export function cancelOfflineTicket(ticketId: string, reason: string): { success: boolean; message: string } {
  return withState((state) => {
    const ticket = state.tickets.find((item) => item.id === ticketId)
    if (!ticket) return { success: false, message: 'Ticket no encontrado' }
    if (ticket.status !== 'active') return { success: false, message: 'El ticket ya fue cancelado o pagado' }
    if (new Date(ticket.createdAt).getTime() < Date.now() - 5 * 60 * 1000) {
      return { success: false, message: 'Solo se puede cancelar dentro de los primeros 5 minutos' }
    }

    ticket.status = 'cancelled'
    ticket.cancelReason = reason
    ticket.cancelledAt = now()
    ticket.updatedAt = now()

    state.cancellations.push({
      id: createId(),
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      totalAmount: ticket.totalAmount,
      reason,
      itemsJson: JSON.stringify(ticket.items || []),
      createdAt: now(),
    })

    const openSession = getOpenSession(state)
    if (openSession) {
      openSession.salesTotal -= ticket.totalAmount
      openSession.movements = [...(openSession.movements || []), {
        id: createId(),
        cashSessionId: openSession.id,
        type: 'expense',
        amount: ticket.totalAmount,
        description: `Cancelación ticket ${ticket.ticketNumber}: ${reason}`,
        createdAt: now(),
      }]
      openSession.updatedAt = now()
    }

    return { success: true, message: 'Ticket cancelado exitosamente' }
  })
}

export function getOfflineCancellations(options?: { startDate?: Date; endDate?: Date }): CancellationLog[] {
  const state = loadState()
  return state.cancellations.filter((cancelation) => {
    if (options?.startDate && new Date(cancelation.createdAt) < options.startDate) return false
    if (options?.endDate && new Date(cancelation.createdAt) > options.endDate) return false
    return true
  })
}

export function createOfflineResult(data: { gameId: string; scheduleId: string; winningNumber: string; drawDate?: Date }): Result {
  return withState((state) => {
    const result: Result = {
      id: createId(),
      gameId: data.gameId,
      scheduleId: data.scheduleId,
      winningNumber: data.winningNumber,
      drawDate: (data.drawDate || new Date()).toISOString(),
      isProcessed: false,
      createdAt: now(),
      updatedAt: now(),
    }

    state.results.push(result)
    return hydrateResult(result, state)
  })
}

export function processOfflineResult(resultId: string): { winnersCount: number; totalPrizes: number } {
  return withState((state) => {
    const result = state.results.find((item) => item.id === resultId)
    if (!result) throw new Error('Resultado no encontrado')
    if (result.isProcessed) throw new Error('Este resultado ya fue procesado')

    const resultDate = new Date(result.drawDate)
    const matchingItems = state.tickets.flatMap((ticket) => (ticket.items || []).map((item) => ({ ticket, item }))).filter(({ ticket, item }) => {
      return ticket.status === 'active' && item.gameId === result.gameId && item.schedule === (getScheduleMap(state).get(result.scheduleId)?.time || '') && item.number === result.winningNumber && sameDay(ticket.createdAt, resultDate)
    })

    let totalPrizes = 0
    for (const match of matchingItems) {
      const prizeAmount = match.item.amount * (state.games.find((game) => game.id === result.gameId)?.multiplier || 0)
      totalPrizes += prizeAmount
      const winner: Winner = {
        id: createId(),
        ticketId: match.ticket.id,
        resultId: result.id,
        prizeAmount,
        isPaid: false,
        paidAt: null,
        createdAt: now(),
        updatedAt: now(),
      }
      state.winners.push(winner)

      const openSession = getOpenSession(state)
      if (openSession) {
        openSession.prizesTotal += prizeAmount
        openSession.movements = [...(openSession.movements || []), {
          id: createId(),
          cashSessionId: openSession.id,
          type: 'prize_payment',
          amount: prizeAmount,
          description: `Premio ticket ${match.ticket.ticketNumber}`,
          createdAt: now(),
        }]
        openSession.updatedAt = now()
      }
    }

    result.isProcessed = true
    result.updatedAt = now()
    return { winnersCount: matchingItems.length, totalPrizes }
  })
}

export function getOfflineResults(options?: { gameId?: string; startDate?: Date; endDate?: Date; limit?: number }): Result[] {
  const state = loadState()
  const filtered = state.results.filter((result) => {
    if (options?.gameId && result.gameId !== options.gameId) return false
    if (options?.startDate && new Date(result.drawDate) < options.startDate) return false
    if (options?.endDate && new Date(result.drawDate) > options.endDate) return false
    return true
  })

  return filtered.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()).slice(0, options?.limit || 50).map((result) => hydrateResult(result, state))
}

export function getOfflineTodayResults(): Result[] {
  const state = loadState()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return state.results.filter((result) => {
    const drawDate = new Date(result.drawDate)
    return drawDate >= today && drawDate < tomorrow
  }).sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()).map((result) => hydrateResult(result, state))
}

export function getOfflineWinners(options?: { isPaid?: boolean; startDate?: Date; endDate?: Date }): Winner[] {
  const state = loadState()
  return state.winners.filter((winner) => {
    if (options?.isPaid !== undefined && winner.isPaid !== options.isPaid) return false
    if (options?.startDate && new Date(winner.createdAt) < options.startDate) return false
    if (options?.endDate && new Date(winner.createdAt) > options.endDate) return false
    return true
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((winner) => hydrateWinner(winner, state))
}

export function markOfflineWinnerAsPaid(winnerId: string): Winner {
  return withState((state) => {
    const winner = state.winners.find((item) => item.id === winnerId)
    if (!winner) throw new Error('Ganador no encontrado')
    winner.isPaid = true
    winner.paidAt = now()
    winner.updatedAt = now()

    const openSession = getOpenSession(state)
    if (openSession) {
      openSession.prizesTotal += winner.prizeAmount
      openSession.movements = [...(openSession.movements || []), {
        id: createId(),
        cashSessionId: openSession.id,
        type: 'prize_payment',
        amount: winner.prizeAmount,
        description: `Pago premio ticket ${winner.ticket?.ticketNumber || ''}`,
        createdAt: now(),
      }]
      openSession.updatedAt = now()
    }

    return hydrateWinner(winner, state)
  })
}

export function getOfflineSalesReport(options?: { startDate?: Date; endDate?: Date }): SalesReport {
  const state = loadState()
  const tickets = state.tickets.filter((ticket) => {
    if (ticket.status !== 'active') return false
    if (options?.startDate && new Date(ticket.createdAt) < options.startDate) return false
    if (options?.endDate && new Date(ticket.createdAt) > options.endDate) return false
    return true
  })

  const winners = state.winners.filter((winner) => {
    if (options?.startDate && new Date(winner.createdAt) < options.startDate) return false
    if (options?.endDate && new Date(winner.createdAt) > options.endDate) return false
    return true
  })

  const totalSales = tickets.reduce((sum, ticket) => sum + ticket.totalAmount, 0)
  const totalTickets = tickets.length
  const totalPrizes = winners.reduce((sum, winner) => sum + winner.prizeAmount, 0)
  const totalPaid = winners.filter((winner) => winner.isPaid).reduce((sum, winner) => sum + winner.prizeAmount, 0)
  const pendingPrizes = totalPrizes - totalPaid
  const netProfit = totalSales - totalPrizes

  return { totalSales, totalTickets, totalPrizes, totalPaid, pendingPrizes, netProfit }
}

export function getOfflineDailyReport(date: Date): SalesReport {
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)
  return getOfflineSalesReport({ startDate, endDate })
}

export function getOfflineWeeklyReport(): { days: { date: string; sales: number; prizes: number }[]; totals: SalesReport } {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const days: { date: string; sales: number; prizes: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const report = getOfflineDailyReport(date)
    days.push({ date: date.toISOString().split('T')[0], sales: report.totalSales, prizes: report.totalPrizes })
  }

  return { days, totals: getOfflineSalesReport({ startDate: weekAgo, endDate: today }) }
}

export function getOfflineGameReport(options?: { startDate?: Date; endDate?: Date }): { gameId: string; gameName: string; ticketCount: number; totalAmount: number; prizesAmount: number }[] {
  const state = loadState()
  const results = state.games.map((game) => {
    const tickets = state.tickets.filter((ticket) => {
      const usesGame = (ticket.items || []).some((item) => item.gameId === game.id)
      if (!usesGame) return false
      if (options?.startDate && new Date(ticket.createdAt) < options.startDate) return false
      if (options?.endDate && new Date(ticket.createdAt) > options.endDate) return false
      return ticket.status === 'active'
    })

    const ticketItems = tickets.flatMap((ticket) => (ticket.items || []).filter((item) => item.gameId === game.id))
    const prizesAmount = state.winners.filter((winner) => {
      const result = state.results.find((item) => item.id === winner.resultId)
      return result?.gameId === game.id && (!options?.startDate || new Date(winner.createdAt) >= options.startDate) && (!options?.endDate || new Date(winner.createdAt) <= options.endDate)
    }).reduce((sum, winner) => sum + winner.prizeAmount, 0)

    return {
      gameId: game.id,
      gameName: game.name,
      ticketCount: tickets.length,
      totalAmount: ticketItems.reduce((sum, item) => sum + item.amount, 0),
      prizesAmount,
    }
  })

  return results
}

export function getOfflineNumberFrequency(options?: { gameId?: string; limit?: number }): { number: string; frequency: number }[] {
  const state = loadState()
  const numbers = state.tickets.flatMap((ticket) => (ticket.items || []).filter((item) => !options?.gameId || item.gameId === options.gameId).map((item) => item.number))
  const counts = new Map<string, number>()
  for (const number of numbers) {
    counts.set(number, (counts.get(number) || 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, options?.limit || 20).map(([number, frequency]) => ({ number, frequency }))
}

function buildDigits(date: Date) {
  return date
    .toISOString()
    .replace(/\D/g, '')
    .split('')
    .map((digit) => Number(digit))
}

function reducePyramidRow(row: number[]) {
  const nextRow: number[] = []
  for (let index = 0; index < row.length - 1; index++) {
    const sum = row[index] + row[index + 1]
    nextRow.push(sum > 9 ? Number(String(sum).split('').reduce((sumDigits, digit) => sumDigits + Number(digit), 0)) : sum)
  }
  return nextRow
}

export function generateOfflinePyramid(date: Date): PyramidResult & { rows: number[][] } {
  const firstRow = buildDigits(date)
  const rows: number[][] = [firstRow]
  let currentRow = firstRow

  while (currentRow.length > 1) {
    currentRow = reducePyramidRow(currentRow)
    rows.push(currentRow)
  }

  return {
    rows,
    luckyNumber: String(rows[rows.length - 1]?.[0] ?? 0),
    date: date.toISOString().slice(0, 10),
  }
}

export function generateOfflineReversePyramid(date: Date): PyramidResult & { rows: number[][] } {
  const pyramid = generateOfflinePyramid(date)
  return {
    ...pyramid,
    rows: [...pyramid.rows].reverse(),
  }
}

export function getOfflineLuckyNumbers(pyramid: { rows: number[][] }) {
  return {
    single: pyramid.rows.flat().slice(0, 10).map(String),
    double: pyramid.rows.flat().slice(10, 20).map(String),
    triple: pyramid.rows.flat().slice(20, 30).map(String),
  }
}

export function analyzeOfflineNumber(number: string, pyramid: { rows: number[][] }) {
  const flattened = pyramid.rows.flat().map(String)
  const compatibility = flattened.includes(number) ? 100 : Math.max(0, 100 - Math.abs(Number(number) - Number(flattened[0] || 0)) * 10)
  return {
    compatibility,
    message: compatibility > 75 ? 'Alta compatibilidad con la piramide local' : 'Compatibilidad media o baja con la piramide local',
  }
}
