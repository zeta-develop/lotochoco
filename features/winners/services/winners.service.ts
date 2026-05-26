import { dbEvents } from '@/lib/events'
import { winnersRepository } from '../repositories/winners.repository'

export const winnersService = {
  async getWinners() {
    return winnersRepository.getWinners()
  },

  async getPendingWinners() {
    return winnersRepository.getPendingWinners()
  },

  async markAsPaid(winnerId: string) {
    await winnersRepository.markAsPaid(winnerId)
    dbEvents.emit('winners:changed')
  }
}
