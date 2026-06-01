'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  useGameReport,
  useCancellationsReport 
} from '@/features/reports/hooks/use-reports-manager'
import { useTickets } from '@/features/tickets/hooks/use-tickets-manager'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
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
  Gamepad2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  History,
  LayoutDashboard,
  Trash2
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { format, subDays, startOfDay, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { printerService } from '@/features/settings/services/printer.service'
import type { Ticket as TicketType, TicketItem, Game } from '@/lib/types'
import { toast } from '@/components/ui/use-toast'
import { useSalesStore } from '@/features/sales/store/sales.store'
import type { Module } from '@/components/pos/main-layout'
import { useMemo } from 'react'

type TicketWithDetails = TicketType & {
  items?: (TicketItem & { game?: Game })[]
}

interface ReportsProps {
  onModuleChange: (module: Module) => void
}

export function ReportsManager({ onModuleChange }: ReportsProps) {
  const { settings } = useSettingsManager()
  const { addToCart, clearCart, setSelectedGame, setSelectedSchedule, setCart } = useSalesStore()
  const currency = settings.currency || 'C$'
  
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  
  const [searchTicket, setSearchTicket] = useState('')
  
  // Memorizar las opciones para evitar re-renders infinitos en los hooks
  const reportOptions = useMemo(() => ({
    startDate: dateRange.start,
    endDate: dateRange.end
  }), [dateRange.start, dateRange.end])

  const { report: salesReport } = useSalesReport(reportOptions)
  
  const { games: gameReport } = useGameReport(reportOptions)
  
  const { cancellations } = useCancellationsReport(dateRange.start)
  
  const { tickets: reportTickets, deleteTicket } = useTickets(reportOptions)
  
  // Computar datos del gráfico localmente a partir de los tickets cargados
  const chartData = useMemo(() => {
    if (!reportTickets || reportTickets.length === 0) {
      // Generar 7 días vacíos por defecto
      return Array.from({ length: 7 }).map((_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
        sales: 0,
        prizes: 0
      }))
    }

    const daysMap: Record<string, { date: string; sales: number; prizes: number }> = {}
    
    // Inicializar los últimos 7 días o el rango seleccionado
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    let current = new Date(start)
    while (current <= end) {
      const dStr = format(current, 'yyyy-MM-dd')
      daysMap[dStr] = { date: dStr, sales: 0, prizes: 0 }
      current.setDate(current.getDate() + 1)
      if (Object.keys(daysMap).length > 31) break // Límite de seguridad
    }

    reportTickets.forEach(ticket => {
      const dStr = format(new Date(ticket.createdAt), 'yyyy-MM-dd')
      if (daysMap[dStr]) {
        daysMap[dStr].sales += ticket.totalAmount
      }
    })

    return Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date))
  }, [reportTickets, dateRange.start, dateRange.end])
  
  const { getTicketByNumber: getTicket } = useTickets()
  const [foundTicket, setFoundTicket] = useState<TicketWithDetails | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [ticketNotFound, setTicketNotFound] = useState(false)

  const handleSearchTicket = async () => {
    if (!searchTicket.trim()) return
    setTicketNotFound(false)
    const ticket = await getTicket(searchTicket.trim())
    if (ticket) setFoundTicket(ticket as TicketWithDetails)
    else { setFoundTicket(null); setTicketNotFound(true) }
  }

  const handleDeleteTicket = async (ticket: TicketWithDetails) => {
    if (!confirm(`¿Estás seguro de ANULAR el ticket ${ticket.ticketNumber}? Esta acción ajustará los totales de caja.`)) {
      return
    }

    try {
      await deleteTicket(ticket.id)
      setIsTicketDialogOpen(false)
      if (foundTicket?.id === ticket.id) setFoundTicket(null)
    } catch (error) {
      // Error ya manejado por el hook
    }
  }

  const openTicketDetails = (ticket: TicketWithDetails) => {
    setSelectedTicket(ticket)
    setIsTicketDialogOpen(true)
  }

  const handleReprintTicket = async (ticket: TicketWithDetails) => {
    const result = await printerService.printTicket(ticket as any, settings as any)
    if (!result) toast({ variant: 'destructive', title: 'Error al imprimir' })
    else toast({ title: 'Impresión iniciada' })
  }

  const handleSendTicketImage = async (ticket: TicketWithDetails) => {
    toast({ title: 'Generando PDF...' })
    const result = await printerService.shareTicketPDF(ticket as any, settings as any)
    if (!result) toast({ variant: 'destructive', title: "Error al compartir ticket" })
  }

  const handleRepeatTicket = (ticket: TicketWithDetails) => {
    const ticketItems = ticket.items?.filter((item): item is TicketItem & { game: Game } => Boolean(item.game)) || []

    if (ticketItems.length === 0) {
      toast({ variant: 'destructive', title: 'No se pudo cargar este ticket para repetir' })
      return
    }

    // Preparar los items para el carrito
    const newCartItems = ticketItems.map((item) => {
      const scheduleObj = item.game.schedules?.find(s => 
        s.id === item.schedule || 
        s.name === item.schedule || 
        s.time === item.schedule ||
        s.time.startsWith(item.schedule) ||
        item.schedule.startsWith(s.time)
      )

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gameId: item.game.id,
        gameName: item.game.name,
        number: item.number,
        amount: item.amount,
        schedule: scheduleObj ? scheduleObj.time : item.schedule,
        scheduleName: scheduleObj ? scheduleObj.name : item.schedule,
        multiplier: item.game.multiplier ?? 70,
        client: ticket.client || undefined,
      }
    })

    // Limpiar y establecer el nuevo carrito de forma atómica
    clearCart() // Esto pone isLocked en false
    setCart(newCartItems)

    const firstItem = ticketItems[0]
    if (firstItem?.game) {
      setSelectedGame(firstItem.game)
      const scheduleObj = firstItem.game.schedules?.find(s => 
        s.id === firstItem.schedule || 
        s.name === firstItem.schedule || 
        s.time === firstItem.schedule ||
        s.time.startsWith(firstItem.schedule) ||
        firstItem.schedule.startsWith(s.time)
      )
      setSelectedSchedule(scheduleObj || null)
    }

    // Pequeño retardo para asegurar que el estado se procese antes de cambiar de vista
    setTimeout(() => {
      onModuleChange('pos')
      toast({ title: `Ticket ${ticket.ticketNumber} cargado para repetir` })
    }, 50)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Date Filter Card */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-tight">Periodo de Análisis</h2>
                <p className="text-[10px] text-muted-foreground font-medium">Filtra tus datos de venta</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-background rounded-full border px-3 py-1 shadow-inner">
                <input
                  type="date"
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <span className="mx-1 text-muted-foreground">→</span>
                <input
                  type="date"
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <div className="flex gap-1 bg-muted rounded-full p-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-3 text-[10px] rounded-full font-bold uppercase"
                  onClick={() => {
                    const today = new Date()
                    setDateRange({ start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') })
                  }}
                >
                  Hoy
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-3 text-[10px] rounded-full font-bold uppercase"
                  onClick={() => {
                    const today = new Date()
                    setDateRange({ start: format(subDays(today, 7), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') })
                  }}
                >
                  7D
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="totals" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full h-12 bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="totals" className="rounded-lg data-[state=active]:shadow-sm"><LayoutDashboard className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
          <TabsTrigger value="games" className="rounded-lg data-[state=active]:shadow-sm"><Gamepad2 className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Juegos</span></TabsTrigger>
          <TabsTrigger value="list" className="rounded-lg data-[state=active]:shadow-sm"><History className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Tickets</span></TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-lg data-[state=active]:shadow-sm"><Search className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Buscar</span></TabsTrigger>
          <TabsTrigger value="cancellations" className="rounded-lg data-[state=active]:shadow-sm"><X className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Anulados</span></TabsTrigger>
        </TabsList>

        {/* Dashboard Content */}
        <TabsContent value="totals" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardContent className="p-4 relative">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><DollarSign size={60} className="text-green-600" /></div>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Ventas Brutas</p>
                <h3 className="text-2xl font-black text-green-700">{currency}{(salesReport?.totalSales || 0).toLocaleString()}</h3>
                <div className="flex items-center mt-2 text-[9px] text-green-600/70 font-black uppercase italic">
                  <ArrowUpRight size={10} className="mr-1" />
                  {(salesReport?.totalTickets || 0)} Boletos
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-orange-500/10 to-orange-600/5">
              <CardContent className="p-4 relative">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><Trophy size={60} className="text-orange-600" /></div>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Premios Totales</p>
                <h3 className="text-2xl font-black text-orange-700">{currency}{(salesReport?.totalPrizes || 0).toLocaleString()}</h3>
                <div className="flex items-center mt-2 text-[9px] text-orange-600/70 font-black uppercase italic">
                  <Badge variant="outline" className="h-4 text-[8px] border-orange-200 text-orange-600 bg-orange-50/50 rounded-full">
                    PEND: {currency}{(salesReport?.pendingPrizes || 0).toLocaleString()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className={cn("overflow-hidden border-none shadow-sm", (salesReport?.netProfit || 0) >= 0 ? "bg-gradient-to-br from-blue-500/10 to-blue-600/5" : "bg-gradient-to-br from-red-500/10 to-red-600/5")}>
              <CardContent className="p-4 relative">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><TrendingUp size={60} className={(salesReport?.netProfit || 0) >= 0 ? "text-blue-600" : "text-red-600"} /></div>
                <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", (salesReport?.netProfit || 0) >= 0 ? "text-blue-600" : "text-red-600")}>Balance Neto</p>
                <h3 className={cn("text-2xl font-black", (salesReport?.netProfit || 0) >= 0 ? "text-blue-700" : "text-red-700")}>{currency}{(salesReport?.netProfit || 0).toLocaleString()}</h3>
                <div className="flex items-center mt-2 text-[9px] font-black uppercase italic">
                  {(salesReport?.netProfit || 0) >= 0 ? <ArrowUpRight size={10} className="mr-1 text-blue-600" /> : <ArrowDownRight size={10} className="mr-1 text-red-600" />}
                  Rentabilidad
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <CardContent className="p-4 relative">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><Gamepad2 size={60} className="text-purple-600" /></div>
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Efectividad %</p>
                <h3 className="text-2xl font-black text-purple-700">
                  {(salesReport?.totalSales || 0) > 0 ? (((salesReport?.netProfit || 0) / (salesReport?.totalSales || 1)) * 100).toFixed(1) : 0}%
                </h3>
                <div className="flex items-center mt-2 text-[9px] text-purple-600/70 font-black uppercase italic">
                  Margen operativo
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md overflow-hidden bg-card/30">
            <CardHeader className="flex flex-row items-center justify-between pb-8 bg-muted/10">
              <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tendencias del Negocio
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Últimos 7 días de operación</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="h-[280px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(new Date(str), 'EE', { locale: es }).toUpperCase()}
                      tick={{fontSize: 9, fontWeight: 'bold'}}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fontSize: 9, fontWeight: 'bold'}} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => `${currency}${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                      formatter={(val: number) => [`${currency}${(val || 0).toLocaleString()}`, 'Ventas']}
                      labelFormatter={(label) => format(new Date(label), 'PPPP', { locale: es }).toUpperCase()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="var(--color-primary)" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Breakdown */}
        <TabsContent value="games" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-primary" />
                    Ventas vs Premios por Juego
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gameReport}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                        <XAxis dataKey="gameName" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Bar dataKey="totalAmount" name="Ventas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={25} />
                        <Bar dataKey="prizesAmount" name="Premios" fill="#f97316" radius={[6, 6, 0, 0]} barSize={25} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Top Sorteos</h4>
                {gameReport.map((game) => (
                  <div key={game.gameId} className="bg-card p-4 rounded-2xl shadow-sm border border-muted hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform">
                          {game.gameName.charAt(0)}
                        </div>
                        <div>
                          <h5 className="font-black text-sm uppercase">{game.gameName}</h5>
                          <span className="text-[10px] text-muted-foreground font-bold">{game.ticketCount} VENTAS</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-foreground">{currency}{(game.totalAmount || 0).toLocaleString()}</div>
                        <div className="text-[9px] text-orange-600 font-black">-{currency}{(game.prizesAmount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${(game.totalAmount / (salesReport?.totalSales || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </TabsContent>

        {/* Tickets History */}
        <TabsContent value="list" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-muted/50">
                {(!reportTickets || reportTickets.length === 0) ? (
                  <div className="text-center py-24">
                    <History className="h-16 w-16 mx-auto mb-4 text-muted/20" />
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Sin actividad registrada</p>
                  </div>
                ) : (
                  reportTickets.map((ticket: TicketType) => (
                    <div 
                      key={ticket.id} 
                      className="flex items-center justify-between p-5 hover:bg-muted/20 transition-all cursor-pointer group"
                      onClick={() => openTicketDetails(ticket as TicketWithDetails)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105",
                          ticket.status === 'active' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                        )}>
                          <Ticket size={24} />
                        </div>
                        <div>
                          <div className="font-mono font-black text-sm group-hover:text-primary transition-colors">{ticket.ticketNumber}</div>
                          <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tight mt-0.5">
                            {format(new Date(ticket.createdAt), "dd MMM · hh:mm a", { locale: es })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-black text-sm text-foreground">{currency}{ticket.totalAmount}</div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "h-5 text-[8px] uppercase font-black border-none rounded-full px-2 mt-1",
                              ticket.status === 'active' ? "bg-green-100 text-green-700" : 
                              ticket.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {ticket.status === 'active' ? 'Válido' : ticket.status === 'cancelled' ? 'Anulado' : 'Pagado'}
                          </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="tickets" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 via-background to-background rounded-3xl overflow-hidden">
                <CardContent className="p-8 space-y-8">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter">Buscador Inteligente</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Localiza cualquier boleto al instante</p>
                  </div>

                  <div className="relative group">
                    <Input
                      placeholder="Escribe el número (#00000001)..."
                      className="h-16 text-xl font-mono rounded-2xl border-2 border-primary/20 focus:border-primary shadow-2xl pl-10 pr-32 transition-all"
                      value={searchTicket}
                      onChange={(e) => setSearchTicket(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchTicket()}
                    />
                    <Button 
                      className="absolute right-2 top-2 h-12 px-8 rounded-xl font-black uppercase text-xs shadow-lg shadow-primary/25"
                      onClick={handleSearchTicket}
                    >
                      Buscar
                    </Button>
                  </div>

                  {ticketNotFound && (
                    <div className="p-10 text-center rounded-3xl bg-red-500/5 border-2 border-dashed border-red-200 animate-in zoom-in duration-300">
                      <X className="h-12 w-12 text-red-300 mx-auto mb-4" />
                      <h4 className="font-black text-red-600 uppercase tracking-tighter">Sin coincidencias</h4>
                      <p className="text-[10px] font-bold text-red-500/70 uppercase">Revisa el código e intenta de nuevo</p>
                    </div>
                  )}

                  {foundTicket && (
                    <div className="animate-in fade-in zoom-in duration-500">
                      <div className="rounded-3xl border-2 border-primary/30 bg-card overflow-hidden shadow-2xl">
                        <div className="bg-primary px-6 py-4 flex justify-between items-center">
                          <span className="font-mono font-black text-white text-lg">{foundTicket.ticketNumber}</span>
                          <Badge className="bg-white text-primary hover:bg-white text-[10px] font-black rounded-full">{foundTicket.status.toUpperCase()}</Badge>
                        </div>
                        
                        <div className="p-6 space-y-6">
                           <div className="grid gap-3">
                              {foundTicket.items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center rounded-2xl bg-muted/50 p-4 border border-transparent">
                                  <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center font-black text-lg text-primary">
                                      {item.number}
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">{item.game?.name}</p>
                                      <p className="text-[9px] font-black text-primary leading-none uppercase tracking-widest">{item.schedule}</p>
                                    </div>
                                  </div>
                                  <div className="font-black text-base text-foreground">{currency}{item.amount}</div>
                                </div>
                              ))}
                           </div>

                           <div className="flex justify-between items-baseline pt-4 border-t border-dashed">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total del Ticket</span>
                             <span className="text-3xl font-black text-primary tracking-tighter">{currency}{foundTicket.totalAmount}</span>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                             <Button variant="outline" className="rounded-2xl h-12 font-black uppercase text-[10px] border-2" onClick={() => openTicketDetails(foundTicket)}>
                               Detalles
                             </Button>
                             <Button className="rounded-2xl h-12 font-black uppercase text-[10px] shadow-xl shadow-primary/20" onClick={() => handleReprintTicket(foundTicket)}>
                               <Printer className="h-4 w-4 mr-2" />
                               Imprimir
                             </Button>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
           </div>
        </TabsContent>

        {/* Cancellations Content */}
        <TabsContent value="cancellations" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
           <Card className="border-none shadow-md overflow-hidden bg-red-50/10">
            <CardHeader className="bg-red-500/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-600"><X size={20}/></div>
                <CardTitle className="text-sm font-black uppercase tracking-tight text-red-700">Registros de Bajas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cancellations.length === 0 ? (
                <div className="text-center py-32 opacity-20">
                  <X className="h-20 w-16 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Limpio de anulaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-red-100/50">
                  {cancellations.map((cancel) => (
                    <div key={cancel.id} className="p-5 flex justify-between items-center bg-red-500/[0.01] hover:bg-red-500/[0.03] transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-black text-xs">
                          {cancel.ticketNumber.slice(-2)}
                        </div>
                        <div>
                          <div className="font-mono font-black text-sm text-red-900">{cancel.ticketNumber}</div>
                          <div className="text-[9px] font-black text-red-600/60 uppercase tracking-tighter max-w-[180px] truncate">
                            {cancel.reason}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-red-600">-{currency}{cancel.totalAmount}</div>
                        <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                          {format(new Date(cancel.createdAt), "dd MMM · hh:mm a", { locale: es })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Details Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
          <DialogTitle className="sr-only">Detalles del ticket</DialogTitle>
          {selectedTicket && (
            <>
              <div className="bg-primary p-6 text-white shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <Badge className="bg-white/20 text-white border-none text-[10px] font-black rounded-full uppercase px-3">{selectedTicket.status}</Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-white hover:bg-red-500 hover:text-white rounded-full" 
                      onClick={() => handleDeleteTicket(selectedTicket)}
                      title="Anular ticket"
                      aria-label="Anular ticket"
                    >
                      <Trash2 className="h-3 w-3"/>
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsTicketDialogOpen(false)} aria-label="Cerrar detalles del ticket"><X className="h-5 w-5"/></Button>
                </div>
                <h3 className="text-2xl font-black font-mono tracking-tighter mb-1">{selectedTicket.ticketNumber}</h3>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{format(new Date(selectedTicket.createdAt), "PPPP hh:mm a", { locale: es })}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Detalle de Jugadas</h4>
                  <div className="grid gap-2">
                    {(selectedTicket.items || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/50 border border-muted-foreground/5">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-xl bg-background border font-black flex items-center justify-center text-primary">{item.number}</div>
                           <div>
                             <p className="text-[10px] font-black uppercase text-foreground leading-none mb-1">{item.game?.name || 'Juego'}</p>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.schedule}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">{currency}{item.amount.toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-background border-t border-dashed shrink-0 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Monto Total</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">{currency}{selectedTicket.totalAmount.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" className="h-12 rounded-2xl font-black uppercase text-[10px] border-2" onClick={() => handleSendTicketImage(selectedTicket)}>
                    Compartir
                  </Button>
                  <Button variant="secondary" className="h-12 rounded-2xl font-black uppercase text-[10px]" onClick={() => handleRepeatTicket(selectedTicket)}>
                    Repetir
                  </Button>
                  <Button className="h-12 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-primary/20" onClick={() => handleReprintTicket(selectedTicket)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
