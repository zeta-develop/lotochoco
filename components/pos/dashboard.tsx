'use client'

import { useDashboard } from '@/hooks/use-dashboard'
import { DashboardLoading } from '@/components/pos/dashboard/dashboard-loading'
import { DashboardHeader } from '@/components/pos/dashboard/dashboard-header'
import { DashboardStatsGrid } from '@/components/pos/dashboard/dashboard-stats-grid'
import { DashboardResultsCard } from '@/components/pos/dashboard/dashboard-results-card'
import { DashboardPendingWinnersCard } from '@/components/pos/dashboard/dashboard-pending-winners-card'
import { DashboardCashSummaryCard } from '@/components/pos/dashboard/dashboard-cash-summary-card'

type ActiveModule = "dashboard" | "pos" | "games" | "results" | "winners" | "reports" | "cash" | "pyramid" | "settings";

interface DashboardProps {
  onNavigate?: (module: ActiveModule) => void;
}

export function Dashboard(_props: DashboardProps) {
  const { currency, stats, results, pendingWinners, summary, reportLoading } = useDashboard()

  if (reportLoading) {
    return <DashboardLoading />
  }

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      <DashboardHeader />
      <DashboardStatsGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-3 duration-400">
        <DashboardResultsCard results={results} />
        <DashboardPendingWinnersCard winners={pendingWinners} currency={currency} />
      </div>
      <DashboardCashSummaryCard summary={summary} currency={currency} />
    </div>
  )
}
