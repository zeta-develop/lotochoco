'use client';

import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardData } from '../domain/types';
import { dbEvents } from '@/lib/events';

export function useDashboard(date?: Date) {
  const [data, setData] = useState<DashboardData>({
    stats: { totalSales: 0, totalTickets: 0, pendingPrizes: 0, netProfit: 0 },
    todayResults: [],
    pendingWinners: [],
    cashSummary: { openingAmount: 0, salesTotal: 0, prizesTotal: 0, incomeTotal: 0, expenseTotal: 0, balance: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const dashboardData = await dashboardService.getDashboardData(date);
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar dashboard'));
    }
  }, [date]);

  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  useEffect(() => {
    // Listen to all relevant events that should trigger a dashboard refresh
    const handleRefresh = () => refresh();
    
    const unsubTickets = dbEvents.on('tickets:changed', handleRefresh);
    const unsubCash = dbEvents.on('cash:changed', handleRefresh);
    const unsubResults = dbEvents.on('results:changed', handleRefresh);
    const unsubWinners = dbEvents.on('winners:changed', handleRefresh);

    return () => {
      unsubTickets();
      unsubCash();
      unsubResults();
      unsubWinners();
    };
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    refresh
  };
}
