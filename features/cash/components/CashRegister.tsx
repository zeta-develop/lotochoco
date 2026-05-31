'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCurrentSession, useCashSummary, useCashSessions } from '@/features/cash/hooks/use-cash-manager'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
import { printHtmlDocument } from '@/lib/print'
import { generateId, formatTime12h } from '@/lib/utils'
import { printerService } from '@/features/settings/services/printer.service'
import { 
  Wallet, 
  DollarSign, 
  Plus, 
  Minus, 
  Lock,
  Unlock,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function CashRegister() {
  const { session, isOpen, openSession, closeSession, addMovement, refresh } = useCurrentSession()
  const { summary, refresh: refreshSummary } = useCashSummary()
  const { sessions: recentSessions } = useCashSessions()
  const { settings } = useSettingsManager()

  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showMovementDialog, setShowMovementDialog] = useState(false)
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income')
  
  const [openingAmount, setOpeningAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currency = settings.currency || 'C$'

  const handleOpenSession = async () => {
    const amount = parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) {
      toast({ variant: 'destructive', title: 'Ingresa un monto válido' })
      return
    }

    setIsSubmitting(true)
    try {
      await openSession(amount)
      toast({ title: 'Caja abierta exitosamente' })
      setShowOpenDialog(false)
      setOpeningAmount('')
      refresh()
      refreshSummary()
    } catch (error) {
      toast({ variant: 'destructive', title: error instanceof Error ? error.message : 'Error al abrir caja' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseSession = async () => {
    setIsSubmitting(true)
    try {
      const closedSession = await closeSession(closeNotes)
      toast({ title: 'Caja cerrada exitosamente' })
      setShowCloseDialog(false)
      setCloseNotes('')
      
      // Print close report
      if (closedSession) {
        try {
          const result = await printerService.printClose(closedSession, settings)
          if (!result) {
            toast({ variant: 'destructive', title: 'Error al imprimir cierre' })
          }
        } catch (err) {
          // ignore
        }
      }
    } catch (error) {
      toast({ variant: 'destructive', title: error instanceof Error ? error.message : 'Error al cerrar caja' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddMovement = async () => {
    const amount = parseFloat(movementAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Ingresa un monto válido' })
      return
    }
    if (!movementDescription.trim()) {
      toast({ variant: 'destructive', title: 'Ingresa una descripción' })
      return
    }

    setIsSubmitting(true)
    try {
      await addMovement(movementType, amount, movementDescription.trim())
      toast({ title: `${movementType === 'income' ? 'Entrada' : 'Salida'} registrada` })
      setShowMovementDialog(false)
      setMovementAmount('')
      setMovementDescription('')
      refresh()
      refreshSummary()
    } catch (error) {
      toast({ variant: 'destructive', title: error instanceof Error ? error.message : 'Error al registrar movimiento' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintClose = (_closedSession: any) => {
    // left for legacy use if needed
  }

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card className={cn(
        "border-2",
        isOpen ? "border-green-500/50 bg-green-500/5" : "border-orange-500/50 bg-orange-500/5"
      )}>
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "rounded-full p-4",
              isOpen ? "bg-green-500/20" : "bg-orange-500/20"
            )}>
              {isOpen ? (
                <Unlock className="h-8 w-8 text-green-500" />
              ) : (
                <Lock className="h-8 w-8 text-orange-500" />
              )}
            </div>
            <div>
              <div className={cn(
                "text-xl font-bold",
                isOpen ? "text-green-600" : "text-orange-600"
              )}>
                Caja {isOpen ? 'Abierta' : 'Cerrada'}
              </div>
              {session && (
                <div className="text-sm text-muted-foreground">
                  Desde: {format(new Date(session.openedAt), "dd/MM/yyyy hh:mm a", { locale: es })}
                </div>
              )}
            </div>
          </div>

          {isOpen ? (
            <Button 
              variant="destructive" 
              size="lg"
              onClick={() => setShowCloseDialog(true)}
            >
              <Lock className="mr-2 h-5 w-5" />
              Cerrar Caja
            </Button>
          ) : (
            <Button 
              size="lg"
              onClick={() => setShowOpenDialog(true)}
            >
              <Unlock className="mr-2 h-5 w-5" />
              Abrir Caja
            </Button>
          )}
        </CardContent>
      </Card>

      {isOpen && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground">Apertura</div>
                <div className="text-xl font-semibold">
                  {currency}{(summary.openingAmount || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500/30">
              <CardContent className="py-4">
                <div className="text-sm text-green-600">Ventas</div>
                <div className="text-xl font-semibold text-green-600">
                  +{currency}{(summary.salesTotal || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-500/30">
              <CardContent className="py-4">
                <div className="text-sm text-red-600">Premios</div>
                <div className="text-xl font-semibold text-red-600">
                  -{currency}{(summary.prizesTotal || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-500/30">
              <CardContent className="py-4">
                <div className="text-sm text-blue-600">Entradas</div>
                <div className="text-xl font-semibold text-blue-600">
                  +{currency}{(summary.incomeTotal || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-500/30">
              <CardContent className="py-4">
                <div className="text-sm text-orange-600">Salidas</div>
                <div className="text-xl font-semibold text-orange-600">
                  -{currency}{(summary.expenseTotal || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "border-2",
              summary.balance >= 0 ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
            )}>
              <CardContent className="py-4">
                <div className="text-sm font-medium">Balance</div>
                <div className={cn(
                  "text-xl font-bold",
                  summary.balance >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {currency}{(summary.balance || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions and movements */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Movimientos de Caja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col gap-2 border-green-500/30 hover:bg-green-500/10"
                    onClick={() => {
                      setMovementType('income')
                      setShowMovementDialog(true)
                    }}
                  >
                    <TrendingUp className="h-6 w-6 text-green-500" />
                    <span>Entrada</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col gap-2 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      setMovementType('expense')
                      setShowMovementDialog(true)
                    }}
                  >
                    <TrendingDown className="h-6 w-6 text-red-500" />
                    <span>Salida</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent movements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Movimientos Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {session?.movements && session.movements.length > 0 ? (
                    <div className="space-y-2">
                      {session.movements.slice(0, 10).map((movement) => (
                        <div
                          key={movement.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "rounded-full p-1.5",
                              movement.type === 'income' || movement.type === 'sale' 
                                ? "bg-green-500/20" 
                                : "bg-red-500/20"
                            )}>
                              {movement.type === 'income' || movement.type === 'sale' ? (
                                <Plus className="h-4 w-4 text-green-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{movement.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(movement.createdAt), "hh:mm a")}
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            "font-semibold",
                            movement.amount > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {movement.amount > 0 ? '+' : ''}{currency}{Math.abs(movement.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Sin movimientos
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sesiones Anteriores</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.filter(s => s.status === 'closed').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Sin sesiones anteriores
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.filter(s => s.status === 'closed').slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">
                      {format(new Date(session.openedAt), "dd/MM/yyyy", { locale: es })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(session.openedAt), "hh:mm a")} - {session.closedAt && format(new Date(session.closedAt), "hh:mm a")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {currency}{(session.closingAmount || 0).toLocaleString()}
                    </div>
                    <div className={cn(
                      "text-sm",
                      session.salesTotal - session.prizesTotal >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      Ganancia: {currency}{((session.salesTotal || 0) - (session.prizesTotal || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Ingresa el monto inicial de caja
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Monto Inicial ({currency})</Label>
            <Input
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
              className="text-2xl h-14 mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenSession} disabled={isSubmitting}>
              {isSubmitting ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
            <DialogDescription>
              Confirma el cierre de la sesión actual
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span>Balance actual:</span>
                <span className="font-bold">{currency}{(summary.balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Ganancia:</span>
                <span className={cn(
                  "font-bold",
                  summary.salesTotal - summary.prizesTotal >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {currency}{((summary.salesTotal || 0) - (summary.prizesTotal || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Observaciones del cierre..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseSession} disabled={isSubmitting}>
              {isSubmitting ? 'Cerrando...' : 'Cerrar e Imprimir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'income' ? 'Registrar Entrada' : 'Registrar Salida'}
            </DialogTitle>
            <DialogDescription>
              {movementType === 'income' 
                ? 'Ingresa el monto que entra a caja'
                : 'Ingresa el monto que sale de caja'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Monto ({currency})</Label>
              <Input
                type="number"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="0.00"
                className="text-xl h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                placeholder="Ej: Cambio de billetes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddMovement} 
              disabled={isSubmitting}
              className={movementType === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
