'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardCashSummaryCardProps {
  currency: string
  summary: {
    openingAmount: number
    salesTotal: number
    prizesTotal: number
    incomeTotal: number
    expenseTotal: number
    balance: number
  }
}

export function DashboardCashSummaryCard({ summary, currency }: DashboardCashSummaryCardProps) {
  return (
    <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-400">
      <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Wallet className="h-5 w-5" /></div>
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Estado de Caja</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl bg-muted/50 p-4 border border-muted-foreground/5 shadow-sm text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Apertura</div>
            <div className="text-lg font-black">
              {currency}{summary.openingAmount.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-green-500/10 p-4 border border-green-500/20 shadow-sm text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">Ventas</div>
            <div className="text-lg font-black text-green-700 dark:text-green-400">
              +{currency}{summary.salesTotal.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-red-500/10 p-4 border border-red-500/20 shadow-sm text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Premios</div>
            <div className="text-lg font-black text-red-700 dark:text-red-400">
              -{currency}{summary.prizesTotal.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-blue-500/10 p-4 border border-blue-500/20 shadow-sm text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Entradas</div>
            <div className="text-lg font-black text-blue-700 dark:text-blue-400">
              +{currency}{summary.incomeTotal.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-orange-500/10 p-4 border border-orange-500/20 shadow-sm text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">Salidas</div>
            <div className="text-lg font-black text-orange-700 dark:text-orange-400">
              -{currency}{summary.expenseTotal.toLocaleString()}
            </div>
          </div>
          <div className={cn(
            'rounded-2xl p-4 border shadow-sm text-center',
            summary.balance >= 0 ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
          )}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-foreground">Balance Final</div>
            <div className={cn(
              'text-xl font-black',
              summary.balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            )}>
              {currency}{summary.balance.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
