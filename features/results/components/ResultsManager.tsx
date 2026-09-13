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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useGamesManager } from '@/features/games/hooks/use-games-manager'
import { useResultsManager, useTodayResults } from '../hooks/use-results-manager'
import { Plus, Trophy, Check, Clock, Users, CalendarDays } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { formatTime12h, isDateGame, formatDateNumber, getDaysInMonth } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Game, DrawSchedule } from '@/lib/types'

export function ResultsManager() {
  const { games } = useGamesManager()
  const { results: todayResults, refresh: refreshToday } = useTodayResults()
  const { addResult } = useResultsManager()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<DrawSchedule | null>(null)
  const [winningNumber, setWinningNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado para juegos de fecha (4 dígitos)
  const [resultDateDay, setResultDateDay] = useState('')
  const [resultDateMonth, setResultDateMonth] = useState('')
  const isSelectedGameDate = isDateGame(selectedGame?.digitCount || 0)

  const handleGameChange = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    setSelectedGame(game as any)
    setSelectedSchedule(null)
    setWinningNumber('')
    setResultDateDay('')
    setResultDateMonth('')
  }

  const handleScheduleChange = (scheduleId: string) => {
    const schedule = selectedGame?.schedules?.find(s => s.id === scheduleId)
    setSelectedSchedule(schedule || null)
  }

  const handleSubmitResult = async () => {
    if (!selectedGame || !selectedSchedule) {
      toast({ variant: 'destructive', title: 'Completa todos los campos' })
      return
    }

    let finalNumber = winningNumber

    if (isSelectedGameDate) {
      if (!resultDateDay || !resultDateMonth) {
        toast({ variant: 'destructive', title: 'Selecciona día y mes' })
        return
      }
      finalNumber = resultDateDay.padStart(2, '0') + resultDateMonth.padStart(2, '0')
    } else {
      if (!winningNumber) {
        toast({ variant: 'destructive', title: 'Ingresa el número ganador' })
        return
      }
      if (winningNumber.length !== selectedGame.digitCount) {
        toast({ variant: 'destructive', title: `El número debe tener ${selectedGame.digitCount} dígito(s)` })
        return
      }
      finalNumber = winningNumber.padStart(selectedGame.digitCount, '0')
    }

    setIsSubmitting(true)
    try {
      await addResult({
        gameId: selectedGame.id,
        scheduleId: selectedSchedule.id,
        winningNumber: finalNumber,
      })
      
      setShowCreateDialog(false)
      setSelectedGame(null)
      setSelectedSchedule(null)
      setWinningNumber('')
      setResultDateDay('')
      setResultDateMonth('')
      refreshToday()
    } catch (error) {
      toast({ variant: 'destructive', title: error instanceof Error ? error.message : 'Error al registrar resultado' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    setSelectedGame(null)
    setSelectedSchedule(null)
    setWinningNumber('')
    setResultDateDay('')
    setResultDateMonth('')
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-16 text-slate-100">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131b2e] p-4 rounded-2xl border border-[#1e293b] shadow-sm">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#10b981]" />
            Resultados y Premios
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Sorteos Oficiales de Lotería
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="h-11 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black text-xs rounded-xl active-glow flex items-center gap-1.5 shadow-md"
        >
          <Plus className="h-4 w-4" />
          <span>+ Registrar Ganador</span>
        </Button>
      </div>

      {/* Stats Bento Card */}
      <section className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Resumen de Sorteos de Hoy
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#060e20] text-cyan-400 border border-[#1e293b]">
            {format(new Date(), "d 'de' MMMM", { locale: es })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#060e20] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Sorteos Registrados</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-[#10b981]">{todayResults.length}</span>
              <span className="text-xs text-slate-400 font-mono">publicados</span>
            </div>
          </div>

          <div className="bg-[#060e20] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Boletos Ganadores</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-amber-400">
                {todayResults.reduce((sum, r) => sum + (r.winners?.length || 0), 0)}
              </span>
              <span className="text-xs text-slate-400 font-mono">premiados</span>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY'S RESULTS LIST */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Sorteos Realizados
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {todayResults.length} resultado(s)
          </span>
        </div>

        {todayResults.length === 0 ? (
          <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-8 text-center space-y-3 text-slate-500">
            <Clock className="h-10 w-10 mx-auto opacity-30 text-[#10b981]" />
            <p className="text-xs font-mono uppercase tracking-wider">Aún no hay números ganadores cargados hoy</p>
            <Button
              onClick={openCreateDialog}
              variant="outline"
              className="bg-[#060e20] border-[#1e293b] text-slate-300 hover:text-white rounded-xl text-xs"
            >
              Ingresar primer sorteo
            </Button>
          </div>
        ) : (
          todayResults.map((result) => (
            <article
              key={result.id}
              className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#10b981]" />
                  <span className="text-xs font-bold text-slate-200">
                    {result.game?.name} • {result.schedule?.name}
                  </span>
                </div>
                <Badge className="bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 font-mono text-[10px] font-bold">
                  {format(new Date(result.drawDate), 'hh:mm a')}
                </Badge>
              </div>

              {/* Ball & Details Display */}
              <div className="flex items-center justify-between bg-[#060e20] border border-[#1e293b] rounded-xl p-3">
                <div className="flex items-center gap-3">
                  {/* Esfera Ganadora Esmeralda */}
                  <div className="w-14 h-14 rounded-full bg-[#10b981] text-slate-950 flex items-center justify-center font-mono text-2xl font-black active-glow shrink-0 shadow-md">
                    {result.winningNumber.length === 4 ? formatDateNumber(result.winningNumber) : result.winningNumber}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      Número Ganador
                    </span>
                    <span className="text-sm font-bold text-white">
                      {result.game?.name} ({formatTime12h(result.schedule?.time || '')})
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400 block">
                      Multiplicador {result.game?.multiplier || 70}x
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Ganadores</span>
                  <div className="text-xl font-black font-mono text-[#10b981]">
                    {result.winners?.length || 0}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* QUICK ENTRY CARDS BY GAME */}
      <section className="space-y-2 pt-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-300 px-1 block">
          Ingreso Rápido por Juego
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              onClick={() => {
                setSelectedGame(game as any)
                setShowCreateDialog(true)
              }}
              className="bg-[#131b2e] hover:bg-[#1e293b] border border-[#1e293b] hover:border-[#10b981]/40 rounded-xl p-3 text-left transition-all active:scale-95 group flex flex-col justify-between min-h-[70px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-white group-hover:text-[#10b981] transition-colors truncate">
                  {game.name}
                </span>
                <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#10b981]" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {game.schedules?.length || 0} horarios
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* CREATE RESULT DIALOG */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-3xl border border-[#1e293b] bg-[#0b1326] shadow-2xl sm:max-w-md text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-[#10b981] flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#10b981]" />
              Registrar Resultado Ganador
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-slate-400">
              Ingresa el número oficial sorteado para calcular los tickets ganadores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-slate-300">Juego</Label>
              <Select
                value={selectedGame?.id || ''}
                onValueChange={handleGameChange}
              >
                <SelectTrigger className="h-11 bg-[#060e20] border-[#1e293b] text-xs font-bold text-white rounded-xl mt-1">
                  <SelectValue placeholder="Selecciona un juego" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1326] border-[#1e293b] text-white">
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id} className="text-xs">
                      {game.name} ({game.digitCount} dígitos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGame && selectedGame.schedules && selectedGame.schedules.length > 0 && (
              <div>
                <Label className="text-xs text-slate-300">Horario del Sorteo</Label>
                <Select
                  value={selectedSchedule?.id || ''}
                  onValueChange={handleScheduleChange}
                >
                  <SelectTrigger className="h-11 bg-[#060e20] border-[#1e293b] text-xs font-bold text-white rounded-xl mt-1">
                    <SelectValue placeholder="Selecciona un horario" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1326] border-[#1e293b] text-white">
                    {selectedGame.schedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id} className="text-xs">
                        {schedule.name} - {formatTime12h(schedule.time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSchedule && (
              <div>
                <Label className="text-xs text-slate-300">
                  {isSelectedGameDate ? 'Fecha Ganadora (Día y Mes)' : 'Número Ganador'}
                </Label>
                {isSelectedGameDate ? (
                  <div className="space-y-2 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] font-mono text-slate-400">Día</Label>
                        <select
                          value={resultDateDay}
                          onChange={(e) => setResultDateDay(e.target.value)}
                          className="h-12 w-full rounded-xl border border-[#1e293b] bg-[#060e20] text-center text-xl font-mono font-black text-white focus:border-[#10b981] outline-none mt-0.5"
                        >
                          <option value="">--</option>
                          {Array.from({ length: getDaysInMonth(parseInt(resultDateMonth) || 12) }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d.toString().padStart(2, '0')}>
                              {d.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] font-mono text-slate-400">Mes</Label>
                        <select
                          value={resultDateMonth}
                          onChange={(e) => {
                            setResultDateMonth(e.target.value)
                            const maxDays = getDaysInMonth(parseInt(e.target.value) || 12)
                            if (parseInt(resultDateDay) > maxDays) setResultDateDay(maxDays.toString().padStart(2, '0'))
                          }}
                          className="h-12 w-full rounded-xl border border-[#1e293b] bg-[#060e20] text-center text-xs font-mono font-bold text-white focus:border-[#10b981] outline-none mt-0.5"
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
                    {resultDateDay && resultDateMonth && (
                      <div className="text-center py-2 bg-[#060e20] rounded-xl border border-[#1e293b]">
                        <span className="text-xs text-slate-400 font-mono">Fecha: </span>
                        <span className="text-base font-mono font-black text-[#10b981]">
                          {formatDateNumber(resultDateDay.padStart(2, '0') + resultDateMonth.padStart(2, '0'))}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <Input
                    value={winningNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      if (value.length <= (selectedGame?.digitCount || 2)) {
                        setWinningNumber(value)
                      }
                    }}
                    placeholder={`Ingresa ${selectedGame?.digitCount || 2} dígitos`}
                    className="text-center text-3xl font-black h-16 font-mono tracking-widest bg-[#060e20] border-[#1e293b] text-[#10b981] rounded-xl mt-1 focus:border-[#10b981]"
                    maxLength={selectedGame?.digitCount || 2}
                    type="tel"
                    inputMode="numeric"
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="bg-[#131b2e] border-[#1e293b] text-slate-300 rounded-xl">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitResult}
              disabled={!selectedGame || !selectedSchedule || (!isSelectedGameDate && !winningNumber) || (isSelectedGameDate && (!resultDateDay || !resultDateMonth)) || isSubmitting}
              className="bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-black rounded-xl active-glow"
            >
              {isSubmitting ? (
                'Procesando...'
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Confirmar Resultado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

