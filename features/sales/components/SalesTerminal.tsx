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
import { formatTime12h, isDateGame, formatDateNumber, getDaysInMonth } from '@/lib/utils'
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
  User
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
    if (cart.length >= 15) {
      toast({ variant: 'destructive', title: 'Límite alcanzado', description: 'Máximo 15 jugadas por ticket' })
      return
    }

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

  // Página completa de verificación de compra (reemplaza el modal anterior):
  // ocupa todo el viewport disponible y muestra las 15 jugadas sin scroll.
  if (showConfirmDialog) {
    return (
      <div className="-m-4 h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))]">
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
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase px-3 py-0.5 rounded-full mb-2">Terminal de Venta</Badge>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Nueva Jugada</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Registro de tickets y ventas directas</p>
        </div>
      </div>

      {!isCashOpen && (
        <div className="p-5 bg-orange-500/10 border-2 border-orange-500/20 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="bg-orange-500 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white"><AlertCircle /></div>
          <p className="text-sm font-bold text-orange-700 dark:text-orange-400 leading-relaxed my-auto">
            La caja registradora está <span className="font-black uppercase tracking-widest">cerrada</span>. Abre la caja en el panel de Estado para poder registrar ventas.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-3">
            <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Gamepad2 className="h-5 w-5" /></div>
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Detalles de Jugada</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Juego</label>
                  <select
                    className="h-14 w-full rounded-2xl border-2 border-muted bg-background px-4 text-sm font-bold focus:border-primary transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedGame?.id || ''}
                    onChange={(event) => {
                      const game = games.find((item) => item.id === event.target.value)
                      if (game) handleGameSelect(game as any)
                    }}
                    disabled={isLocked}
                  >
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name} ({game.digitCount} dígito{game.digitCount > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Horario</label>
                  <select
                    className="h-14 w-full rounded-2xl border-2 border-muted bg-background px-4 text-sm font-bold focus:border-primary transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedSchedule?.id || ''}
                    onChange={(event) => {
                      const schedule = selectedGame?.schedules?.find((item) => item.id === event.target.value)
                      setSelectedSchedule(schedule || null)
                      if (schedule) {
                        updateAllCartItems({ schedule: schedule.time, scheduleName: schedule.name })
                        toast({ title: `Horario actualizado a ${schedule.name}` })
                      }
                    }}
                    disabled={!selectedGame || !selectedGame.schedules?.length || isLocked}
                  >
                    {selectedGame?.schedules?.length ? (
                      selectedGame.schedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.name} - {formatTime12h(schedule.time)}
                        </option>
                      ))
                    ) : (
                      <option value="">Sin horarios configurados</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  {isCurrentGameDate ? (
                    <>
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> Fecha Jugada
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest ml-1 text-muted-foreground/60">Día</label>
                          <select
                            value={dateDay}
                            onChange={(e) => setDateDay(e.target.value)}
                            className="h-16 w-full rounded-2xl border-2 border-muted bg-background px-3 text-center text-2xl font-black focus:border-primary transition-all outline-none"
                          >
                            <option value="">--</option>
                            {Array.from({ length: getDaysInMonth(parseInt(dateMonth) || 12) }, (_, i) => i + 1).map(d => (
                              <option key={d} value={d.toString().padStart(2, '0')}>
                                {d.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest ml-1 text-muted-foreground/60">Mes</label>
                          <select
                            value={dateMonth}
                            onChange={(e) => {
                              setDateMonth(e.target.value)
                              // Ajustar día si excede los días del nuevo mes
                              const maxDays = getDaysInMonth(parseInt(e.target.value) || 12)
                              if (parseInt(dateDay) > maxDays) setDateDay(maxDays.toString().padStart(2, '0'))
                            }}
                            className="h-16 w-full rounded-2xl border-2 border-muted bg-background px-3 text-center text-lg font-black focus:border-primary transition-all outline-none"
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
                        <div className="text-center py-2 bg-primary/5 rounded-xl border border-primary/10">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha: </span>
                          <span className="text-lg font-black text-primary">{formatDateNumber(dateDay.padStart(2, '0') + dateMonth.padStart(2, '0'))}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Número Jugado</label>
                      <Input
                        value={number}
                        onChange={(event) =>
                          setNumber(event.target.value.replace(/\D/g, '').slice(0, selectedGame?.digitCount || 2))
                        }
                        placeholder={`Ingrese ${selectedGame?.digitCount || 2} dígitos`}
                        className="h-16 text-center text-3xl font-black rounded-2xl border-2 border-muted focus:border-primary transition-all tracking-[0.25em]"
                        inputMode="numeric"
                        maxLength={selectedGame?.digitCount || 2}
                      />
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Monto de Apuesta ({currency})</label>
                  <div className="relative">
                    <div className="absolute left-4 top-5 font-black text-muted-foreground">{currency}</div>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) => setAmount(Number(event.target.value) || 0)}
                      className="h-16 pl-10 text-2xl font-black rounded-2xl border-2 border-muted focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Nombre del Cliente (opcional)</label>
                <div className="relative group">
                  <div className="absolute top-4 left-4 text-muted-foreground group-focus-within:text-primary"><User size={20} /></div>
                  <Input
                    value={client}
                    onChange={(event) => setClient(event.target.value)}
                    placeholder="Identificador del cliente..."
                    className="h-14 pl-12 rounded-2xl border-2 border-muted focus:border-primary transition-all font-bold"
                  />
                </div>
              </div>

              <Button
                size="lg"
                className="h-14 w-full text-sm font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                onClick={handleAddToCart}
                disabled={!selectedGame || !selectedSchedule || (!isCurrentGameDate && !number) || (isCurrentGameDate && (!dateDay || !dateMonth)) || amount <= 0 || !isCashOpen || cart.length >= 15}
              >
                <Plus className="mr-2 h-5 w-5" />
                Añadir al Ticket
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Ticket className="h-5 w-5" /></div>
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Ticket Actual</CardTitle>
                <Badge className="ml-auto bg-primary text-white border-none rounded-full px-3">{cart.length}/15</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                  <div className="p-4 bg-muted/50 rounded-full"><ShoppingCart className="h-8 w-8 opacity-30" /></div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">El ticket está vacío</p>
                </div>
              ) : cart.length <= 4 ? (
                /* Vista detallada para pocas jugadas (1-4) */
                cart.map((item) => (
                  <div key={item.id} className="group flex flex-col gap-1.5 rounded-2xl border-2 border-muted bg-background p-3 transition-all hover:border-primary/30 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors"></div>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase">
                        {item.gameName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors"
                        onClick={() => handleRemoveFromCart(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {item.scheduleName}
                        </div>
                        <div className="font-mono text-2xl font-black text-foreground">
                          {item.number.length === 4 ? formatDateNumber(item.number) : item.number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-primary">
                          {currency}{item.amount.toFixed(2)}
                        </div>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                          Gana: {currency}{((item.amount || 0) * (item.multiplier || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Vista compacta tipo tabla para muchas jugadas (5-15) */
                <div className="space-y-0.5">
                  {/* Encabezado de tabla */}
                  <div className="grid grid-cols-12 gap-1 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground border-b border-muted">
                    <div className="col-span-3">Juego</div>
                    <div className="col-span-3 text-center">Número</div>
                    <div className="col-span-2 text-right">Monto</div>
                    <div className="col-span-3 text-right">Premio</div>
                    <div className="col-span-1"></div>
                  </div>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="group grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-primary/10"
                    >
                      <div className="col-span-3 min-w-0">
                        <div className="text-[10px] font-black text-foreground truncate">{item.gameName}</div>
                        <div className="text-[8px] font-bold text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2 w-2 shrink-0" /> {item.scheduleName}
                        </div>
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="font-mono text-sm font-black text-foreground">
                          {item.number.length === 4 ? formatDateNumber(item.number, true) : item.number}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs font-black text-primary">{currency}{item.amount.toFixed(0)}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-[10px] font-bold text-muted-foreground">{currency}{((item.amount || 0) * (item.multiplier || 0)).toLocaleString()}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Indicador de límite */}
              {cart.length >= 15 && (
                <div className="text-center py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Límite de 15 jugadas alcanzado</p>
                </div>
              )}
            </CardContent>

            <div className="border-t-2 border-dashed border-muted p-4 space-y-4 bg-muted/10">
              <div className="flex items-center justify-between font-black uppercase tracking-tighter">
                <span className="text-sm">Total a Pagar</span>
                <span className="text-2xl text-primary">{currency}{getCartTotal().toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  className="h-12 rounded-2xl font-black uppercase text-[10px] border-2 shadow-sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Descartar
                </Button>
                <Button 
                  onClick={() => setShowConfirmDialog(true)} 
                  disabled={cart.length === 0 || !isCashOpen}
                  className="h-12 rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Imprimir Venta
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-sm p-0 overflow-hidden text-center">
          <DialogTitle className="sr-only">Venta Exitosa</DialogTitle>
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
              <Check className="h-8 w-8" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-green-700 dark:text-green-400">Ticket generado</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-1">La venta se registró correctamente.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 pt-0 bg-background">
            <DialogFooter className="w-full">
              <Button onClick={() => setShowSuccessDialog(false)} className="w-full h-12 rounded-xl font-black uppercase text-[10px] shadow-lg">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
