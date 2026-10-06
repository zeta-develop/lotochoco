import { requireCompanyId } from '@/lib/supabase/company'
import { getSalesReport } from '@/features/reports/repositories/reports.repository'
import { getCashSummary } from '@/features/cash/repositories/cash.repository'
import { supabase } from '@/lib/supabase/client';
import type { DashboardStats, DashboardTodayResult, DashboardPendingWinner, DashboardCashSummary } from '../domain/types';

export class DashboardRepository {
  async getDailyStats(startDate: Date, endDate: Date): Promise<DashboardStats> {
    return getSalesReport({ startDate, endDate })
  }

  async getTodayResults(startDate: Date, endDate: Date): Promise<DashboardTodayResult[]> {
    const { data: results, error } = await supabase
      .from('results')
      .select(`id, winning_number, games (name), draw_schedules (name)`)
      .eq('company_id', await requireCompanyId()).is('deleted_at', null)
      .gte('draw_date', startDate.toISOString())
      .lte('draw_date', endDate.toISOString())
      .order('draw_date', { ascending: false })
      .limit(5);

    if (error) throw error
    if (!results) return [];

    return results.map((r: any) => ({
      id: r.id,
      gameName: r.games?.name || 'Desconocido',
      scheduleName: r.draw_schedules?.name || 'Desconocido',
      winningNumber: r.winning_number,
    }));
  }

  async getPendingWinners(): Promise<DashboardPendingWinner[]> {
    const { data: winners, error } = await supabase
      .from('winners')
      .select(`
        id, 
        prize_amount, 
        tickets (ticket_number), 
        results (winning_number, games (name))
      `)
      .eq('company_id', await requireCompanyId()).eq('is_paid', 0)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error
    if (!winners) return [];

    return winners.map((w: any) => ({
      id: w.id,
      ticketNumber: w.tickets?.ticket_number || '---',
      gameName: w.results?.games?.name || 'Desconocido',
      winningNumber: w.results?.winning_number || '---',
      prizeAmount: w.prize_amount,
    }));
  }

  async getCashSummary(): Promise<DashboardCashSummary> {
    return getCashSummary()
  }
}
export const dashboardRepository = new DashboardRepository()
