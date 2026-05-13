'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDailyReport } from '@/hooks/use-reports'
import { useTodayResults } from '@/hooks/use-results'
import { usePendingWinners } from '@/hooks/use-results'
import { useCashSummary } from '@/hooks/use-cash'
import { useSettings } from '@/hooks/use-settings'
import { 
  DollarSign, 
  Ticket, 
  Trophy, 
  TrendingUp,
  Clock,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ActiveModule = "dashboard" | "pos" | "games" | "results" | "winners" | "reports" | "cash" | "pyramid" | "settings";

interface DashboardProps {
  onNavigate?: (module: ActiveModule) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { report, isLoading: reportLoading } = useDailyReport()
  const { results } = useTodayResults()
  const { winners: pendingWinners } = usePendingWinners()
  const { summary } = useCashSummary()
  const { settings } = useSettings()

  const currency = settings.currency || 'C$'

  const stats = [
    {
      title: 'Ventas del Día',
      value: `${currency}${report.totalSales.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Tickets Vendidos',
      value: report.totalTickets.toString(),
      icon: Ticket,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Premios Pendientes',
      value: `${currency}${report.pendingPrizes.toLocaleString()}`,
      icon: Trophy,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Ganancia Neta',
      value: `${currency}${report.netProfit.toLocaleString()}`,
      icon: TrendingUp,
      color: report.netProfit >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: report.netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
    }
  ]

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={cn("rounded-full p-3", stat.bgColor)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{stat.title}</div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Resultados de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Sin resultados aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{result.game?.name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {result.schedule?.name}
                      </span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-primary">
                      {result.winningNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending winners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Premios Pendientes
              {pendingWinners.length > 0 && (
                <Badge variant="destructive">{pendingWinners.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingWinners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Sin premios pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingWinners.slice(0, 5).map((winner) => (
                  <div
                    key={winner.id}
                    className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/5 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {winner.ticket?.ticketNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {winner.result?.game?.name} - {winner.result?.winningNumber}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-orange-500">
                      {currency}{winner.prizeAmount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Estado de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg bg-muted p-4">
              <div className="text-sm text-muted-foreground">Apertura</div>
              <div className="text-xl font-semibold">
                {currency}{summary.openingAmount.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-green-500/10 p-4">
              <div className="text-sm text-green-600 dark:text-green-400">Ventas</div>
              <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                +{currency}{summary.salesTotal.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-red-500/10 p-4">
              <div className="text-sm text-red-600 dark:text-red-400">Premios</div>
              <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                -{currency}{summary.prizesTotal.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-4">
              <div className="text-sm text-blue-600 dark:text-blue-400">Entradas</div>
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                +{currency}{summary.incomeTotal.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-orange-500/10 p-4">
              <div className="text-sm text-orange-600 dark:text-orange-400">Salidas</div>
              <div className="text-xl font-semibold text-orange-600 dark:text-orange-400">
                -{currency}{summary.expenseTotal.toLocaleString()}
              </div>
            </div>
            <div className={cn(
              "rounded-lg p-4",
              summary.balance >= 0 ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              <div className="text-sm font-medium">Balance</div>
              <div className={cn(
                "text-xl font-bold",
                summary.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {currency}{summary.balance.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
