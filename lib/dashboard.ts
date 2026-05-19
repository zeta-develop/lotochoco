import type { LucideIcon } from 'lucide-react'
import type { SalesReport } from '@/lib/types'
import { DollarSign, Ticket, Trophy, TrendingUp } from 'lucide-react'

export type DashboardStatTone = 'green' | 'blue' | 'orange' | 'red'

export interface DashboardStat {
  title: string
  value: string
  icon: LucideIcon
  tone: DashboardStatTone
}

export function buildDashboardStats(report: SalesReport, currency: string): DashboardStat[] {
  return [
    {
      title: 'Ventas del Día',
      value: `${currency}${report.totalSales.toLocaleString()}`,
      icon: DollarSign,
      tone: 'green',
    },
    {
      title: 'Tickets Vendidos',
      value: report.totalTickets.toString(),
      icon: Ticket,
      tone: 'blue',
    },
    {
      title: 'Premios Pendientes',
      value: `${currency}${report.pendingPrizes.toLocaleString()}`,
      icon: Trophy,
      tone: 'orange',
    },
    {
      title: 'Ganancia Neta',
      value: `${currency}${report.netProfit.toLocaleString()}`,
      icon: TrendingUp,
      tone: report.netProfit >= 0 ? 'green' : 'red',
    },
  ]
}