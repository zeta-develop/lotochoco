'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Gamepad2, Plus, User } from 'lucide-react'
import type { Game, DrawSchedule } from '@/lib/types'

interface SaleEntryCardProps {
  games: Game[]
  selectedGame: Game | null
  selectedSchedule: DrawSchedule | null
  number: string
  amount: number
  client: string
  currency: string
  isCashOpen: boolean
  formatTime12h: (time?: string) => string
  onGameSelect: (game: Game) => void
  onScheduleSelect: (schedule: DrawSchedule | null) => void
  onNumberChange: (value: string) => void
  onAmountChange: (value: number) => void
  onClientChange: (value: string) => void
  onAddToCart: () => void
}

export function SaleEntryCard({
  games,
  selectedGame,
  selectedSchedule,
  number,
  amount,
  client,
  currency,
  isCashOpen,
  formatTime12h,
  onGameSelect,
  onScheduleSelect,
  onNumberChange,
  onAmountChange,
  onClientChange,
  onAddToCart,
}: SaleEntryCardProps) {
  return (
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
              className="h-14 w-full rounded-2xl border-2 border-muted bg-background px-4 text-sm font-bold focus:border-primary transition-all outline-none"
              value={selectedGame?.id || ''}
              onChange={(event) => {
                const game = games.find((item) => item.id === event.target.value)
                if (game) onGameSelect(game)
              }}
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
              className="h-14 w-full rounded-2xl border-2 border-muted bg-background px-4 text-sm font-bold focus:border-primary transition-all outline-none disabled:opacity-50"
              value={selectedSchedule?.id || ''}
              onChange={(event) => {
                const schedule = selectedGame?.schedules?.find((item) => item.id === event.target.value)
                onScheduleSelect(schedule || null)
              }}
              disabled={!selectedGame || !selectedGame.schedules?.length}
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
              onChange={(event) => onNumberChange(event.target.value.replace(/\D/g, '').slice(0, selectedGame?.digitCount || 2))}
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
                onChange={(event) => onAmountChange(Number(event.target.value) || 0)}
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
              onChange={(event) => onClientChange(event.target.value)}
              placeholder="Identificador del cliente..."
              className="h-14 pl-12 rounded-2xl border-2 border-muted focus:border-primary transition-all font-bold"
            />
          </div>
        </div>

        <Button
          size="lg"
          className="h-14 w-full text-sm font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
          onClick={onAddToCart}
          disabled={!selectedGame || !selectedSchedule || !number || amount <= 0 || !isCashOpen}
        >
          <Plus className="mr-2 h-5 w-5" />
          Añadir al Ticket
        </Button>
      </CardContent>
    </Card>
  )
}