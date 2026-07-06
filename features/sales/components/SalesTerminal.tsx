'use client'

import { useEffect, useState } from 'react'
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
import { useGamesManager } from '@/features/games/hooks/use-games-manager'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
import { useCurrentSession } from '@/features/cash/hooks/use-cash-manager'
import { printerService } from '@/features/settings/services/printer.service'
import { formatTime12h } from '@/lib/utils'
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
import { toast } from '@/components/ui/use-toast'

export function SalesTerminal() {
  const { games, isLoading: gamesLoading } = useGamesManager()
  const { settings } = useSettingsManager()
  const { isOpen: isCashOpen } = useCurrentSession()
  const { processSale, isProcessing } = useCheckout()

  const cart = useSalesStore(state => state.cart)
  const addToCart = useSalesStore(state => state.addToCart)
  const removeFromCart = useSalesStore(state => state.removeFromCart)
  const clearCart = useSalesStore(state => state.clearCart)
  const getCartTotal = useSalesStore(state => state.getCartTotal)
  const selectedGame = useSalesStore(state => state.selectedGame)
  const setSelectedGame = useSalesStore(state => state.setSelectedGame)
  const selectedSchedule = useSalesStore(state => state.selectedSchedule)
  const updateAllCartItems = useSalesStore(state => state.updateAllCartItems)
  const setSelectedSchedule = useSalesStore(state => state.setSelectedSchedule)
  const setCart = useSalesStore(state => state.setCart)
  const isLocked = useSalesStore(state => state.isLocked)
  const setLocked = useSalesStore(state => state.setLocked)

  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState(20)
  const [client, setClient] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastTicket, setLastTicket] = useState<AppTicket | null>(null)

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
    if (!selectedGame || !selectedSchedule || !number || amount <= 0) {
      toast({ variant: 'destructive', title: 'Completa todos los campos' })
      return
    }

    if (number.length !== selectedGame.digitCount) {
      toast({ variant: 'destructive', title: `El número debe tener ${selectedGame.digitCount} dígito(s)` })
      return
    }

    addToCart({
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      number: number.padStart(selectedGame.digitCount, '0'),
      amount,
      schedule: selectedSchedule.time,
      scheduleName: selectedSchedule.name,
      multiplier: selectedGame.multiplier,
      client: client || undefined,
    })

    setLocked(true) // Bloquear selectores al añadir manualmente
    setNumber('')
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
    }
  }

  const handlePrint = async () => {
    if (!lastTicket) return

    const result = await printerService.printTicket(
      lastTicket as AppTicket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
      settings as any
    )
    if (!result) {
      toast({ variant: 'destructive', title: 'Error al imprimir' })
      return
    }

    toast({ title: 'Impresión iniciada' })
  }

  const handleShare = async () => {
    if (!lastTicket) return
    toast({ title: 'Generando PDF...' })
    const result = await printerService.shareTicketPDF(
      lastTicket as AppTicket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
      settings as any
    )
    if (!result.success) toast({ variant: 'destructive', title: "Error al compartir ticket" })
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
                disabled={!selectedGame || !selectedSchedule || !number || amount <= 0 || !isCashOpen}
              >
                <Plus className="mr-2 h-5 w-5" />
                Añadir al Ticket
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Ticket className="h-5 w-5" /></div>
                <CardTitle className="text-lg font-black uppercase tracking-tighter">Ticket Actual</CardTitle>
                <Badge className="ml-auto bg-primary text-white border-none rounded-full px-3">{cart.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <div className="p-4 bg-muted/50 rounded-full"><ShoppingCart className="h-10 w-10 opacity-30" /></div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">El ticket está vacío</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="group flex flex-col gap-2 rounded-2xl border-2 border-muted bg-background p-4 transition-all hover:border-primary/30 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors"></div>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase">
                        {item.gameName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors"
                        onClick={() => handleRemoveFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3" /> {item.scheduleName}
                        </div>
                        <div className="font-mono text-3xl font-black text-foreground">
                          {item.number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-primary">
                          {currency}{item.amount.toFixed(2)}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                          Gana: {currency}{((item.amount || 0) * (item.multiplier || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            <div className="border-t-2 border-dashed border-muted p-6 space-y-6 bg-muted/10">
              <div className="flex items-center justify-between text-lg font-black uppercase tracking-tighter">
                <span>Total a Pagar</span>
                <span className="text-3xl text-primary">{currency}{getCartTotal().toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  className="h-14 rounded-2xl font-black uppercase text-[10px] border-2 shadow-sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Descartar
                </Button>
                <Button 
                  onClick={() => setShowConfirmDialog(true)} 
                  disabled={cart.length === 0 || !isCashOpen}
                  className="h-14 rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Imprimir Venta
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md p-0 overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-primary/5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Confirmar Venta
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2">
                Por favor, verifica el monto antes de generar el ticket.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-muted p-5 bg-muted/10 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-muted/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Líneas de Jugada</span>
                <Badge className="bg-primary/10 text-primary border-none rounded-xl font-black">{cart.length}</Badge>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest">Total:</span>
                <span className="text-4xl font-black text-primary">{currency}{getCartTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0">
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="h-12 rounded-xl font-black uppercase text-[10px] border-2">
                Cancelar
              </Button>
              <Button onClick={handleConfirmSale} disabled={isProcessing} className="h-12 rounded-xl font-black uppercase text-[10px] shadow-lg">
                {isProcessing ? 'Procesando...' : 'Confirmar e Imprimir'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md p-0 overflow-hidden text-center">
          <DialogTitle className="sr-only">Venta Exitosa</DialogTitle>
          <div className="bg-green-500/10 p-8 border-b border-green-500/10 flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
              <Check className="h-8 w-8" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-green-700 dark:text-green-400">¡Venta Exitosa!</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-1">El ticket se generó en la base de datos.</DialogDescription>
            </DialogHeader>
          </div>

          {lastTicket && (
            <div className="p-6">
              <div className="rounded-2xl bg-muted/30 border border-muted-foreground/10 p-6 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número de Ticket</span>
                <span className="font-mono text-3xl font-black tracking-widest text-foreground">{lastTicket.ticketNumber}</span>
                <div className="mt-4 pt-4 border-t border-muted-foreground/10 flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest">Total</span>
                   <span className="text-xl font-black text-primary">{currency}{lastTicket.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 pt-0 bg-background">
            <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2">
              <Button variant="outline" onClick={() => setShowSuccessDialog(false)} className="w-full sm:w-1/3 h-12 rounded-xl font-black uppercase text-[10px] border-2">
                Cerrar
              </Button>
              <Button variant="secondary" onClick={handleShare} className="w-full sm:w-1/3 h-12 rounded-xl font-black uppercase text-[10px] bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </Button>
              <Button onClick={handlePrint} className="w-full sm:w-1/3 h-12 rounded-xl font-black uppercase text-[10px] shadow-lg">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
