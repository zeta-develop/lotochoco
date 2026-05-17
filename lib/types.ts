// Types for Lottery POS System

export interface Game {
  id: string
  name: string
  isActive: boolean
  digitCount: number
  multiplier: number
  createdAt: Date
  updatedAt: Date
  schedules?: DrawSchedule[]
}

export interface DrawSchedule {
  id: string
  gameId: string
  name: string
  time: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  game?: Game
}

export interface Ticket {
  id: string
  ticketNumber: string
  client?: string | null
  totalAmount: number
  status: 'active' | 'cancelled' | 'paid'
  cancelReason?: string | null
  cancelledAt?: Date | null
  createdAt: Date
  updatedAt: Date
  items?: TicketItem[]
  winners?: Winner[]
}

export interface TicketItem {
  id: string
  ticketId: string
  gameId: string
  number: string
  amount: number
  schedule: string
  createdAt: Date
  ticket?: Ticket
  game?: Game
}

export interface Result {
  id: string
  gameId: string
  scheduleId: string
  winningNumber: string
  drawDate: Date
  isProcessed: boolean
  createdAt: Date
  updatedAt: Date
  game?: Game
  schedule?: DrawSchedule
  winners?: Winner[]
}

export interface Winner {
  id: string
  ticketId: string
  resultId: string
  prizeAmount: number
  isPaid: boolean
  paidAt?: Date | null
  createdAt: Date
  updatedAt: Date
  ticket?: Ticket
  result?: Result
}

export interface CashSession {
  id: string
  openingAmount: number
  closingAmount?: number | null
  salesTotal: number
  prizesTotal: number
  status: 'open' | 'closed'
  openedAt: Date
  closedAt?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  movements?: CashMovement[]
}

export interface CashMovement {
  id: string
  cashSessionId: string
  type: 'income' | 'expense' | 'sale' | 'prize_payment'
  amount: number
  description: string
  createdAt: Date
  cashSession?: CashSession
}

export interface Setting {
  id: string
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface CancellationLog {
  id: string
  ticketId: string
  ticketNumber: string
  totalAmount: number
  reason: string
  itemsJson: string
  createdAt: Date
}

// POS specific types
export interface CartItem {
  id: string
  gameId: string
  gameName: string
  number: string
  amount: number
  schedule: string
  scheduleName: string
  multiplier: number
  client?: string
}

export interface SalesReport {
  totalSales: number
  totalTickets: number
  totalPrizes: number
  totalPaid: number
  pendingPrizes: number
  netProfit: number
}

export interface HotColdNumber {
  number: string
  frequency: number
  type: 'hot' | 'cold'
}

export interface PyramidResult {
  layers: string[][]
  luckyNumber: string
  date: string
}

// Settings keys
export type SettingKey = 
  | 'businessName'
  | 'currency'
  | 'ticketMessage'
  | 'printerType'
  | 'printerAddress'
  | 'darkMode'
  | 'bluetoothDeviceId'
  | 'bluetoothDeviceName'
  | 'ticketFontSize'
  | 'ticketFontType'
  | 'ticketDensity'
