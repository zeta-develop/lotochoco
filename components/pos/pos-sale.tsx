'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { NumPad, AmountPad } from './num-pad'
import { usePOSStore } from '@/store/pos-store'
import { useGames } from '@/hooks/use-games'
import { useTickets } from '@/hooks/use-tickets'
import { useSettings } from '@/hooks/use-settings'
import { useCurrentSession } from '@/hooks/use-cash'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Trash2, 
  Printer, 
  ShoppingCart, 
  Check,
  Clock,
  X,
  AlertCircle
} from 'lucide-react'
import type { Game, DrawSchedule, CartItem, Ticket, TicketItem } from '@/lib/types'
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
    setSelectedSchedule
  } = usePOSStore()

  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState(20)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastTicket, setLastTicket] = useState<(Ticket & { items: TicketItem[] }) | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Auto-select first game and schedule
  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      setSelectedGame(games[0])
      if (games[0].schedules && games[0].schedules.length > 0) {
        setSelectedSchedule(games[0].schedules[0])
      }
    }
  }, [games, selectedGame, setSelectedGame, setSelectedSchedule])

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game)
    if (game.schedules && game.schedules.length > 0) {
      setSelectedSchedule(game.schedules[0])
    } else {
      setSelectedSchedule(null)
    }
  }

  const handleAddToCart = () => {
    if (!selectedGame || !selectedSchedule || !number || amount <= 0) {
      toast.error('Completa todos los campos')
      return
    }

    // Validate number length
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
      multiplier: selectedGame.multiplier
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

  const handlePrint = () => {
    if (!lastTicket) return
    
    // Open print window with ticket data
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const currency = settings.currency || 'C$'
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Ticket ${lastTicket.ticketNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 5mm; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .separator { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 3px 0; }
            .total { font-size: 14px; font-weight: bold; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="center large bold">${settings.businessName || 'LOTERIA'}</div>
          <div class="center">${new Date(lastTicket.createdAt).toLocaleString('es-NI')}</div>
          <div class="center bold">Ticket: ${lastTicket.ticketNumber}</div>
          <div class="separator"></div>
          <table>
            <thead>
              <tr class="bold">
                <td>Juego</td>
                <td>Num</td>
                <td>Hora</td>
                <td class="right">Monto</td>
              </tr>
            </thead>
            <tbody>
              ${lastTicket.items.map((item: TicketItem & { game?: { name: string } }) => `
                <tr>
                  <td>${item.game?.name || 'N/A'}</td>
                  <td>${item.number}</td>
                  <td>${item.schedule}</td>
                  <td class="right">${currency}${item.amount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="separator"></div>
          <div class="right total">TOTAL: ${currency}${lastTicket.totalAmount.toFixed(2)}</div>
          <div class="separator"></div>
          <div class="center">${settings.ticketMessage || '¡Buena suerte!'}</div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const currency = settings.currency || 'C$'

  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 h-full">
      {/* Left panel - Game selection and number input */}
      <div className="lg:col-span-2 space-y-4">
        {/* Cash warning */}
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

        {/* Game selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seleccionar Juego</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {games.map((game) => (
                <Button
                  key={game.id}
                  variant={selectedGame?.id === game.id ? 'default' : 'outline'}
                  className={cn(
                    "h-auto flex-col gap-1 py-3",
                    selectedGame?.id === game.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleGameSelect(game)}
                >
                  <span className="font-semibold">{game.name}</span>
                  <span className="text-xs opacity-70">
                    {game.digitCount} dígito{game.digitCount > 1 ? 's' : ''} | x{game.multiplier}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schedule selection */}
        {selectedGame && selectedGame.schedules && selectedGame.schedules.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedGame.schedules.map((schedule) => (
                  <Button
                    key={schedule.id}
                    variant={selectedSchedule?.id === schedule.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSchedule(schedule)}
                  >
                    {schedule.name} - {schedule.time}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Number and amount input */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Number input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Número</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={number}
                  readOnly
                  placeholder={`${selectedGame?.digitCount || 2} dígitos`}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
              <NumPad 
                value={number} 
                onChange={setNumber} 
                maxLength={selectedGame?.digitCount || 2}
              />
            </CardContent>
          </Card>

          {/* Amount input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monto ({currency})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={amount || ''}
                  readOnly
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
              <AmountPad value={amount} onChange={setAmount} />
            </CardContent>
          </Card>
        </div>

        {/* Add button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={handleAddToCart}
          disabled={!selectedGame || !selectedSchedule || !number || amount <= 0 || !isCashOpen}
        >
          <Plus className="mr-2 h-5 w-5" />
          Agregar Jugada
        </Button>
      </div>

      {/* Right panel - Cart */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrito ({cart.length})
          </CardTitle>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Carrito vacío</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.gameName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.scheduleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold font-mono">
                        {item.number}
                      </span>
                      <span className="text-lg font-semibold text-primary">
                        {currency}{item.amount}
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
        </ScrollArea>

        {/* Cart footer */}
        <div className="border-t p-4 space-y-3">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total:</span>
            <span className="text-2xl text-primary">
              {currency}{getCartTotal().toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={cart.length === 0 || !isCashOpen}
            >
              <Check className="mr-2 h-4 w-4" />
              Vender
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venta</DialogTitle>
            <DialogDescription>
              ¿Deseas confirmar esta venta?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span>Jugadas:</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold mt-2">
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

      {/* Success dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">Venta Exitosa</DialogTitle>
            <DialogDescription>
              El ticket ha sido generado correctamente.
            </DialogDescription>
          </DialogHeader>

          {lastTicket && (
            <div className="space-y-3 py-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-sm text-muted-foreground">Ticket #</div>
                <div className="text-lg font-mono font-bold">{lastTicket.ticketNumber}</div>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">{currency}{lastTicket.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
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
