import { supabase } from '@/lib/supabase/client'
import { requireCompanyId } from '@/lib/supabase/company'
import { dbEvents } from '@/lib/events'
import { resultsRepository } from '../repositories/results.repository'

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
    const { data, error } = await supabase.rpc('pos_process_result', {
      p_company_id: await requireCompanyId(), p_result_id: id
    })
    if (error) throw error
    dbEvents.emit('results:changed')
    dbEvents.emit('winners:changed')
    return { winnersCount: Number(data) }
  },

  async getHotColdNumbers(gameId?: string, limit?: number) {
    return resultsRepository.getHotColdNumbers(gameId, limit)
  }
}
