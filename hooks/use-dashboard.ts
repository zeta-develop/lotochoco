'use client'

import { useCashSummary } from '@/hooks/use-cash'
import { usePendingWinners, useTodayResults } from '@/hooks/use-results'
import { useDailyReport } from '@/hooks/use-reports'
import { useSettings } from '@/hooks/use-settings'
import { buildDashboardStats } from '@/lib/dashboard'

export function useDashboard() {
  const { report, isLoading: reportLoading } = useDailyReport()
  const { results } = useTodayResults()
  const { winners: pendingWinners } = usePendingWinners()
  const { summary } = useCashSummary()
  const { settings } = useSettings()

  const currency = settings.currency || 'C$'
  const stats = buildDashboardStats(report, currency)

  return {
    currency,
    stats,
    results,
    pendingWinners,
    summary,
    reportLoading,
  }
}