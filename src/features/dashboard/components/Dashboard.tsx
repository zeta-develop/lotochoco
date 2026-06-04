'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '../hooks/use-dashboard';
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager';
import { 
  DollarSign, 
  Ticket, 
  Trophy, 
  TrendingUp,
  Clock,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ActiveModule = "dashboard" | "pos" | "games" | "results" | "winners" | "reports" | "cash" | "pyramid" | "settings";

interface DashboardProps {
  onNavigate?: (module: ActiveModule) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data, isLoading } = useDashboard();
  const { settings } = useSettingsManager();

  const currency = settings.currency || 'C$';

  // ⚡ Bolt: Memoize stats array to prevent recreation on every render
  const stats = useMemo(() => [
    {
      title: 'Ventas del Día',
      value: `${currency}${(data.stats.totalSales || 0).toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-green-500/10 to-green-600/5',
      titleColor: 'text-green-600',
      valColor: 'text-green-700'
    },
    {
      title: 'Tickets Vendidos',
      value: data.stats.totalTickets.toString(),
      icon: Ticket,
      gradient: 'from-blue-500/10 to-blue-600/5',
      titleColor: 'text-blue-600',
      valColor: 'text-blue-700'
    },
    {
      title: 'Premios Pendientes',
      value: `${currency}${(data.stats.pendingPrizes || 0).toLocaleString()}`,
      icon: Trophy,
      gradient: 'from-orange-500/10 to-orange-600/5',
      titleColor: 'text-orange-600',
      valColor: 'text-orange-700'
    },
    {
      title: 'Ganancia Neta',
      value: `${currency}${(data.stats.netProfit || 0).toLocaleString()}`,
      icon: TrendingUp,
      gradient: data.stats.netProfit >= 0 ? 'from-green-500/10 to-green-600/5' : 'from-red-500/10 to-red-600/5',
      titleColor: data.stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      valColor: data.stats.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
    }
  ], [currency, data.stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando Tablero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase px-3 py-0.5 rounded-full mb-2">Resumen General</Badge>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Dashboard</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Estadísticas en tiempo real</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
        {stats.map((stat, i) => (
          <Card key={stat.title} className={cn("overflow-hidden border-none shadow-sm bg-gradient-to-br", stat.gradient)}>
            <CardContent className="p-4 relative">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <stat.icon size={60} className={stat.titleColor} />
              </div>
              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", stat.titleColor)}>{stat.title}</p>
              <h3 className={cn("text-2xl font-black", stat.valColor)}>{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-3 duration-400">
        {/* Today's results */}
        <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Trophy className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black uppercase tracking-tighter">Resultados de Hoy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {data.todayResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Sin resultados aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todayResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-muted bg-background p-4 transition-all hover:border-primary/30"
                  >
                    <div className="space-y-1">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase">{result.gameName}</Badge>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {result.scheduleName}
                      </div>
                    </div>
                    <div className="text-3xl font-black font-mono text-primary bg-primary/5 px-3 py-1 rounded-xl">
                      {result.winningNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending winners */}
        <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
          <CardHeader className="bg-orange-500/5 pb-6 border-b border-orange-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-600"><DollarSign className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                Premios Pendientes
                {data.pendingWinners.length > 0 && (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full px-2">{data.pendingWinners.length}</Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {data.pendingWinners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Sin premios pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.pendingWinners.map((winner) => (
                  <div
                    key={winner.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-orange-500/30 bg-orange-500/5 p-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="font-mono font-black text-sm">{winner.ticketNumber}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {winner.gameName} - {winner.winningNumber}
                      </div>
                    </div>
                    <div className="text-xl font-black text-orange-600 dark:text-orange-400">
                      {currency}{(winner.prizeAmount || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash summary */}
      <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-400">
        <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Wallet className="h-5 w-5" /></div>
            <CardTitle className="text-lg font-black uppercase tracking-tighter">Estado de Caja</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl bg-muted/50 p-4 border border-muted-foreground/5 shadow-sm text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Apertura</div>
              <div className="text-lg font-black">
                {currency}{(data.cashSummary.openingAmount || 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl bg-green-500/10 p-4 border border-green-500/20 shadow-sm text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">Ventas</div>
              <div className="text-lg font-black text-green-700 dark:text-green-400">
                +{currency}{(data.cashSummary.salesTotal || 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl bg-red-500/10 p-4 border border-red-500/20 shadow-sm text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Premios</div>
              <div className="text-lg font-black text-red-700 dark:text-red-400">
                -{currency}{(data.cashSummary.prizesTotal || 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl bg-blue-500/10 p-4 border border-blue-500/20 shadow-sm text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Entradas</div>
              <div className="text-lg font-black text-blue-700 dark:text-blue-400">
                +{currency}{(data.cashSummary.incomeTotal || 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-4 border border-orange-500/20 shadow-sm text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">Salidas</div>
              <div className="text-lg font-black text-orange-700 dark:text-orange-400">
                -{currency}{(data.cashSummary.expenseTotal || 0).toLocaleString()}
              </div>
            </div>
            <div className={cn(
              "rounded-2xl p-4 border shadow-sm text-center",
              data.cashSummary.balance >= 0 ? "bg-green-500/20 border-green-500/30" : "bg-red-500/20 border-red-500/30"
            )}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-foreground">Balance Final</div>
              <div className={cn(
                "text-xl font-black",
                data.cashSummary.balance >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
              )}>
                {currency}{(data.cashSummary.balance || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
