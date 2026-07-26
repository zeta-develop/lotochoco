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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Resultados</h2>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Resultado
        </Button>
      </div>

      {/* Today's results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Resultados de Hoy
            <span className="text-sm font-normal text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No hay resultados registrados hoy</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todayResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{result.game?.name}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.schedule?.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(result.drawDate), 'hh:mm a')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold font-mono text-primary">
                      {result.winningNumber.length === 4 ? formatDateNumber(result.winningNumber) : result.winningNumber}
                    </div>
                    {result.winners && result.winners.length > 0 && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {result.winners.length}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick entry for games */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((game) => (
          <Card key={game.id} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent 
              className="p-4"
              onClick={() => {
                setSelectedGame(game as any)
                setShowCreateDialog(true)
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{game.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {game.schedules?.length || 0} horario(s)
                  </div>
                </div>
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Result Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Registrar Resultado
            </DialogTitle>
            <DialogDescription>
              Ingresa el número ganador del sorteo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Juego</Label>
              <Select
                value={selectedGame?.id || ''}
                onValueChange={handleGameChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un juego" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name} ({game.digitCount} dígitos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGame && selectedGame.schedules && selectedGame.schedules.length > 0 && (
              <div className="space-y-2">
                <Label>Horario</Label>
                <Select
                  value={selectedSchedule?.id || ''}
                  onValueChange={handleScheduleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un horario" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedGame.schedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.name} - {formatTime12h(schedule.time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSchedule && (
              <div className="space-y-2">
                <Label>{isSelectedGameDate ? 'Fecha Ganadora' : 'Número Ganador'}</Label>
                {isSelectedGameDate ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Día</Label>
                        <select
                          value={resultDateDay}
                          onChange={(e) => setResultDateDay(e.target.value)}
                          className="h-14 w-full rounded-lg border bg-background px-3 text-center text-2xl font-black focus:border-primary transition-all outline-none"
                        >
                          <option value="">--</option>
                          {Array.from({ length: getDaysInMonth(parseInt(resultDateMonth) || 12) }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d.toString().padStart(2, '0')}>
                              {d.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mes</Label>
                        <select
                          value={resultDateMonth}
                          onChange={(e) => {
                            setResultDateMonth(e.target.value)
                            const maxDays = getDaysInMonth(parseInt(e.target.value) || 12)
                            if (parseInt(resultDateDay) > maxDays) setResultDateDay(maxDays.toString().padStart(2, '0'))
                          }}
                          className="h-14 w-full rounded-lg border bg-background px-3 text-center text-lg font-bold focus:border-primary transition-all outline-none"
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
                      <div className="text-center py-2 bg-primary/5 rounded-lg border border-primary/10">
                        <span className="text-sm text-muted-foreground">Fecha: </span>
                        <span className="text-lg font-black text-primary">{formatDateNumber(resultDateDay.padStart(2, '0') + resultDateMonth.padStart(2, '0'))}</span>
                      </div>
                    )}
                  </>
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
                    className="text-center text-3xl font-bold h-16 font-mono"
                    maxLength={selectedGame?.digitCount || 2}
                    type="tel"
                    inputMode="numeric"
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitResult}
              disabled={!selectedGame || !selectedSchedule || (!isSelectedGameDate && !winningNumber) || (isSelectedGameDate && (!resultDateDay || !resultDateMonth)) || isSubmitting}
            >
              {isSubmitting ? (
                'Procesando...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Registrar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
