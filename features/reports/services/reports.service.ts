import { reportsRepository } from '../repositories/reports.repository'

export const reportsService = {
  async getSales(options?: { startDate?: Date; endDate?: Date }) {
    return reportsRepository.getSales(options)
  },

  async getHotColdNumbers(options?: { gameId?: string; limit?: number }) {
    return reportsRepository.getHotColdNumbers(options)
  },

  async getGameStats(options?: { startDate?: Date; endDate?: Date }) {
    return reportsRepository.getGameStats(options)
  }
}
