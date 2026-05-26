import { ticketsRepository } from '../repositories/tickets.repository'
import type { TicketItem } from '@/lib/types'

export const ticketsService = {
  async createTicket(items: Omit<TicketItem, 'id' | 'ticketId' | 'createdAt'>[], client?: string) {
    return ticketsRepository.createTicket(items, client)
  },

  async getTicketById(id: string) {
    return ticketsRepository.getTicketById(id)
  },

  async searchTicket(searchNumber: string) {
    return ticketsRepository.searchTicket(searchNumber)
  },

  async getTickets(options?: { startDate?: Date; endDate?: Date; status?: string; limit?: number; offset?: number }) {
    return ticketsRepository.getTickets(options)
  },

  async cancelTicket(id: string, reason: string) {
    return ticketsRepository.cancelTicket(id, reason)
  }
}
