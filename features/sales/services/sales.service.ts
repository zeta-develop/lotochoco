import { salesRepository } from '../repositories/sales.repository'
import type { SaleRequest } from '../domain/types'
import type { Ticket } from '@/lib/types'

export function validateSale(request: SaleRequest): void {
  if (!request.items?.length) throw new Error('El carrito está vacío')
  if (request.items.some(item => !Number.isFinite(item.amount) || item.amount <= 0 || !item.gameId || !/^\d+$/.test(item.number) || !item.schedule)) {
    throw new Error('Hay jugadas inválidas')
  }
}
export class SalesService {
  async processSale(request: SaleRequest): Promise<Ticket> {
    validateSale(request)
    return salesRepository.createSale(request)
  }
}
export const salesService = new SalesService()
