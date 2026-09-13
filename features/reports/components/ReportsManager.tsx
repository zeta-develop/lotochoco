'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Printer,
  X,
  Gamepad2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  History,
  LayoutDashboard,
  Trash2,
  QrCode,
  Receipt,
  Lock,
  PieChart,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Repeat
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
import { PurchaseVerification } from '@/features/sales/components/PurchaseVerification'
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
  
  const [activePeriod, setActivePeriod] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'paid'>('all')

  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  
  const [searchTicket, setSearchTicket] = useState('')

  const handlePeriodChange = (period: 'today' | 'yesterday' | 'week') => {
    setActivePeriod(period)
    const today = new Date()
    if (period === 'today') {
      setDateRange({
        start: format(today, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      })
    } else if (period === 'yesterday') {
      const yesterday = subDays(today, 1)
      setDateRange({
        start: format(yesterday, 'yyyy-MM-dd'),
        end: format(yesterday, 'yyyy-MM-dd')
      })
    } else if (period === 'week') {
      setDateRange({
        start: format(subDays(today, 7), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      })
    }
  }
  
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
  const [ticketNotFound, setTicketNotFound] = useState(false)
  // Vista de página completa para ver/reimprimir un ticket vendido (reemplaza el modal)
  const [viewingTicket, setViewingTicket] = useState<TicketWithDetails | null>(null)
  const [isReprinting, setIsReprinting] = useState(false)
  const captureRef = useRef<HTMLDivElement | null>(null)

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
      setViewingTicket(null)
      if (foundTicket?.id === ticket.id) setFoundTicket(null)
    } catch (error) {
      // Error ya manejado por el hook
    }
  }

  const openTicketDetails = (ticket: TicketWithDetails) => {
    setViewingTicket(ticket)
  }

  const handleReprintTicket = async (ticket: TicketWithDetails) => {
    setIsReprinting(true)
    try {
      const result = await printerService.printTicket(ticket as any, settings as any)
      if (!result) toast({ variant: 'destructive', title: 'Error al imprimir' })
      else toast({ title: 'Impresión iniciada' })
    } finally {
      setIsReprinting(false)
    }
  }

  const handleSendTicketImage = async (ticket: TicketWithDetails, element: HTMLElement | null) => {
    toast({ title: 'Generando imagen...' })
    const result = await printerService.shareTicketImage(ticket as any, settings as any, element)
    if (!result.success) toast({ variant: 'destructive', title: "Error al compartir ticket" })
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

  const filteredTickets = useMemo(() => {
    if (!reportTickets) return []
    if (statusFilter === 'all') return reportTickets
    return reportTickets.filter(t => t.status === statusFilter)
  }, [reportTickets, statusFilter])

  const avgTicket = (salesReport?.totalTickets || 0) > 0 
    ? ((salesReport?.totalSales || 0) / (salesReport?.totalTickets || 1)).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* 1. Header & Period Filter */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-[#dae2fd]">
              Reportes y Auditoría
            </h1>
            <p className="text-xs text-[#bbcabf] font-mono">Cierre Contable y Registro de Transacciones</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg bg-[#171f33] border-[#3c4a42] text-xs font-mono text-[#4cd7f6] hover:text-[#dae2fd]"
              onClick={() => onModuleChange('cash')}
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Arqueo de Caja
            </Button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button 
            type="button"
            onClick={() => handlePeriodChange('today')}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all active:scale-95",
              activePeriod === 'today'
                ? "bg-[#10b981] text-[#003824] active-glow shadow-sm"
                : "bg-[#171f33] border border-[#3c4a42] text-[#bbcabf] hover:text-[#dae2fd]"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Hoy</span>
          </button>
          <button 
            type="button"
            onClick={() => handlePeriodChange('yesterday')}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-mono text-xs font-bold shrink-0 transition-all active:scale-95",
              activePeriod === 'yesterday'
                ? "bg-[#10b981] text-[#003824] active-glow shadow-sm"
                : "bg-[#171f33] border border-[#3c4a42] text-[#bbcabf] hover:text-[#dae2fd]"
            )}
          >
            <span>Ayer</span>
          </button>
          <button 
            type="button"
            onClick={() => handlePeriodChange('week')}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-mono text-xs font-bold shrink-0 transition-all active:scale-95",
              activePeriod === 'week'
                ? "bg-[#10b981] text-[#003824] active-glow shadow-sm"
                : "bg-[#171f33] border border-[#3c4a42] text-[#bbcabf] hover:text-[#dae2fd]"
            )}
          >
            <span>Esta Semana</span>
          </button>
          <button 
            type="button"
            onClick={() => setActivePeriod('custom')}
            className={cn(
              "px-3.5 py-1.5 rounded-full font-mono text-xs font-bold shrink-0 transition-all flex items-center space-x-1 active:scale-95",
              activePeriod === 'custom'
                ? "bg-[#4cd7f6] text-[#001f26] cyan-glow shadow-sm"
                : "bg-[#171f33] border border-[#3c4a42] text-[#4cd7f6] hover:text-[#dae2fd]"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Rango</span>
          </button>
        </div>

        {/* Custom Date Range Picker when activePeriod === 'custom' */}
        {activePeriod === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#131b2e] border border-[#3c4a42]">
            <span className="text-xs font-mono text-[#bbcabf]">Desde:</span>
            <input
              type="date"
              className="bg-[#0b1326] border border-[#3c4a42] rounded px-2 py-1 text-xs font-mono text-[#dae2fd] outline-none"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-xs font-mono text-[#bbcabf]">Hasta:</span>
            <input
              type="date"
              className="bg-[#0b1326] border border-[#3c4a42] rounded px-2 py-1 text-xs font-mono text-[#dae2fd] outline-none"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        )}
      </section>

      {/* 2. KPI Overview Cards (2x2 Grid with high contrast metrics) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Venta Bruta */}
        <div className="bg-[#131b2e] rounded-xl p-3.5 border border-[#3c4a42]/70 relative overflow-hidden flex flex-col justify-between active-glow">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-mono text-[#bbcabf] font-semibold">Venta Bruta</span>
            <DollarSign className="h-4 w-4 text-[#10b981]" />
          </div>
          <div>
            <div className="font-mono text-xl sm:text-2xl text-[#10b981] font-black tracking-tight">
              {currency}{(salesReport?.totalSales || 0).toLocaleString()}
            </div>
            <div className="mt-1 flex items-center space-x-1">
              <span className="bg-[#171f33] px-1.5 py-0.5 rounded text-[10px] font-mono text-[#10b981] flex items-center font-bold">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> En tiempo real
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tickets Emitidos */}
        <div className="bg-[#131b2e] rounded-xl p-3.5 border border-[#3c4a42]/70 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-mono text-[#bbcabf] font-semibold">Tickets Emitidos</span>
            <Ticket className="h-4 w-4 text-[#4cd7f6]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono text-xl sm:text-2xl text-[#4cd7f6] font-black">
                {salesReport?.totalTickets || 0}
              </span>
              <span className="text-xs font-mono text-[#86948a]">boletos</span>
            </div>
            <div className="text-[11px] text-[#bbcabf] font-mono mt-1 truncate">
              Promedio: <span className="text-[#dae2fd] font-bold">{currency}{avgTicket}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Premios Pagados / Totales */}
        <div className="bg-[#131b2e] rounded-xl p-3.5 border border-[#f59e0b]/40 flex flex-col justify-between bg-gradient-to-br from-[#131b2e] to-[#f59e0b]/5 amber-glow">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-mono text-[#f59e0b] font-semibold">Premios Totales</span>
            <Trophy className="h-4 w-4 text-[#f59e0b]" />
          </div>
          <div>
            <div className="font-mono text-xl sm:text-2xl text-[#f59e0b] font-black tracking-tight">
              {currency}{(salesReport?.totalPrizes || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-[#bbcabf] font-mono mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
              <span>Pend: {currency}{(salesReport?.pendingPrizes || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Balance Neto Terminal */}
        <div className="bg-[#171f33] rounded-xl p-3.5 border-2 border-[#10b981]/50 relative overflow-hidden flex flex-col justify-between active-glow">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-mono text-[#10b981] font-bold">Balance Neto</span>
            <TrendingUp className="h-4 w-4 text-[#10b981]" />
          </div>
          <div>
            <div className="font-mono text-xl sm:text-2xl text-[#dae2fd] font-black tracking-tight">
              {currency}{(salesReport?.netProfit || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-[#10b981] font-mono mt-1 font-semibold">
              En caja para liquidación
            </div>
          </div>
        </div>
      </section>

      {/* Tabs navigation for deeper inspection */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-[#131b2e] border border-[#3c4a42]/50 p-1 rounded-xl h-11 grid grid-cols-3">
          <TabsTrigger 
            value="overview" 
            className="font-mono text-xs font-bold rounded-lg data-[state=active]:bg-[#10b981] data-[state=active]:text-[#003824]"
          >
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
            Auditoría
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="font-mono text-xs font-bold rounded-lg data-[state=active]:bg-[#4cd7f6] data-[state=active]:text-[#001f26]"
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger 
            value="cancellations" 
            className="font-mono text-xs font-bold rounded-lg data-[state=active]:bg-[#ffb4ab] data-[state=active]:text-[#690005]"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Anulados ({cancellations.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview (Stitch Main Feed) */}
        <TabsContent value="overview" className="space-y-4 outline-none">
          {/* 3. Desglose por Sorteo / Modalidad (Game Breakdown) */}
          {gameReport && gameReport.length > 0 && (
            <section className="bg-[#131b2e] rounded-xl p-4 border border-[#3c4a42]/60 space-y-3">
              <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2">
                <div className="flex items-center space-x-2">
                  <PieChart className="h-4 w-4 text-[#4cd7f6]" />
                  <span className="font-mono text-sm font-bold text-[#dae2fd]">Ventas por Modalidad</span>
                </div>
                <span className="text-[11px] font-mono text-[#bbcabf] bg-[#171f33] px-2 py-0.5 rounded border border-[#3c4a42]">
                  {gameReport.length} juegos activos
                </span>
              </div>

              {/* Cumulative Multi-segment Progress Bar */}
              <div className="w-full bg-[#171f33] h-2.5 rounded-full flex overflow-hidden">
                {gameReport.map((game, idx) => {
                  const pct = (salesReport?.totalSales || 0) > 0 
                    ? (game.totalAmount / (salesReport?.totalSales || 1)) * 100 
                    : 0
                  const colors = ['bg-[#10b981]', 'bg-[#4cd7f6]', 'bg-[#f59e0b]', 'bg-[#818cf8]', 'bg-[#ec4899]']
                  return (
                    <div 
                      key={game.gameId} 
                      className={cn("h-full transition-all duration-500", colors[idx % colors.length])} 
                      style={{ width: `${pct}%` }} 
                      title={`${game.gameName}: ${pct.toFixed(1)}%`}
                    />
                  )
                })}
              </div>

              {/* Breakdown Items */}
              <div className="space-y-2 pt-1">
                {gameReport.map((game, idx) => {
                  const pct = (salesReport?.totalSales || 0) > 0 
                    ? ((game.totalAmount / (salesReport?.totalSales || 1)) * 100).toFixed(1) 
                    : '0.0'
                  const colorDots = ['bg-[#10b981]', 'bg-[#4cd7f6]', 'bg-[#f59e0b]', 'bg-[#818cf8]', 'bg-[#ec4899]']
                  return (
                    <div key={game.gameId} className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-2.5">
                        <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0", colorDots[idx % colorDots.length])} />
                        <div>
                          <span className="text-[#dae2fd] font-bold block">{game.gameName}</span>
                          <span className="text-[#86948a] text-[10px]">{game.ticketCount} boletos</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#dae2fd] block">{currency}{(game.totalAmount || 0).toLocaleString()}</span>
                        <span className="text-[#10b981] text-[10px]">{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* 4. Ticket Search & Audit Bar */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm font-bold text-[#dae2fd] flex items-center gap-1.5">
                <Search className="h-4 w-4 text-[#10b981]" />
                Auditoría y Búsqueda de Tickets
              </h2>
              <span className="text-[10px] text-[#86948a] font-mono">Reg. Terminal #{settings.terminalId || '001'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86948a] h-4 w-4" />
                <Input
                  className="w-full bg-[#0b1326] border-[#3c4a42] focus:border-[#4cd7f6] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-[#dae2fd] placeholder:text-[#86948a]"
                  placeholder="Buscar número de ticket (#00000001)..."
                  value={searchTicket}
                  onChange={(e) => setSearchTicket(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTicket()}
                />
              </div>
              <Button
                className="h-10 px-4 bg-[#10b981] hover:bg-[#059669] text-[#003824] font-mono font-bold text-xs rounded-xl"
                onClick={handleSearchTicket}
              >
                Buscar
              </Button>
            </div>

            {ticketNotFound && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center font-mono text-xs text-red-400">
                Ticket no encontrado con el número proporcionado.
              </div>
            )}

            {foundTicket && (
              <div className="p-4 rounded-xl bg-[#171f33] border-2 border-[#10b981] space-y-3 active-glow">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#dae2fd]">#{foundTicket.ticketNumber}</span>
                  <Badge className="bg-[#10b981] text-[#003824] font-mono font-bold">{foundTicket.status.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#bbcabf]">Total: {currency}{foundTicket.totalAmount}</span>
                  <span className="text-[#86948a]">{format(new Date(foundTicket.createdAt), "dd/MM hh:mm a", { locale: es })}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 font-mono text-xs" onClick={() => openTicketDetails(foundTicket)}>
                    Ver Detalle
                  </Button>
                  <Button size="sm" className="flex-1 bg-[#10b981] text-[#003824] font-mono text-xs" onClick={() => handleReprintTicket(foundTicket)}>
                    <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* 5. Feed de Tickets Auditados ('Últimos Tickets Emitidos') */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#bbcabf] uppercase tracking-wider">
                Tickets Emitidos ({filteredTickets.length})
              </span>
              <div className="flex items-center space-x-1">
                {(['all', 'active', 'paid', 'cancelled'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors",
                      statusFilter === filter
                        ? "bg-[#10b981] text-[#003824]"
                        : "bg-[#171f33] text-[#86948a] hover:text-[#dae2fd]"
                    )}
                  >
                    {filter === 'all' ? 'Todos' : filter === 'active' ? 'Activos' : filter === 'paid' ? 'Pagados' : 'Anulados'}
                  </button>
                ))}
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-[#131b2e] border border-[#3c4a42]/40 rounded-xl p-10 text-center text-[#86948a] font-mono text-xs">
                No hay tickets en este período con el filtro seleccionado
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTickets.map((ticket) => {
                  const isWinner = ticket.status === 'paid'
                  const isCancelled = ticket.status === 'cancelled'
                  return (
                    <article
                      key={ticket.id}
                      className={cn(
                        "rounded-xl p-3.5 border relative overflow-hidden transition-all bg-[#131b2e]",
                        isWinner 
                          ? "border-[#f59e0b]/60 bg-gradient-to-r from-[#131b2e] via-[#131b2e] to-[#f59e0b]/10 amber-glow"
                          : isCancelled
                          ? "border-red-500/30 opacity-75"
                          : "border-[#3c4a42]/70 hover:border-[#10b981]/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "font-mono text-xs sm:text-sm font-bold",
                              isCancelled ? "line-through text-[#86948a]" : "text-[#dae2fd]"
                            )}>
                              #{ticket.ticketNumber}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide",
                              isWinner 
                                ? "bg-[#f59e0b] text-[#001f26]" 
                                : isCancelled
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30"
                            )}>
                              {isWinner ? 'PREMIADO / PAGADO' : isCancelled ? 'ANULADO' : 'ACTIVO'}
                            </span>
                          </div>
                          {ticket.client && (
                            <p className="text-xs font-mono text-[#bbcabf]">
                              Cliente: <span className="text-[#dae2fd] font-semibold">{ticket.client}</span>
                            </p>
                          )}
                          <p className="text-[11px] font-mono text-[#86948a] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(ticket.createdAt), "dd/MM hh:mm a", { locale: es })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "font-mono text-base sm:text-lg font-black",
                            isWinner ? "text-[#f59e0b]" : isCancelled ? "text-[#86948a] line-through" : "text-[#10b981]"
                          )}>
                            {currency}{ticket.totalAmount}
                          </span>
                          <span className="block text-[10px] text-[#86948a] font-mono">
                            {isCancelled ? 'Sin impacto' : 'Térmico PT-210'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons strip */}
                      <div className="mt-3 pt-2.5 border-t border-[#3c4a42]/40 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleRepeatTicket(ticket as TicketWithDetails)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono font-semibold text-[#4cd7f6] flex items-center space-x-1 border border-[#3c4a42] transition-colors"
                          title="Repetir jugada"
                        >
                          <Repeat className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Repetir</span>
                        </button>
                        <button
                          onClick={() => handleReprintTicket(ticket as TicketWithDetails)}
                          disabled={isReprinting}
                          className="px-2.5 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono font-semibold text-[#dae2fd] flex items-center space-x-1 border border-[#3c4a42] transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Reimprimir</span>
                        </button>
                        <button
                          onClick={() => openTicketDetails(ticket as TicketWithDetails)}
                          className="px-3 py-1.5 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 text-xs font-mono font-bold text-[#10b981] border border-[#10b981]/40 flex items-center space-x-1 transition-colors"
                        >
                          <span>Ver Detalle</span>
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => handleDeleteTicket(ticket as TicketWithDetails)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                            title="Anular ticket"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* 6. Bottom Tactical Closure Bar: Cierre Z Diario / Z-Report */}
          <section className="pt-2">
            <div className="bg-gradient-to-r from-[#171f33] to-[#131b2e] border border-[#10b981]/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 active-glow">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-[#dae2fd] leading-tight">Cierre Z Diario</h3>
                  <p className="text-[11px] text-[#bbcabf] font-mono">Cierre de arqueo formal y corte de turno</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Button
                  onClick={() => onModuleChange('cash')}
                  className="w-full sm:w-auto h-10 px-4 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#003824] font-mono font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active-glow"
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  <span>Realizar Cierre de Caja</span>
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* Tab 2: Analytics & Trends (Recharts) */}
        <TabsContent value="analytics" className="space-y-4 outline-none">
          <Card className="bg-[#131b2e] border border-[#3c4a42]/60 rounded-xl p-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-mono font-bold text-[#dae2fd] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#10b981]" />
                Tendencias de Ventas por Día
              </CardTitle>
              <CardDescription className="text-xs font-mono text-[#bbcabf]">
                Comportamiento de ventas en el período
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSalesObsidian" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3c4a42" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(new Date(str), 'EE', { locale: es }).toUpperCase()}
                      tick={{fontSize: 10, fill: '#86948a', fontFamily: 'monospace'}}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{fontSize: 10, fill: '#86948a', fontFamily: 'monospace'}} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => `${currency}${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b1326', borderColor: '#3c4a42', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#dae2fd' }}
                      formatter={(val: number) => [`${currency}${(val || 0).toLocaleString()}`, 'Ventas']}
                      labelFormatter={(label) => format(new Date(label), 'PPP', { locale: es })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorSalesObsidian)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Cancellations */}
        <TabsContent value="cancellations" className="space-y-3 outline-none">
          <div className="bg-[#131b2e] border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <X className="h-5 w-5 text-red-400" />
              <h3 className="font-mono text-sm font-bold text-red-400">Registro de Bajas y Anulaciones</h3>
            </div>
            {cancellations.length === 0 ? (
              <div className="text-center py-12 text-[#86948a] font-mono text-xs">
                Sin anulaciones registradas en este período
              </div>
            ) : (
              <div className="divide-y divide-[#3c4a42]/40">
                {cancellations.map((cancel) => (
                  <div key={cancel.id} className="py-3 flex justify-between items-center font-mono text-xs">
                    <div>
                      <div className="font-bold text-[#dae2fd]">#{cancel.ticketNumber}</div>
                      <div className="text-[11px] text-red-400">{cancel.reason}</div>
                      <div className="text-[10px] text-[#86948a]">
                        {format(new Date(cancel.createdAt), "dd/MM hh:mm a", { locale: es })}
                      </div>
                    </div>
                    <div className="text-right font-black text-red-400">
                      -{currency}{cancel.totalAmount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ver ticket vendido: modal pantalla completa */}
      {viewingTicket && (
        <div className="fixed inset-0 z-50 bg-[#020617] overflow-y-auto">
          <PurchaseVerification
            ticket={viewingTicket as any}
            currency={currency}
            isProcessing={isReprinting}
            onBack={() => setViewingTicket(null)}
            onShare={(element) => handleSendTicketImage(viewingTicket, element)}
            onReprint={() => handleReprintTicket(viewingTicket)}
            onRepeat={() => handleRepeatTicket(viewingTicket)}
            onDelete={() => handleDeleteTicket(viewingTicket)}
            captureRef={captureRef}
          />
        </div>
      )}
    </div>
  )
}
