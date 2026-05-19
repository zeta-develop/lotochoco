'use client'

import { Badge } from '@/components/ui/badge'

export function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
      <div className="space-y-1">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase px-3 py-0.5 rounded-full mb-2">Resumen General</Badge>
        <h1 className="text-4xl font-black tracking-tighter text-foreground">Dashboard</h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Estadísticas en tiempo real</p>
      </div>
    </div>
  )
}
