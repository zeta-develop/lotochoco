import { cashRepository } from '../repositories/cash.repository'

export const cashService = {
  async openSession(openingAmount: number) {
    return cashRepository.openSession(openingAmount)
  },

  async closeSession(sessionId: string, notes?: string) {
    return cashRepository.closeSession(sessionId, notes)
  },

  async getCurrentSession() {
    return cashRepository.getCurrentSession()
  },

  async getSessionById(id: string) {
    return cashRepository.getSessionById(id)
  },

  async getSessions(options?: { startDate?: Date; endDate?: Date; limit?: number }) {
    return cashRepository.getSessions(options)
  },

  async addMovement(data: { cashSessionId: string; type: 'income' | 'expense' | 'sale' | 'prize_payment'; amount: number; description: string }) {
    return cashRepository.addMovement(data)
  },

  async getSummary(sessionId?: string) {
    return cashRepository.getSummary(sessionId)
  }
}
