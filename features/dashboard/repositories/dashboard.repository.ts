import { supabase } from '@/lib/supabase/client';
import type { DashboardStats, DashboardTodayResult, DashboardPendingWinner, DashboardCashSummary } from '../domain/types';

export class DashboardRepository {
  async getDailyStats(startDate: Date, endDate: Date): Promise<DashboardStats> {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('total_amount')
      .eq('status', 'active')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalSales = tickets ? tickets.reduce((sum, t) => sum + (t.total_amount || 0), 0) : 0;
    const totalTickets = tickets ? tickets.length : 0;

    const { data: winners } = await supabase
      .from('winners')
      .select('prize_amount, is_paid')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    let totalPrizes = 0;
    let totalPaid = 0;
    
    if (winners) {
      for (const w of winners) {
        totalPrizes += (w.prize_amount || 0);
        if (w.is_paid === 1 || w.is_paid === true) {
          totalPaid += (w.prize_amount || 0);
        }
      }
    }

    const pendingPrizes = totalPrizes - totalPaid;
    const netProfit = totalSales - totalPrizes;

    return { totalSales, totalTickets, pendingPrizes, netProfit };
  }

  async getTodayResults(startDate: Date, endDate: Date): Promise<DashboardTodayResult[]> {
    const { data: results, error } = await supabase
      .from('results')
      .select(`id, winning_number, games (name), draw_schedules (name)`)
      .is('deleted_at', null)
      .gte('draw_date', startDate.toISOString())
      .lte('draw_date', endDate.toISOString())
      .order('draw_date', { ascending: false })
      .limit(5);

    if (error || !results) return [];

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
      .eq('is_paid', 0)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !winners) return [];

    return winners.map((w: any) => ({
      id: w.id,
      ticketNumber: w.tickets?.ticket_number || '---',
      gameName: w.results?.games?.name || 'Desconocido',
      winningNumber: w.results?.winning_number || '---',
      prizeAmount: w.prize_amount,
    }));
  }

  async getCashSummary(): Promise<DashboardCashSummary> {
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .limit(1)
      .single();

    if (!session) {
      return { openingAmount: 0, salesTotal: 0, prizesTotal: 0, incomeTotal: 0, expenseTotal: 0, balance: 0 };
    }

    return {
      openingAmount: session.opening_amount || 0,
      salesTotal: session.sales_total || 0,
      prizesTotal: session.prizes_total || 0,
      incomeTotal: session.income_total || 0,
      expenseTotal: session.expense_total || 0,
      balance: (session.opening_amount || 0) + (session.sales_total || 0) - (session.prizes_total || 0) + (session.income_total || 0) - (session.expense_total || 0),
    };
  }
}

export const dashboardRepository = new DashboardRepository();
