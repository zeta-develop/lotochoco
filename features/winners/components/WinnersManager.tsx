'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWinnersManager, usePendingWinners } from '../hooks/use-winners-manager'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
import { DollarSign, Check, Clock, Trophy } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function WinnersManager() {
  const { winners: allWinners, isLoading, markAsPaid, refresh } = useWinnersManager()
  const { winners: pendingWinners, refresh: refreshPending } = usePendingWinners()
  const { settings } = useSettingsManager()

  const currency = settings.currency || 'C$'
  const paidWinners = allWinners.filter(w => w.isPaid)

  const handleMarkAsPaid = async (winnerId: string) => {
    try {
      await markAsPaid(winnerId)
      await refreshPending()
      toast({ title: 'Premio marcado como pagado' })
      await refresh()
    } catch (error) {
      toast({ variant: 'destructive', title: error instanceof Error ? error.message : 'Error al marcar como pagado' })
    }
  }

  const totalPending = pendingWinners.reduce((sum, w) => sum + w.prizeAmount, 0)
  const totalPaid = paidWinners.reduce((sum, w) => sum + w.prizeAmount, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-[#dae2fd] flex items-center gap-2">
          <Trophy className="h-7 w-7 text-[#f59e0b]" />
          Premios y Ganadores
        </h1>
        <p className="text-xs text-[#bbcabf] font-mono mt-0.5">Control de boletos premiados y pagos en ventanilla</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-[#131b2e] border border-[#f59e0b]/40 rounded-xl p-4 relative overflow-hidden amber-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#f59e0b]/15 p-3 border border-[#f59e0b]/30">
                <Clock className="h-6 w-6 text-[#f59e0b]" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-[#f59e0b] uppercase tracking-wider">
                  Premios Pendientes
                </div>
                <div className="text-2xl font-mono font-black text-[#f59e0b] tracking-tight">
                  {currency}{(totalPending || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-[#bbcabf] font-mono mt-0.5">
                  {pendingWinners.length} boleto(s) por reclamar
                </div>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#f59e0b]/10 flex items-center justify-center font-mono font-black text-[#f59e0b] text-sm border border-[#f59e0b]/20">
              {pendingWinners.length}
            </div>
          </div>
        </div>

        <div className="bg-[#131b2e] border border-[#10b981]/40 rounded-xl p-4 relative overflow-hidden active-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#10b981]/15 p-3 border border-[#10b981]/30">
                <Check className="h-6 w-6 text-[#10b981]" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-[#10b981] uppercase tracking-wider">
                  Premios Pagados
                </div>
                <div className="text-2xl font-mono font-black text-[#10b981] tracking-tight">
                  {currency}{(totalPaid || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-[#bbcabf] font-mono mt-0.5">
                  {paidWinners.length} boleto(s) liquidados
                </div>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#10b981]/10 flex items-center justify-center font-mono font-black text-[#10b981] text-sm border border-[#10b981]/20">
              {paidWinners.length}
            </div>
          </div>
        </div>
      </div>

      {/* Winners tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-[#131b2e] border border-[#3c4a42]/50 p-1 rounded-xl h-11">
          <TabsTrigger 
            value="pending" 
            className="flex items-center gap-2 rounded-lg font-mono text-xs font-bold data-[state=active]:bg-[#f59e0b] data-[state=active]:text-[#001f26]"
          >
            <Clock className="h-3.5 w-3.5" />
            Pendientes de Cobro
            {pendingWinners.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#020617] text-[#f59e0b] text-[10px] font-mono font-bold">
                {pendingWinners.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="paid" 
            className="flex items-center gap-2 rounded-lg font-mono text-xs font-bold data-[state=active]:bg-[#10b981] data-[state=active]:text-[#003824]"
          >
            <Check className="h-3.5 w-3.5" />
            Historial Pagados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="outline-none">
          {pendingWinners.length === 0 ? (
            <div className="bg-[#131b2e] border border-[#3c4a42]/40 rounded-xl p-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-[#3c4a42]" />
              <p className="font-mono text-sm text-[#bbcabf] font-bold uppercase">No hay premios pendientes de cobro</p>
              <p className="text-xs text-[#86948a] mt-1">Todos los boletos ganadores han sido liquidados</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingWinners.map((winner) => (
                <div 
                  key={winner.id} 
                  className="bg-[#131b2e] border-2 border-[#f59e0b]/50 rounded-xl p-4 space-y-3 relative overflow-hidden bg-gradient-to-br from-[#131b2e] via-[#131b2e] to-[#f59e0b]/10 amber-glow hover:border-[#f59e0b] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#0b1326] px-2.5 py-1 rounded border border-[#3c4a42] text-[#dae2fd]">
                      #{winner.ticket?.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                      {winner.result?.game?.name || 'Lotería'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-1">
                      <div className="text-xs text-[#bbcabf] font-mono">
                        Número Ganador: <span className="font-mono font-black text-[#10b981] text-base">[{winner.result?.winningNumber}]</span>
                      </div>
                      <div className="text-[10px] text-[#86948a] font-mono">
                        {winner.result?.schedule?.name || 'Sorteo'} • {format(new Date(winner.createdAt), "dd/MM hh:mm a", { locale: es })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#bbcabf] font-mono uppercase">Monto Premio</div>
                      <div className="text-2xl font-mono font-black text-[#f59e0b] tracking-tight">
                        {currency}{(winner.prizeAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 bg-[#f59e0b] hover:bg-[#d97706] text-[#001f26] font-mono font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-98"
                    onClick={() => handleMarkAsPaid(winner.id)}
                  >
                    <DollarSign className="mr-1.5 h-4 w-4" />
                    Pagar Premio en Caja
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="outline-none">
          {paidWinners.length === 0 ? (
            <div className="bg-[#131b2e] border border-[#3c4a42]/40 rounded-xl p-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-[#3c4a42]" />
              <p className="font-mono text-sm text-[#bbcabf] font-bold uppercase">No hay registros de premios pagados aún</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paidWinners.map((winner) => (
                <div 
                  key={winner.id} 
                  className="bg-[#131b2e] border border-[#10b981]/30 rounded-xl p-4 space-y-2 bg-gradient-to-br from-[#131b2e] to-[#10b981]/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#0b1326] px-2.5 py-1 rounded border border-[#3c4a42] text-[#dae2fd]">
                      #{winner.ticket?.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                      PAGADO
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <div className="text-xs text-[#bbcabf] font-mono">
                        {winner.result?.game?.name} • Acierto <span className="font-bold text-[#dae2fd]">[{winner.result?.winningNumber}]</span>
                      </div>
                      <div className="text-[10px] text-[#86948a] font-mono">
                        Pagado: {winner.paidAt ? format(new Date(winner.paidAt), "dd/MM hh:mm a", { locale: es }) : 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-[#10b981]">
                        {currency}{(winner.prizeAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
