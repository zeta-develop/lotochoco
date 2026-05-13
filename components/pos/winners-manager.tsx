'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWinners, usePendingWinners } from '@/hooks/use-results'
import { useSettings } from '@/hooks/use-settings'
import { DollarSign, Check, Clock, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function WinnersManager() {
  const { winners: allWinners, isLoading, markAsPaid, refresh } = useWinners()
  const { winners: pendingWinners, refresh: refreshPending } = usePendingWinners()
  const { settings } = useSettings()

  const currency = settings.currency || 'C$'
  const paidWinners = allWinners.filter(w => w.isPaid)

  const handleMarkAsPaid = async (winnerId: string) => {
    try {
      await markAsPaid(winnerId)
      await refreshPending()
      toast.success('Premio marcado como pagado')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al marcar como pagado')
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
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-orange-500/20 p-3">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Premios Pendientes
              </div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {currency}{totalPending.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {pendingWinners.length} boleto(s)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-green-500/20 p-3">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Premios Pagados
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currency}{totalPaid.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {paidWinners.length} boleto(s)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Winners tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes
            {pendingWinners.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingWinners.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Pagados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingWinners.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No hay premios pendientes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingWinners.map((winner) => (
                <Card 
                  key={winner.id} 
                  className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono">
                        {winner.ticket?.ticketNumber}
                      </Badge>
                      <Badge variant="secondary">
                        {winner.result?.game?.name}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Número: <span className="font-mono font-bold">{winner.result?.winningNumber}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {winner.result?.schedule?.name} - {format(new Date(winner.createdAt), "dd/MM HH:mm", { locale: es })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-500">
                          {currency}{winner.prizeAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleMarkAsPaid(winner.id)}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Pagar Premio
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid">
          {paidWinners.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No hay premios pagados aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paidWinners.map((winner) => (
                <Card 
                  key={winner.id} 
                  className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono">
                        {winner.ticket?.ticketNumber}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                        Pagado
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          {winner.result?.game?.name} - {winner.result?.winningNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pagado: {winner.paidAt && format(new Date(winner.paidAt), "dd/MM HH:mm", { locale: es })}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {currency}{winner.prizeAmount.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
