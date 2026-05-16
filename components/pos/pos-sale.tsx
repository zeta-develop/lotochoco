'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { usePOSStore } from '@/store/pos-store'
import { useGames } from '@/hooks/use-games'
import { useTickets } from '@/hooks/use-tickets'
import { useSettings } from '@/hooks/use-settings'
import { useCurrentSession } from '@/hooks/use-cash'
import { printerService } from '@/services/printer'
import {
  AlertCircle,
  Check,
  Clock,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import type { Game, Ticket, TicketItem } from '@/lib/types'
import { toast } from 'sonner'

export function POSSale() {
  const { games, isLoading: gamesLoading } = useGames()
  const { createTicket } = useTickets()
  const { settings } = useSettings()
  const { isOpen: isCashOpen } = useCurrentSession()

  const {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    selectedGame,
    setSelectedGame,
    selectedSchedule,
    setSelectedSchedule,
  } = usePOSStore()

  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState(20)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastTicket, setLastTicket] = useState<(Ticket & { items: TicketItem[] }) | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      setSelectedGame(games[0])
      setSelectedSchedule(games[0].schedules?.[0] || null)
    }
  }, [games, selectedGame, setSelectedGame, setSelectedSchedule])

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game)
    setSelectedSchedule(game.schedules?.[0] || null)
  }

  const handleAddToCart = () => {
    if (!selectedGame || !selectedSchedule || !number || amount <= 0) {
      toast.error('Completa todos los campos')
      return
    }

    if (number.length !== selectedGame.digitCount) {
      toast.error(`El número debe tener ${selectedGame.digitCount} dígito(s)`)
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
    })

    setNumber('')
    toast.success('Jugada agregada')
  }

  const handleConfirmSale = async () => {
    if (!isCashOpen) {
      toast.error('Debes abrir la caja primero')
      return
    }

    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    setIsProcessing(true)

    try {
      const ticket = await createTicket(cart)
      setLastTicket(ticket)
      clearCart()
      setShowConfirmDialog(false)
      setShowSuccessDialog(true)
      toast.success('Venta completada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar venta')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = async () => {
    if (!lastTicket) return

    const result = await printerService.printTicket(lastTicket, settings)
    if (!result.success) {
      toast.error(result.message || 'Error al imprimir')
      return
    }

    toast.success(result.message || 'Impresión iniciada')
  }

  const currency = settings.currency || 'C$'

  if (gamesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4">
      {!isCashOpen && (
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-orange-600 dark:text-orange-400">
              La caja está cerrada. Abre la caja para poder vender.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nueva jugada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Juego</label>
              <select
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedGame?.id || ''}
                onChange={(event) => {
                  const game = games.find((item) => item.id === event.target.value)
                  if (game) handleGameSelect(game)
                }}
              >
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name} - {game.digitCount} dígito{game.digitCount > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Horario</label>
              <select
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedSchedule?.id || ''}
                onChange={(event) => {
                  const schedule = selectedGame?.schedules?.find((item) => item.id === event.target.value)
                  setSelectedSchedule(schedule || null)
                }}
                disabled={!selectedGame || !selectedGame.schedules?.length}
              >
                {selectedGame?.schedules?.length ? (
                  selectedGame.schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name} - {schedule.time}
                    </option>
                  ))
                ) : (
                  <option value="">Sin horarios</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número</label>
              <Input
                value={number}
                onChange={(event) =>
                  setNumber(event.target.value.replace(/\D/g, '').slice(0, selectedGame?.digitCount || 2))
                }
                placeholder={`${selectedGame?.digitCount || 2} dígitos`}
                className="h-14 text-center text-2xl font-bold"
                inputMode="numeric"
                maxLength={selectedGame?.digitCount || 2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Monto ({currency})</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value) || 0)}
                className="h-14 text-center text-2xl font-bold"
              />
            </div>
          </div>

          <Button
            size="lg"
            className="h-14 w-full text-lg"
            onClick={handleAddToCart}
            disabled={!selectedGame || !selectedSchedule || !number || amount <= 0 || !isCashOpen}
          >
            <Plus className="mr-2 h-5 w-5" />
            Agregar jugada
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Jugadas agregadas ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 opacity-20" />
              <p>No hay jugadas agregadas</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.gameName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {item.scheduleName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-bold">{item.number}</span>
                    <span className="text-lg font-semibold text-primary">
                      {currency}{item.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Premio: {currency}{(item.amount * item.multiplier).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>

        <div className="border-t p-4 space-y-3">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total:</span>
            <span className="text-2xl text-primary">{currency}{getCartTotal().toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearCart} disabled={cart.length === 0}>
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
            <Button onClick={() => setShowConfirmDialog(true)} disabled={cart.length === 0 || !isCashOpen}>
              <Check className="mr-2 h-4 w-4" />
              Vender
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venta</DialogTitle>
            <DialogDescription>¿Deseas confirmar esta venta?</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span>Jugadas:</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="mt-2 flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">{currency}{getCartTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSale} disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">Venta Exitosa</DialogTitle>
            <DialogDescription>El ticket ha sido generado correctamente.</DialogDescription>
          </DialogHeader>

          {lastTicket && (
            <div className="space-y-3 py-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-sm text-muted-foreground">Ticket #</div>
                <div className="font-mono text-lg font-bold">{lastTicket.ticketNumber}</div>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">{currency}{lastTicket.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowSuccessDialog(false)} className="w-full sm:w-auto">
              Cerrar
            </Button>
            <Button onClick={handlePrint} className="w-full sm:w-auto">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
