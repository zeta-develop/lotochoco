export interface DashboardStats {
  totalSales: number;
  totalTickets: number;
  pendingPrizes: number;
  netProfit: number;
}

export interface DashboardTodayResult {
  id: string;
  gameName: string;
  scheduleName: string;
  winningNumber: string;
}

export interface DashboardPendingWinner {
  id: string;
  ticketNumber: string;
  gameName: string;
  winningNumber: string;
  prizeAmount: number;
}

export interface DashboardCashSummary {
  openingAmount: number;
  salesTotal: number;
  prizesTotal: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
}

export interface DashboardData {
  stats: DashboardStats;
  todayResults: DashboardTodayResult[];
  pendingWinners: DashboardPendingWinner[];
  cashSummary: DashboardCashSummary;
}
