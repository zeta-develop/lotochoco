'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Trophy } from 'lucide-react'
import type { Result } from '@/lib/types'

interface DashboardResultsCardProps {
  results: Result[]
}

export function DashboardResultsCard({ results }: DashboardResultsCardProps) {
  return (
    <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
      <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Trophy className="h-5 w-5" /></div>
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Resultados de Hoy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest">Sin resultados aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.slice(0, 5).map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between rounded-2xl border-2 border-muted bg-background p-4 transition-all hover:border-primary/30"
              >
                <div className="space-y-1">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase">{result.game?.name}</Badge>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {result.schedule?.name}
                  </div>
                </div>
                <div className="text-3xl font-black font-mono text-primary bg-primary/5 px-3 py-1 rounded-xl">
                  {result.winningNumber}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
