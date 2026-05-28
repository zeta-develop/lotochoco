import { startOfDay, endOfDay } from 'date-fns';
import { dashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardData } from '../domain/types';

export class DashboardService {
  async getDashboardData(date?: Date): Promise<DashboardData> {
    const targetDate = date || new Date();
    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

    const [stats, todayResults, pendingWinners, cashSummary] = await Promise.all([
      dashboardRepository.getDailyStats(startDate, endDate),
      dashboardRepository.getTodayResults(startDate, endDate),
      dashboardRepository.getPendingWinners(),
      dashboardRepository.getCashSummary()
    ]);

    return {
      stats,
      todayResults,
      pendingWinners,
      cashSummary
    };
  }
}

export const dashboardService = new DashboardService();
