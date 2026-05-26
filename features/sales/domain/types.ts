export interface CartItem {
  id: string
  gameId: string
  gameName: string
  number: string
  amount: number
  schedule: string
  scheduleName: string
  multiplier?: number
  client?: string
}

export interface SaleRequest {
  items: Omit<CartItem, 'id'>[]
  client?: string
}
