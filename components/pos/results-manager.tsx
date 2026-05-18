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
import { NumPad } from './num-pad'
import { useGames } from '@/hooks/use-games'
import { useResults, useTodayResults } from '@/hooks/use-results'
import { Plus, Trophy, Check, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Game, DrawSchedule } from '@/lib/types'

export function ResultsManager() {
  const { games } = useGames()
  const { results: todayResults, refresh: refreshToday } = useTodayResults()
  const { createResult } = useResults()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<DrawSchedule | null>(null)
  const [winningNumber, setWinningNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGameChange = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    setSelectedGame(game || null)
    setSelectedSchedule(null)
    setWinningNumber('')
  }

  const handleScheduleChange = (scheduleId: string) => {
    const schedule = selectedGame?.schedules?.find(s => s.id === scheduleId)
    setSelectedSchedule(schedule || null)
  }

  const handleSubmitResult = async () => {
    if (!selectedGame || !selectedSchedule || !winningNumber) {
      toast.error('Completa todos los campos')
      return
    }

    if (winningNumber.length !== selectedGame.digitCount) {
      toast.error(`El número debe tener ${selectedGame.digitCount} dígito(s)`)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await createResult({
        gameId: selectedGame.id,
        scheduleId: selectedSchedule.id,
        winningNumber: winningNumber.padStart(selectedGame.digitCount, '0'),
        autoProcess: true
      })

      const winnersCount = response.isProcessed?.winnersCount || 0
      const totalPrizes = response.isProcessed?.totalPrizes || 0

      toast.success(
        winnersCount > 0 
          ? `Resultado registrado. ${winnersCount} ganador(es), total: ${totalPrizes}`
          : 'Resultado registrado. Sin ganadores.'
      )
      
      setShowCreateDialog(false)
      setSelectedGame(null)
      setSelectedSchedule(null)
      setWinningNumber('')
      refreshToday()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar resultado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    setSelectedGame(null)
    setSelectedSchedule(null)
    setWinningNumber('')
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
                      {result.winningNumber}
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
                setSelectedGame(game)
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
                <Label>Número Ganador</Label>
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
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitResult}
              disabled={!selectedGame || !selectedSchedule || !winningNumber || isSubmitting}
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
