import type { SalesReport } from '@/lib/types'
import { supabase } from '@/lib/supabase/client'
import { requireCompanyId } from '@/lib/supabase/company'

async function reportRpc(name: string, options?: { startDate?: Date; endDate?: Date }) {
  const { data, error } = await supabase.rpc(name, {
    p_company_id: await requireCompanyId(),
    p_start: options?.startDate?.toISOString() || null,
    p_end: options?.endDate?.toISOString() || null
  })
  if (error) throw error
  return data
}
export async function getSalesReport(options?: { startDate?: Date; endDate?: Date }): Promise<SalesReport> {
  return reportRpc('pos_sales_report', options)
}
export async function getGameStats(options?: { startDate?: Date; endDate?: Date }): Promise<any[]> {
  return reportRpc('pos_game_stats', options)
}
export async function getHotColdNumbers(options?: { gameId?: string; limit?: number }): Promise<{ number: string; frequency: number; type: 'hot' | 'cold' }[]> {
  const { data, error } = await supabase.rpc('pos_hot_cold_numbers', {
    p_company_id: await requireCompanyId(), p_game_id: options?.gameId || null, p_limit: options?.limit || 5
  })
  if (error) throw error
  return data || []
}
export const reportsRepository = { getSales: getSalesReport, getHotColdNumbers, getGameStats }
