'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  TrendingDown,
  ShieldCheck,
  Receipt,
  Trophy,
  History
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
    <div className="space-y-4 max-w-2xl mx-auto pb-16 text-slate-100">
      {/* Shift / Operator Banner */}
      <div className="bg-[#131b2e] px-4 py-2.5 rounded-2xl border border-[#1e293b] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              Control de Caja • {settings.businessName || 'LOTOCHOCO'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {isOpen ? 'Sesión Abierta' : 'Sesión Cerrada'} {session && `• Desde: ${format(new Date(session.openedAt), "hh:mm a", { locale: es })}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isOpen ? "bg-[#10b981] pulse-dot" : "bg-amber-400"
          )} />
          <span className={cn(
            "text-xs font-mono font-bold uppercase",
            isOpen ? "text-[#10b981]" : "text-amber-400"
          )}>
            {isOpen ? 'Activa' : 'Cerrada'}
          </span>
        </div>
      </div>

      {!isOpen ? (
        /* CAJA CERRADA - HERO CARD */
        <Card className="border border-amber-500/30 bg-[#131b2e] rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">
              Caja Registradora Cerrada
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 font-mono">
              Para comenzar a emitir tickets y procesar jugadas de lotería, debes abrir el turno e ingresar el fondo inicial de caja.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setShowOpenDialog(true)}
            className="w-full h-14 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black text-sm rounded-2xl active-glow active:scale-98 transition-all shadow-lg"
          >
            <Unlock className="mr-2 h-5 w-5" />
            ABRIR CAJA (FONDO INICIAL)
          </Button>
        </Card>
      ) : (
        /* CAJA ABIERTA - FULL STITCH WORKSPACE */
        <div className="space-y-4">
          {/* 1. BIG HERO METRIC CARD (BALANCE EN CAJA) */}
          <section className="relative overflow-hidden rounded-3xl bg-[#131b2e] border border-[#10b981]/40 active-glow p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#060e20] border border-[#1e293b] flex items-center justify-center text-[#10b981]">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-[#10b981] uppercase tracking-wider font-bold block">
                    BALANCE EN CAJA
                  </span>
                  <p className="text-xs text-slate-400 leading-none mt-0.5">
                    Efectivo total esperado en gaveta
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 text-[10px] font-mono font-bold">
                AUDITADO
              </span>
            </div>

            {/* Main High-Contrast Figure */}
            <div className="mt-4 mb-2">
              <span className="font-mono text-3xl sm:text-4xl font-black text-[#10b981] tracking-tight drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]">
                {currency}{(summary.balance || 0).toLocaleString()}
              </span>
            </div>

            {/* Footer telemetry */}
            <div className="pt-3 mt-3 border-t border-[#1e293b] flex items-center justify-between font-mono text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Turno en curso</span>
              </div>
              <div className="flex items-center gap-1 text-slate-200 font-semibold">
                <Receipt className="h-3.5 w-3.5 text-[#10b981]" />
                <span>{session?.movements?.length || 0} movimientos</span>
              </div>
            </div>
          </section>

          {/* 2. REAL-TIME CASH BREAKDOWN (2x2 ERGONOMIC TACTILE MATRIX) */}
          <section className="grid grid-cols-2 gap-3">
            {/* Card 1: Fondo Inicial */}
            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-[#1e293b] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Fondo Inicial</span>
                <Unlock className="h-4 w-4 text-slate-500" />
              </div>
              <div className="font-mono text-lg font-black text-slate-100 tracking-tight">
                {currency}{(summary.openingAmount || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">Base de apertura</span>
            </div>

            {/* Card 2: Ventas Efectivo */}
            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-[#10b981]/30 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-[#10b981] mb-1">
                <span className="text-xs font-bold text-slate-200">Ventas Efectivo</span>
                <TrendingUp className="h-4 w-4 text-[#10b981]" />
              </div>
              <div className="font-mono text-lg font-black text-[#10b981] tracking-tight">
                +{currency}{(summary.salesTotal || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-[#10b981]/80 mt-1 font-mono">Ingresos de tickets</span>
            </div>

            {/* Card 3: Premios Pagados */}
            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-amber-500/30 flex flex-col justify-between amber-glow shadow-sm">
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-xs font-bold text-slate-200">Premios Pagados</span>
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <div className="font-mono text-lg font-black text-amber-400 tracking-tight">
                -{currency}{(summary.prizesTotal || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-400/80 mt-1 font-mono">Premios cancelados</span>
            </div>

            {/* Card 4: Retiros / Gastos */}
            <div className="bg-[#131b2e] p-3.5 rounded-2xl border border-[#1e293b] flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Retiros / Salidas</span>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
              <div className="font-mono text-lg font-black text-red-400 tracking-tight">
                -{currency}{(summary.expenseTotal || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">Egresos manuales</span>
            </div>
          </section>

          {/* 3. TACTILE ACTION BUTTONS BAR */}
          <section className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMovementType('income')
                  setShowMovementDialog(true)
                }}
                className="h-12 bg-[#131b2e] hover:bg-[#1e293b] border-[#1e293b] text-[#10b981] hover:text-[#10b981] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4" />
                <span>+ Entrada Efectivo</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setMovementType('expense')
                  setShowMovementDialog(true)
                }}
                className="h-12 bg-[#131b2e] hover:bg-[#1e293b] border-[#1e293b] text-red-400 hover:text-red-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Minus className="h-4 w-4" />
                <span>- Retiro / Gasto</span>
              </Button>
            </div>

            {/* Big Close & Audit Trigger */}
            <Button
              onClick={() => setShowCloseDialog(true)}
              className="w-full h-14 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black text-sm rounded-2xl active-glow flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg"
            >
              <Lock className="h-5 w-5" />
              <span>CIERRE Y ARQUEO DE CAJA</span>
            </Button>
          </section>

          {/* 4. CHRONOLOGICAL MOVEMENTS FEED */}
          <Card className="border border-[#1e293b] bg-[#131b2e] rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="bg-[#060e20] py-3 px-4 border-b border-[#1e293b]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#10b981]" />
                  Movimientos del Turno
                </CardTitle>
                <Badge className="bg-[#060e20] text-slate-300 border border-[#1e293b] text-[10px] font-mono">
                  {session?.movements?.length || 0} registros
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-52">
                {session?.movements && session.movements.length > 0 ? (
                  <div className="space-y-1.5">
                    {session.movements.slice(0, 15).map((movement) => {
                      const isPositive = movement.type === 'income' || movement.type === 'sale'
                      return (
                        <div
                          key={movement.id}
                          className="flex items-center justify-between rounded-xl bg-[#060e20] p-2.5 border border-[#1e293b]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold",
                              isPositive ? "bg-[#10b981]/15 text-[#10b981]" : "bg-red-500/15 text-red-400"
                            )}>
                              {isPositive ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-200 truncate">{movement.description}</div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {format(new Date(movement.createdAt), "hh:mm a")}
                              </div>
                            </div>
                          </div>
                          <span className={cn(
                            "font-mono text-sm font-black shrink-0 ml-2",
                            isPositive ? "text-[#10b981]" : "text-red-400"
                          )}>
                            {isPositive ? '+' : '-'}{currency}{Math.abs(movement.amount).toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500 font-mono text-xs">
                    Sin movimientos registrados en este turno
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. PREVIOUS CLOSED SESSIONS */}
      <Card className="border border-[#1e293b] bg-[#131b2e] rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="bg-[#060e20] py-3 px-4 border-b border-[#1e293b]">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            Historial de Sesiones Anteriores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {recentSessions.filter(s => s.status === 'closed').length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-mono text-xs">
              Sin sesiones anteriores archivadas
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.filter(s => s.status === 'closed').slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-[#060e20] p-3 border border-[#1e293b]"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-200">
                      {format(new Date(s.openedAt), "dd/MM/yyyy", { locale: es })}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {format(new Date(s.openedAt), "hh:mm a")} - {s.closedAt && format(new Date(s.closedAt), "hh:mm a")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-slate-100">
                      Cierre: {currency}{(s.closingAmount || 0).toLocaleString()}
                    </div>
                    <div className={cn(
                      "text-[10px] font-mono font-bold",
                      (s.salesTotal - s.prizesTotal) >= 0 ? "text-[#10b981]" : "text-red-400"
                    )}>
                      Ganancia: {currency}{((s.salesTotal || 0) - (s.prizesTotal || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OPEN DIALOG */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="rounded-3xl border border-[#1e293b] bg-[#0b1326] shadow-2xl sm:max-w-sm text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-[#10b981]">
              Apertura de Caja
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-slate-400">
              Ingresa el efectivo disponible en gaveta para iniciar el turno.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Label className="text-xs font-bold text-slate-300">Fondo Inicial ({currency})</Label>
            <Input
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
              className="text-2xl h-14 mt-2 bg-[#060e20] border-[#1e293b] font-mono font-black text-[#10b981] rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowOpenDialog(false)} className="bg-[#131b2e] border-[#1e293b] text-slate-300 rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleOpenSession} disabled={isSubmitting} className="bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black rounded-xl active-glow">
              {isSubmitting ? 'Abriendo...' : 'Confirmar Apertura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLOSE DIALOG */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="rounded-3xl border border-[#1e293b] bg-[#0b1326] shadow-2xl sm:max-w-sm text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-amber-400">
              Cierre y Arqueo de Caja
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-slate-400">
              Confirma el cierre y genera el reporte impreso del turno.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="rounded-2xl bg-[#060e20] border border-[#1e293b] p-3 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Balance final:</span>
                <span className="font-bold text-[#10b981]">{currency}{(summary.balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ganancia neta:</span>
                <span className={cn(
                  "font-bold",
                  summary.salesTotal - summary.prizesTotal >= 0 ? "text-[#10b981]" : "text-red-400"
                )}>
                  {currency}{((summary.salesTotal || 0) - (summary.prizesTotal || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Observaciones (opcional)</Label>
              <Textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Notas de arqueo..."
                className="bg-[#060e20] border-[#1e293b] text-xs text-slate-200 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} className="bg-[#131b2e] border-[#1e293b] text-slate-300 rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleCloseSession} disabled={isSubmitting} className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl">
              {isSubmitting ? 'Cerrando...' : 'Cerrar e Imprimir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOVEMENT DIALOG */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="rounded-3xl border border-[#1e293b] bg-[#0b1326] shadow-2xl sm:max-w-sm text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-[#10b981]">
              {movementType === 'income' ? 'Registrar Entrada' : 'Registrar Salida'}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-slate-400">
              {movementType === 'income' ? 'Ingresa dinero adicional que entra a la caja.' : 'Ingresa un gasto o retiro de dinero de la caja.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div>
              <Label className="text-xs text-slate-300">Monto ({currency})</Label>
              <Input
                type="number"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="0.00"
                className="text-xl h-12 bg-[#060e20] border-[#1e293b] font-mono font-bold text-white rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Descripción o Concepto</Label>
              <Input
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                placeholder="Ej: Cambio de billetes, pago de recibo..."
                className="bg-[#060e20] border-[#1e293b] text-xs text-white rounded-xl mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMovementDialog(false)} className="bg-[#131b2e] border-[#1e293b] text-slate-300 rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleAddMovement}
              disabled={isSubmitting}
              className={cn(
                "font-black rounded-xl",
                movementType === 'expense' ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 active-glow"
              )}
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Movimiento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

