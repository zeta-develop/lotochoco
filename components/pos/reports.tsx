'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Printer,
  X,
  Gamepad2
} from 'lucide-react'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { generateTicketImageUrl, printerService } from '@/services/printer'
import type { Ticket as TicketType, TicketItem } from '@/lib/types'
import { toast } from 'sonner'
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';


type TicketWithDetails = TicketType & {
  items?: (TicketItem & { game?: { name?: string } })[]
}

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
  const { tickets: reportTickets } = useTickets({ startDate: dateRange.start, endDate: dateRange.end })
  
  const { getTicket } = useTickets()
  const [foundTicket, setFoundTicket] = useState<TicketWithDetails | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [ticketNotFound, setTicketNotFound] = useState(false)
  const printerType = settings.printerType || 'browser'
  const printerAddress = settings.printerAddress || ''
  const hasPhysicalPrinterConfigured = (printerType === 'network' || printerType === 'thermal')
    ? Boolean(printerAddress.trim())
    : false

  const handleSearchTicket = async () => {
    if (!searchTicket.trim()) return
    
    setTicketNotFound(false)
    const ticket = await getTicket(searchTicket.trim())
    
    if (ticket) {
      setFoundTicket(ticket as TicketWithDetails)
    } else {
      setFoundTicket(null)
      setTicketNotFound(true)
    }
  }

  const openTicketDetails = (ticket: TicketWithDetails) => {
    setSelectedTicket(ticket)
    setIsTicketDialogOpen(true)
  }

  const handleReprintTicket = async (ticket: TicketWithDetails) => {
    if (!hasPhysicalPrinterConfigured) {
      toast.error('No tienes una impresora configurada. Se abrirá el ticket como imagen.')
      handleSendTicketImage(ticket)
      return
    }

    const result = await printerService.printTicket(ticket as any, settings as any)

    if (!result.success) {
      toast.error(result.message || 'Error al imprimir')
      return
    }

    toast.success(result.message || 'Impresión iniciada')
  }

  const handleSendTicketImage = async (ticket: TicketWithDetails) => {
    const imageUrl = generateTicketImageUrl(ticket as any, settings as any)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageUrl

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = (e) => reject(e)
      })

      const canvas = document.createElement('canvas')
      const scale = 3
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear el contexto del canvas')
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)

      const pngData = canvas.toDataURL('image/png', 1.0)

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'px', format: [img.width, img.height] })
      pdf.addImage(pngData, 'PNG', 0, 0, img.width, img.height)

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const fileName = `ticket_${ticket.ticketNumber}.pdf`;

        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Compartir Ticket',
          text: `Ticket ${ticket.ticketNumber}`,
          url: writeResult.uri,
          dialogTitle: 'Compartir Ticket'
        });
        toast.success('Ticket listo para compartir');
      } else {
        pdf.save(`${ticket.ticketNumber}.pdf`)
        toast.success('Ticket descargado como PDF')
      }
    } catch (err) {
      console.error('Error generando PDF:', err)
      // Fallback: open SVG in new tab for manual download
      const imageWindow = window.open(imageUrl, '_blank', 'noopener,noreferrer')
      if (!imageWindow) {
        toast.error('No se pudo generar el PDF ni abrir la imagen')
        return
      }
      toast.success('No fue posible generar PDF. Ticket abierto como imagen')
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
          <TabsTrigger value="list">
            <Ticket className="h-4 w-4 mr-2" />
            Tickets
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

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openTicketDetails(foundTicket)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver información
                      </Button>
                      <Button onClick={() => handleReprintTicket(foundTicket)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Reimprimir
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleSendTicketImage(foundTicket)}
                      >
                        Enviar imagen
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets List Tab */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tickets en el período</CardTitle>
            </CardHeader>
            <CardContent>
              {(!reportTickets || reportTickets.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">Sin tickets en el período seleccionado</div>
              ) : (
                <div className="space-y-3">
                  {reportTickets.map((ticket: TicketType) => (
                    <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="font-mono font-semibold">{ticket.ticketNumber}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                        <div className="text-xs text-muted-foreground">{ticket.items?.length || 0} ítem(s)</div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="font-semibold">{currency}{ticket.totalAmount}</div>
                        <Badge variant={ticket.status === 'active' ? 'default' : ticket.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {ticket.status === 'active' ? 'Activo' : ticket.status === 'cancelled' ? 'Cancelado' : 'Pagado'}
                        </Badge>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTicketDetails(ticket as TicketWithDetails)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReprintTicket(ticket as TicketWithDetails)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Reimprimir
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendTicketImage(ticket as TicketWithDetails)}
                          >
                            Enviar imagen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
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

      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Ticket {selectedTicket?.ticketNumber}</span>
              {selectedTicket && (
                <Badge variant={selectedTicket.status === 'active' ? 'default' : selectedTicket.status === 'cancelled' ? 'destructive' : 'secondary'}>
                  {selectedTicket.status === 'active' ? 'Activo' : selectedTicket.status === 'cancelled' ? 'Cancelado' : 'Pagado'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Revisa la información completa del ticket y vuelve a imprimirlo si es necesario.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {!hasPhysicalPrinterConfigured && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4 text-sm text-amber-700">
                    No tienes una impresora configurada. Usa <span className="font-semibold">Reimprimir</span> para abrir el ticket como imagen.
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="text-xs text-muted-foreground">Número</div>
                    <div className="font-mono font-semibold">{selectedTicket.ticketNumber}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="text-xs text-muted-foreground">Fecha</div>
                    <div className="font-semibold">{format(new Date(selectedTicket.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
                  </CardContent>
                </Card>
              </div>

              {selectedTicket.cancelReason && (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="p-4 space-y-1">
                    <div className="text-xs text-red-600">Motivo de cancelación</div>
                    <div className="text-sm">{selectedTicket.cancelReason}</div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Juego</span>
                    <span>Detalle</span>
                  </div>
                  <div className="space-y-2">
                    {(selectedTicket.items || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                        <div>
                          <div className="font-medium">{item.game?.name || 'Juego'}</div>
                          <div className="text-muted-foreground">{item.schedule}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{item.number}</div>
                          <div>{currency}{item.amount.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>Total</span>
                    <span>{currency}{selectedTicket.totalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTicketDialogOpen(false)}
            >
              Cerrar
            </Button>
            {selectedTicket && (
              <>
                <Button variant="secondary" onClick={() => handleSendTicketImage(selectedTicket)}>
                  Enviar imagen
                </Button>
                <Button onClick={() => handleReprintTicket(selectedTicket)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Reimprimir
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
