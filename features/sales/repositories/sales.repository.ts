import { useAuthStore } from '@/store/auth-store'
import { supabase } from '@/lib/supabase/client'
import { requireCompanyId } from '@/lib/supabase/company'
import type { SaleRequest } from '../domain/types'
import type { Ticket } from '@/lib/types'
import { ticketsService } from '@/features/tickets/services/tickets.service'
import { dbEvents } from '@/lib/events'

export class SalesRepository {
  async createSale(request: SaleRequest): Promise<Ticket> {
    const initialUserId = useAuthStore.getState().user?.id
    const initialSelection = useAuthStore.getState().selectedCompanyId
    const assertAccount = () => {
      const current = useAuthStore.getState()
      if (current.user?.id !== initialUserId || current.selectedCompanyId !== initialSelection) {
        throw new Error('La cuenta cambió durante la venta. Recupera la operación con su cuenta original')
      }
    }
    const companyId = await requireCompanyId()
    assertAccount()
    if (request.companyId && request.companyId !== companyId) throw new Error('La venta pertenece a otra empresa')
    if (!request.requestId) throw new Error('La venta necesita una clave de operación')
    const { data: ticketId, error } = await supabase.rpc('pos_create_sale', {
      p_company_id: companyId, p_request_id: request.requestId,
      p_client: request.client || null,
      p_items: request.items.map(({ gameId, number, amount, schedule }) => ({ gameId, number, amount, schedule }))
    })
    assertAccount()
    if (error) {
      const rolledBack = /^(P0001|22[A-Z0-9]{3}|23[A-Z0-9]{3}|42501)$/.test(error.code || '')
      throw Object.assign(new Error(error.message), { code: error.code, saleRolledBack: rolledBack })
    }
    const ticket = await ticketsService.getTicketById(ticketId)
    assertAccount()
    if (!ticket) throw new Error('Venta registrada; reintenta con la misma operación para recuperar el ticket')
    dbEvents.emit('tickets:changed')
    dbEvents.emit('cash:changed')
    return ticket
  }
}
export const salesRepository = new SalesRepository()
