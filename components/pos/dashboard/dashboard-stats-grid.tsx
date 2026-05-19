'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DashboardStat, DashboardStatTone } from '@/lib/dashboard'

interface DashboardStatsGridProps {
  stats: DashboardStat[]
}

const toneStyles: Record<DashboardStatTone, { gradient: string; titleColor: string; valColor: string }> = {
  green: {
    gradient: 'from-green-500/10 to-green-600/5',
    titleColor: 'text-green-600',
    valColor: 'text-green-700',
  },
  blue: {
    gradient: 'from-blue-500/10 to-blue-600/5',
    titleColor: 'text-blue-600',
    valColor: 'text-blue-700',
  },
  orange: {
    gradient: 'from-orange-500/10 to-orange-600/5',
    titleColor: 'text-orange-600',
    valColor: 'text-orange-700',
  },
  red: {
    gradient: 'from-red-500/10 to-red-600/5',
    titleColor: 'text-red-600',
    valColor: 'text-red-700',
  },
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
      {stats.map((stat) => {
        const styles = toneStyles[stat.tone]

        return (
        <Card key={stat.title} className={cn('overflow-hidden border-none shadow-sm bg-gradient-to-br', styles.gradient)}>
          <CardContent className="p-4 relative">
            <div className="absolute right-[-10px] top-[-10px] opacity-10">
              <stat.icon size={60} className={styles.titleColor} />
            </div>
            <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', styles.titleColor)}>{stat.title}</p>
            <h3 className={cn('text-2xl font-black', styles.valColor)}>{stat.value}</h3>
          </CardContent>
        </Card>
        )
      })}
    </div>
  )
}
