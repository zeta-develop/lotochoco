import { salesRepository } from '../repositories/sales.repository';
import type { SaleRequest } from '../domain/types';
import type { Ticket } from '@/lib/types';

export class SalesService {
  async processSale(request: SaleRequest): Promise<Ticket> {
    if (!request.items || request.items.length === 0) {
      throw new Error('El carrito está vacío');
    }

    const invalidItems = request.items.filter(item => item.amount <= 0);
    if (invalidItems.length > 0) {
      throw new Error('Hay jugadas con montos inválidos');
    }

    return await salesRepository.createSale(request);
  }
}

export const salesService = new SalesService();
