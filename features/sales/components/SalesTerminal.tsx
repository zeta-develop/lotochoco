'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSalesStore } from '../store/sales.store'
import { useCheckout } from '../hooks/use-checkout'
import { PurchaseVerification } from './PurchaseVerification'
import { useGamesManager } from '@/features/games/hooks/use-games-manager'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
import { useCurrentSession } from '@/features/cash/hooks/use-cash-manager'
import { printerService } from '@/features/settings/services/printer.service'
import { formatTime12h, isDateGame, formatDateNumber, getDaysInMonth, cn } from '@/lib/utils'
import {
  AlertCircle,
  Check,
  Clock,
  Plus,
  Printer,
  Share2,
  ShoppingCart,
  Trash2,
  X,
  Ticket,
  Gamepad2,
  User,
  Sparkles,
  RotateCcw,
  Delete
} from 'lucide-react'
import type { Game, Ticket as AppTicket, TicketItem } from '@/lib/types'
import { CalendarDays } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export function SalesTerminal() {
  const { games, isLoading: gamesLoading } = useGamesManager()
  const { settings } = useSettingsManager()
  const { isOpen: isCashOpen } = useCurrentSession()
  const { processSale, isProcessing } = useCheckout()

  const {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    selectedGame,
    setSelectedGame,
    selectedSchedule,
    updateAllCartItems,
    setSelectedSchedule,
    setCart,
    isLocked,
    setLocked,
  } = useSalesStore()

  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState(20)
  const [client, setClient] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastTicket, setLastTicket] = useState<AppTicket | null>(null)
  const captureRef = useRef<HTMLDivElement | null>(null)

  // Estado para juegos de fecha (4 dígitos)
  const [dateDay, setDateDay] = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const isCurrentGameDate = isDateGame(selectedGame?.digitCount || 0)

  const quickAmounts = [10, 20, 50, 100, 200, 500]

  const handleKeypadPress = (digit: string) => {
    if (isCurrentGameDate) return
    const maxLen = selectedGame?.digitCount || 2
    if (number.length < maxLen) {
      setNumber((prev) => prev + digit)
    }
  }

  const handleKeypadClear = () => {
    setNumber('')
  }

  const handleKeypadBackspace = () => {
    setNumber((prev) => prev.slice(0, -1))
  }

  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      setSelectedGame(games[0] as any)
      setSelectedSchedule(games[0].schedules?.[0] as any)
    }
  }, [games, selectedGame, setSelectedGame, setSelectedSchedule])

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game as any)
    const firstSchedule = game.schedules?.[0] || null
    setSelectedSchedule(firstSchedule)

    if (cart.length > 0) {
      const updatedCart = cart.map(item => {
        let newNumber = item.number;
        if (newNumber.length > game.digitCount) {
          newNumber = newNumber.slice(-game.digitCount);
        } else if (newNumber.length < game.digitCount) {
          newNumber = newNumber.padStart(game.digitCount, '0');
        }

        return {
          ...item,
          gameId: game.id,
          gameName: game.name,
          multiplier: game.multiplier,
          number: newNumber,
          ...(firstSchedule ? {
            schedule: firstSchedule.time,
            scheduleName: firstSchedule.name
          } : {})
        };
      });
      setCart(updatedCart);
    }
  }

  const handleAddToCart = () => {
    if (!selectedGame || !selectedSchedule || amount <= 0) {
      toast({ variant: 'destructive', title: 'Completa todos los campos' })
      return
    }

    let finalNumber = number

    // Para juegos de fecha, construir el número DDMM desde los selectores
    if (isCurrentGameDate) {
      if (!dateDay || !dateMonth) {
        toast({ variant: 'destructive', title: 'Selecciona día y mes' })
        return
      }
      finalNumber = dateDay.padStart(2, '0') + dateMonth.padStart(2, '0')
    } else {
      if (!number) {
        toast({ variant: 'destructive', title: 'Ingresa un número' })
        return
      }
      if (number.length !== selectedGame.digitCount) {
        toast({ variant: 'destructive', title: `El número debe tener ${selectedGame.digitCount} dígito(s)` })
        return
      }
      finalNumber = number.padStart(selectedGame.digitCount, '0')
    }

    addToCart({
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      number: finalNumber,
      amount,
      schedule: selectedSchedule.time,
      scheduleName: selectedSchedule.name,
      multiplier: selectedGame.multiplier,
      client: client || undefined,
    })

    setLocked(true)
    setNumber('')
    setDateDay('')
    setDateMonth('')
    toast({ title: 'Jugada agregada' })
  }

  const handleConfirmSale = async () => {
    if (!isCashOpen) {
      toast({ variant: 'destructive', title: 'Debes abrir la caja primero' })
      return
    }

    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'El carrito está vacío' })
      return
    }

    const ticket = await processSale({
      items: cart,
      client: client || undefined
    })

    if (ticket) {
      setLastTicket(ticket)
      clearCart()
      setShowConfirmDialog(false)
      setShowSuccessDialog(true)

      // Imprimir automáticamente el ticket generado (el botón de la página
      // de verificación es "Imprimir"). Si falla, la venta ya quedó registrada.
      try {
        const printed = await printerService.printTicket(
          ticket as AppTicket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
          settings as any
        )
        if (!printed) toast({ variant: 'destructive', title: 'Error al imprimir' })
      } catch (error) {
        console.error('Error al imprimir tras confirmar venta:', error)
        toast({ variant: 'destructive', title: 'Error al imprimir' })
      }
    }
  }

  // Comparte una vista previa del boleto como IMAGEN (no PDF) desde la
  // página de verificación. Solo presentación: no toca lógica de negocio.
  const handleSharePreview = async (element: HTMLElement | null) => {
    if (cart.length === 0) return
    toast({ title: 'Generando imagen...' })

    const previewTicket = {
      id: 'preview',
      ticketNumber: 'VERIFICACIÓN',
      totalAmount: getCartTotal(),
      status: 'active' as const,
      client: client || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: cart.map((item) => ({
        id: item.id,
        ticketId: 'preview',
        gameId: item.gameId,
        number: item.number,
        amount: item.amount,
        schedule: item.schedule,
        createdAt: new Date(),
        game: { name: item.gameName, multiplier: item.multiplier },
      })),
    }

    const result = await printerService.shareTicketImage(previewTicket as any, settings as any, element)
    if (!result.success) toast({ variant: 'destructive', title: 'Error al compartir ticket' })
  }

  const handleRemoveFromCart = (id: string) => {
    removeFromCart(id)
    if (cart.length <= 1) {
      setLocked(false)
    }
  }

  const currency = settings?.currency || 'C$'

  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando Juegos...</p>
        </div>
      </div>
    )
  }

  // Página completa de verificación de compra (modal pantalla completa limpio sin márgenes negativos)
  if (showConfirmDialog) {
    return (
      <div className="fixed inset-0 z-50 bg-[#060e20] overflow-y-auto overflow-x-hidden">
        <PurchaseVerification
          cart={cart}
          currency={currency}
          isProcessing={isProcessing}
          onBack={() => setShowConfirmDialog(false)}
          onShare={handleSharePreview}
          onConfirm={handleConfirmSale}
          captureRef={captureRef}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-24 max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Telemetry Status Bar */}
      <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-3 flex items-center justify-between shadow-lg min-w-0 w-full gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] shrink-0">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-xs text-slate-100 uppercase tracking-tight truncate">
                {settings.businessName || 'LOTOCHOCO'} • {settings.terminalNumber || 'T-J081'}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-dot shrink-0"></span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>Terminal Activa</span>
              <span>•</span>
              <span className="text-[#10b981] font-bold">Papel OK</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#060e20] px-2.5 py-1 rounded-xl border border-[#1e293b] flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Total:</span>
            <span className="font-mono text-xs text-[#10b981] font-bold">
              {currency}{getCartTotal().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {!isCashOpen && (
        <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 animate-in fade-in w-full min-w-0">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-amber-300">
            La caja registradora está <span className="uppercase font-black">cerrada</span>. Abre la caja en el módulo de Caja para emitir ventas.
          </p>
        </div>
      )}

      {/* Main Operator Layout (2-cols on desktop, 1-col on mobile) */}
      <div className="grid gap-3 lg:gap-4 lg:grid-cols-5 w-full min-w-0">
        {/* Left Column: Game selection, schedules, readout & tactile keypad */}
        <div className="lg:col-span-3 space-y-3 w-full min-w-0">
          {/* GAME SELECTOR PILLS */}
          <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-3 space-y-2 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Modalidad de Juego</span>
              <span className="text-[10px] font-mono text-cyan-400 truncate text-right">
                {selectedGame?.name || 'Selecciona un juego'}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 w-full min-w-0 touch-pan-x">
              {games.map((game) => {
                const isSelected = selectedGame?.id === game.id
                return (
                  <button
                    key={game.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleGameSelect(game as any)}
                    className={cn(
                      "flex-shrink-0 rounded-xl px-3 py-2 flex flex-col items-start border transition-all active:scale-95 text-left min-w-[95px] max-w-[140px]",
                      isSelected
                        ? "bg-[#10b981] text-slate-950 border-[#10b981] active-glow font-bold shadow-md"
                        : "bg-[#060e20] text-slate-300 hover:bg-[#1e293b] border-[#1e293b] hover:text-white"
                    )}
                  >
                    <span className="text-xs font-black leading-tight truncate w-full">{game.name}</span>
                    <span className={cn("text-[9px] font-mono mt-0.5 truncate w-full", isSelected ? "text-slate-900" : "text-slate-400")}>
                      {isDateGame(game.digitCount) ? 'DÍA / MES' : `${game.digitCount} DÍGITO${game.digitCount > 1 ? 'S' : ''}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DRAW SCHEDULE SELECTOR */}
          <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-3 space-y-2 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Sorteos Programados</span>
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 truncate text-right">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{selectedSchedule ? `${selectedSchedule.name} (${formatTime12h(selectedSchedule.time)})` : 'Sin horario'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 w-full min-w-0">
              {selectedGame?.schedules && selectedGame.schedules.length > 0 ? (
                selectedGame.schedules.map((schedule) => {
                  const isSelected = selectedSchedule?.id === schedule.id
                  return (
                    <button
                      key={schedule.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        setSelectedSchedule(schedule)
                        updateAllCartItems({ schedule: schedule.time, scheduleName: schedule.name })
                        toast({ title: `Horario: ${schedule.name}` })
                      }}
                      className={cn(
                        "rounded-xl p-2 flex flex-col items-center border transition-all active:scale-95 text-center relative overflow-hidden min-w-0 w-full",
                        isSelected
                          ? "bg-[#171f33] border-2 border-amber-400 amber-glow text-white font-bold"
                          : "bg-[#060e20] border-[#1e293b] text-slate-300 hover:bg-[#171f33] hover:text-white"
                      )}
                    >
                      <span className="text-xs font-mono font-bold truncate w-full">{formatTime12h(schedule.time)}</span>
                      <span className={cn("text-[9px] truncate w-full mt-0.5", isSelected ? "text-amber-400 font-bold" : "text-slate-400")}>
                        {schedule.name}
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="col-span-full py-2 text-center text-xs text-slate-400 font-mono">
                  Sin horarios asignados a este juego
                </div>
              )}
            </div>
          </div>

          {/* LIVE READOUT DISPLAY CARD */}
          <div className="bg-[#131b2e] rounded-2xl p-3 border border-[#1e293b] shadow-lg relative overflow-hidden space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Número Jugado
                </span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  {selectedGame?.name} • {selectedSchedule?.name || 'Sorteo'}
                </span>
              </div>
              <div className="bg-[#10b981]/15 border border-[#10b981]/40 px-2 py-0.5 rounded-full flex items-center gap-1 text-[#10b981]">
                <Sparkles className="h-3 w-3" />
                <span className="text-[10px] font-mono font-bold">Paga {selectedGame?.multiplier || 70}x</span>
              </div>
            </div>

            {/* Readout Display & Action */}
            {isCurrentGameDate ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block mb-1">Día</label>
                    <select
                      value={dateDay}
                      onChange={(e) => setDateDay(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#1e293b] bg-[#060e20] text-center text-lg font-mono font-black text-white focus:border-[#10b981] outline-none"
                    >
                      <option value="">--</option>
                      {Array.from({ length: getDaysInMonth(parseInt(dateMonth) || 12) }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d.toString().padStart(2, '0')}>
                          {d.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block mb-1">Mes</label>
                    <select
                      value={dateMonth}
                      onChange={(e) => {
                        setDateMonth(e.target.value)
                        const maxDays = getDaysInMonth(parseInt(e.target.value) || 12)
                        if (parseInt(dateDay) > maxDays) setDateDay(maxDays.toString().padStart(2, '0'))
                      }}
                      className="h-12 w-full rounded-xl border border-[#1e293b] bg-[#060e20] text-center text-xs font-mono font-black text-white focus:border-[#10b981] outline-none"
                    >
                      <option value="">--</option>
                      {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                        <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {dateDay && dateMonth && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#060e20] border border-[#1e293b]">
                    <span className="text-[10px] font-mono text-slate-400">Fecha: <strong className="text-white">{formatDateNumber(dateDay.padStart(2, '0') + dateMonth.padStart(2, '0'))}</strong></span>
                    <Button
                      onClick={handleAddToCart}
                      disabled={!selectedGame || !selectedSchedule || !dateDay || !dateMonth || amount <= 0 || !isCashOpen}
                      className="h-10 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black text-xs px-4 rounded-xl active-glow"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      + Agregar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl bg-[#060e20] border-2 border-[#10b981] active-glow flex items-center justify-center">
                    <span className="font-mono text-3xl font-black text-[#10b981] tracking-tighter">
                      {number || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Premio Estimado</span>
                    <span className="font-mono text-base font-black text-[#10b981]">
                      {currency}{((amount || 0) * (selectedGame?.multiplier || 70)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedGame || !selectedSchedule || !number || amount <= 0 || !isCashOpen}
                  className="h-12 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black text-xs px-4 rounded-xl active-glow shadow-lg transition-transform active:scale-95"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  + Agregar
                </Button>
              </div>
            )}
          </div>

          {/* QUICK AMOUNT CHIPS */}
          <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Monto de Apuesta ({currency})
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400">C$</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-16 h-7 rounded-lg bg-[#060e20] border border-[#1e293b] text-center font-mono font-bold text-xs text-white outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 w-full min-w-0">
              {quickAmounts.map((q) => {
                const isSelected = amount === q
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className={cn(
                      "py-2 px-1 text-center rounded-xl font-mono text-xs font-bold border transition-all active:scale-95 min-w-0",
                      isSelected
                        ? "bg-[#10b981] text-slate-950 border-[#10b981] active-glow"
                        : "bg-[#060e20] text-slate-300 hover:bg-[#1e293b] border-[#1e293b]"
                    )}
                  >
                    {q}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TACTILE 3x4 KEYPAD */}
          {!isCurrentGameDate && (
            <div className="bg-[#131b2e] rounded-2xl p-2.5 border border-[#1e293b] space-y-1.5 w-full min-w-0 overflow-hidden">
              <div className="grid grid-cols-3 gap-1.5 w-full min-w-0">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 bg-[#060e20] hover:bg-[#171f33] active:bg-[#10b981]/20 text-white font-mono text-lg font-black rounded-xl border border-[#1e293b] flex items-center justify-center active:scale-95 transition-all shadow-sm min-w-0"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear */}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 bg-[#060e20] hover:bg-[#171f33] text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-1 active:scale-95 transition-all min-w-0"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Limpiar</span>
                </button>

                {/* Zero */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 bg-[#060e20] hover:bg-[#171f33] active:bg-[#10b981]/20 text-white font-mono text-lg font-black rounded-xl border border-[#1e293b] flex items-center justify-center active:scale-95 transition-all shadow-sm min-w-0"
                >
                  0
                </button>

                {/* Backspace */}
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-12 bg-[#060e20] hover:bg-[#171f33] text-red-400 font-bold text-xs rounded-xl border border-red-500/30 flex items-center justify-center gap-1 active:scale-95 transition-all min-w-0"
                >
                  <Delete className="h-4 w-4" />
                  <span>Borrar</span>
                </button>
              </div>
            </div>
          )}

          {/* Client Input */}
          <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-2.5 flex items-center gap-2 w-full min-w-0">
            <User className="h-4 w-4 text-slate-400 ml-1 shrink-0" />
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Cliente (opcional)..."
              className="h-9 bg-[#060e20] border-[#1e293b] text-xs font-bold text-white placeholder:text-slate-500 rounded-xl min-w-0 flex-1"
            />
          </div>
        </div>

        {/* Right Column: Live Ticket Drawer / Receipt Preview & Checkout */}
        <div className="lg:col-span-2 space-y-3 w-full min-w-0">
          <Card className="border border-[#1e293b] shadow-xl bg-[#131b2e] rounded-2xl overflow-hidden flex flex-col h-full w-full min-w-0">
            <CardHeader className="bg-[#060e20] py-3 px-4 border-b border-[#1e293b]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-[#10b981]" />
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-100">
                    Ticket en Curso
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 font-mono text-[10px] font-bold">
                    {cart.length} {cart.length === 1 ? 'jugada' : 'jugadas'}
                  </Badge>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
                      type="button"
                    >
                      <Trash2 className="h-3 w-3" />
                      Vaciar
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px] max-h-[360px]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                  <ShoppingCart className="h-8 w-8 opacity-40" />
                  <p className="text-[10px] font-mono uppercase tracking-wider">Sin jugadas añadidas</p>
                </div>
              ) : (
                cart.map((item) => {
                  const prize = (item.amount || 0) * (item.multiplier || 0)
                  return (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between p-2 rounded-xl bg-[#060e20] border border-[#1e293b] hover:border-[#10b981]/40 transition-colors w-full min-w-0 gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] flex items-center justify-center font-mono text-sm font-black shrink-0">
                          {item.number.length === 4 ? formatDateNumber(item.number, true) : item.number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-200 truncate">
                            {item.gameName} • <span className="font-mono text-[#10b981]">{currency}{item.amount.toFixed(0)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {item.scheduleName} • Gana: {currency}{prize.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>

            {/* Total and Checkout Strip */}
            <div className="border-t border-[#1e293b] p-3 bg-[#060e20] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total a Pagar
                </span>
                <span className="font-mono text-2xl font-black text-[#10b981]">
                  {currency}{getCartTotal().toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="h-11 bg-[#131b2e] border-[#1e293b] text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  <X className="h-4 w-4 mr-1" />
                  Descartar
                </Button>

                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={cart.length === 0 || !isCashOpen}
                  className="h-11 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black text-xs rounded-xl active-glow shadow-lg active:scale-95 transition-all"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Verificar (F2)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-3xl border border-[#1e293b] bg-[#0b1326] shadow-2xl sm:max-w-sm p-0 overflow-hidden text-center text-slate-100">
          <DialogTitle className="sr-only">Venta Exitosa</DialogTitle>
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="h-14 w-14 bg-[#10b981]/20 border-2 border-[#10b981] rounded-full flex items-center justify-center text-[#10b981] active-glow">
              <Check className="h-7 w-7" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-[#10b981]">
                Venta Registrada
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-slate-400 mt-1">
                Ticket emitido e impreso correctamente.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 pt-0">
            <DialogFooter className="w-full">
              <Button
                onClick={() => setShowSuccessDialog(false)}
                className="w-full h-11 rounded-xl bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold text-xs shadow-lg"
              >
                Continuar Venta
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

