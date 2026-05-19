'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Trophy } from 'lucide-react'
import type { Winner } from '@/lib/types'

interface DashboardPendingWinnersCardProps {
  winners: Winner[]
  currency: string
}

export function DashboardPendingWinnersCard({ winners, currency }: DashboardPendingWinnersCardProps) {
  return (
    <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
      <CardHeader className="bg-orange-500/5 pb-6 border-b border-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-600"><DollarSign className="h-5 w-5" /></div>
          <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
            Premios Pendientes
            {winners.length > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full px-2">{winners.length}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {winners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest">Sin premios pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {winners.slice(0, 5).map((winner) => (
              <div
                key={winner.id}
                className="flex items-center justify-between rounded-2xl border-2 border-orange-500/30 bg-orange-500/5 p-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="font-mono font-black text-sm">{winner.ticket?.ticketNumber}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {winner.result?.game?.name} - {winner.result?.winningNumber}
                  </div>
                </div>
                <div className="text-xl font-black text-orange-600 dark:text-orange-400">
                  {currency}{winner.prizeAmount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
