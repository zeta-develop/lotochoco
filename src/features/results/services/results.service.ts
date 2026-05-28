import { dbEvents } from '@/lib/events'
import { resultsRepository } from '../repositories/results.repository'
import { winnersRepository } from '@/features/winners/repositories/winners.repository'

export const resultsService = {
  async getAll() {
    return resultsRepository.getResults()
  },

  async getResults(options?: { startDate?: Date; endDate?: Date; gameId?: string; limit?: number }) {
    return resultsRepository.getResults(options)
  },

  async add(data: { gameId: string; scheduleId: string; winningNumber: string; drawDate?: Date }) {
    const result = await resultsRepository.addResult(data)
    dbEvents.emit('results:changed')
    return result
  },

  async process(id: string): Promise<{ winnersCount: number }> {
    const result = await resultsRepository.getResultById(id)
    if (!result) throw new Error("Resultado no encontrado")
    if (result.isProcessed) throw new Error("El resultado ya fue procesado")

    console.log(`Buscando ganadores para: Juego=${result.gameId}, Hora=${result.schedule?.time}, Nombre=${result.schedule?.name}, Numero=${result.winningNumber}`)
    const matchingItems = await resultsRepository.findMatchingTicketsForProcessing(
      result.gameId, 
      result.schedule?.time || '', 
      result.schedule?.name || '',
      result.winningNumber
    )
    console.log(`Tickets encontrados: ${matchingItems?.length || 0}`)

    let winnersCount = 0
    if (matchingItems && matchingItems.length > 0) {
      const winnersToInsert = matchingItems.map((item: any) => ({
        ticket_id: item.ticket_id,
        company_id: item.company_id,
        result_id: id,
        prize_amount: item.amount * (result.game?.multiplier || 70)
      }))

      await winnersRepository.insertWinners(winnersToInsert)
      winnersCount = winnersToInsert.length
    }

    await resultsRepository.updateResultStatus(id, true)
    dbEvents.emit("results:changed")
    dbEvents.emit("winners:changed")

    return { winnersCount }
  },

  async getHotColdNumbers(gameId?: string, limit?: number) {
    return resultsRepository.getHotColdNumbers(gameId, limit)
  }
}
