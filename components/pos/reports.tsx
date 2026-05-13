'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  useSalesReport, 
  useDailyReport, 
  useWeeklyReport, 
  useGameReport,
  useCancellationsReport 
} from '@/hooks/use-reports'
import { useTickets } from '@/hooks/use-tickets'
import { useSettings } from '@/hooks/use-settings'
import { 
  DollarSign, 
  Ticket, 
  Trophy, 
  TrendingUp, 
  Search,
  Calendar,
  FileText,
  X,
  Gamepad2
} from 'lucide-react'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function Reports() {
  const { settings } = useSettings()
  const currency = settings.currency || 'C$'
  
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  
  const [searchTicket, setSearchTicket] = useState('')
  
  const { report: salesReport } = useSalesReport({
    startDate: dateRange.start,
    endDate: dateRange.end
  })
  
  const { days, totals: weeklyTotals } = useWeeklyReport()
  
  const { games: gameReport } = useGameReport({
    startDate: dateRange.start,
    endDate: dateRange.end
  })
  
  const { cancellations } = useCancellationsReport({
    startDate: dateRange.start,
    endDate: dateRange.end
  })
  
  const { getTicket } = useTickets()
  const [foundTicket, setFoundTicket] = useState<any>(null)
  const [ticketNotFound, setTicketNotFound] = useState(false)

  const handleSearchTicket = async () => {
    if (!searchTicket.trim()) return
    
    setTicketNotFound(false)
    const ticket = await getTicket(searchTicket.trim())
    
    if (ticket) {
      setFoundTicket(ticket)
    } else {
      setFoundTicket(null)
      setTicketNotFound(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setDateRange({
                    start: format(today, 'yyyy-MM-dd'),
                    end: format(today, 'yyyy-MM-dd')
                  })
                }}
              >
                Hoy
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setDateRange({
                    start: format(subDays(today, 7), 'yyyy-MM-dd'),
                    end: format(today, 'yyyy-MM-dd')
                  })
                }}
              >
                7 días
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setDateRange({
                    start: format(subDays(today, 30), 'yyyy-MM-dd'),
                    end: format(today, 'yyyy-MM-dd')
                  })
                }}
              >
                30 días
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="totals" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="totals">
            <DollarSign className="h-4 w-4 mr-2" />
            Totales
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Search className="h-4 w-4 mr-2" />
            Buscar Ticket
          </TabsTrigger>
          <TabsTrigger value="games">
            <Gamepad2 className="h-4 w-4 mr-2" />
            Por Juego
          </TabsTrigger>
          <TabsTrigger value="cancellations">
            <X className="h-4 w-4 mr-2" />
            Cancelaciones
          </TabsTrigger>
        </TabsList>

        {/* Totals Tab */}
        <TabsContent value="totals" className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-full bg-green-500/10 p-3">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ventas</div>
                  <div className="text-2xl font-bold text-green-600">
                    {currency}{salesReport.totalSales.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <Ticket className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tickets</div>
                  <div className="text-2xl font-bold">{salesReport.totalTickets}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-full bg-orange-500/10 p-3">
                  <Trophy className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Premios</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {currency}{salesReport.totalPrizes.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={cn(
                  "rounded-full p-3",
                  salesReport.netProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  <TrendingUp className={cn(
                    "h-6 w-6",
                    salesReport.netProfit >= 0 ? "text-green-500" : "text-red-500"
                  )} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ganancia</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    salesReport.netProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {currency}{salesReport.netProfit.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Últimos 7 días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {days.map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">
                      {format(new Date(day.date), 'EEE dd', { locale: es })}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2 h-4">
                        <div 
                          className="bg-green-500 rounded"
                          style={{ 
                            width: `${Math.min((day.sales / Math.max(...days.map(d => d.sales), 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <div className="flex gap-2 h-4">
                        <div 
                          className="bg-orange-500 rounded"
                          style={{ 
                            width: `${Math.min((day.prizes / Math.max(...days.map(d => d.prizes), 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      <div className="text-sm text-green-600">{currency}{day.sales}</div>
                      <div className="text-sm text-orange-600">{currency}{day.prizes}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-sm">Ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded" />
                  <span className="text-sm">Premios</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Ticket Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Buscar Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Número de ticket (TKT-...)"
                  value={searchTicket}
                  onChange={(e) => setSearchTicket(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTicket()}
                />
                <Button onClick={handleSearchTicket}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>

              {ticketNotFound && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 text-red-600">
                  Ticket no encontrado
                </div>
              )}

              {foundTicket && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-mono font-bold text-lg">
                        {foundTicket.ticketNumber}
                      </div>
                      <Badge variant={
                        foundTicket.status === 'active' ? 'default' :
                        foundTicket.status === 'cancelled' ? 'destructive' : 'secondary'
                      }>
                        {foundTicket.status === 'active' ? 'Activo' :
                         foundTicket.status === 'cancelled' ? 'Cancelado' : 'Pagado'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                      {format(new Date(foundTicket.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>

                    <div className="space-y-2">
                      {foundTicket.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between rounded-lg bg-muted p-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.game?.name}</Badge>
                            <span className="font-mono font-bold">{item.number}</span>
                            <span className="text-sm text-muted-foreground">{item.schedule}</span>
                          </div>
                          <div className="font-semibold">{currency}{item.amount}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between mt-4 pt-4 border-t text-lg font-bold">
                      <span>Total:</span>
                      <span>{currency}{foundTicket.totalAmount}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Reporte por Juego
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gameReport.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Sin datos para el período seleccionado
                </div>
              ) : (
                <div className="space-y-4">
                  {gameReport.map((game) => (
                    <div key={game.gameId} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="font-semibold">{game.gameName}</div>
                        <div className="text-sm text-muted-foreground">
                          {game.ticketCount} jugadas
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          +{currency}{game.totalAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-orange-600">
                          -{currency}{game.prizesAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cancellations Tab */}
        <TabsContent value="cancellations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="h-5 w-5" />
                Cancelaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cancellations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Sin cancelaciones en el período
                </div>
              ) : (
                <div className="space-y-3">
                  {cancellations.map((cancel) => (
                    <div key={cancel.id} className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                      <div>
                        <div className="font-mono font-semibold">{cancel.ticketNumber}</div>
                        <div className="text-sm text-muted-foreground">{cancel.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(cancel.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        {currency}{cancel.totalAmount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
