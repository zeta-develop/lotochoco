'use client'

import useSWR from 'swr'
import type { SalesReport } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSalesReport(options?: {
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams({ type: 'sales' })
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const { data, error, isLoading, mutate } = useSWR<SalesReport>(
    `/api/reports?${params.toString()}`,
    fetcher
  )

  return {
    report: data || {
      totalSales: 0,
      totalTickets: 0,
      totalPrizes: 0,
      totalPaid: 0,
      pendingPrizes: 0,
      netProfit: 0
    },
    isLoading,
    error,
    refresh: mutate
  }
}

export function useDailyReport(date?: string) {
  const params = new URLSearchParams({ type: 'daily' })
  if (date) params.set('date', date)
  
  const { data, error, isLoading, mutate } = useSWR<SalesReport>(
    `/api/reports?${params.toString()}`,
    fetcher
  )

  return {
    report: data || {
      totalSales: 0,
      totalTickets: 0,
      totalPrizes: 0,
      totalPaid: 0,
      pendingPrizes: 0,
      netProfit: 0
    },
    isLoading,
    error,
    refresh: mutate
  }
}

export function useWeeklyReport() {
  const { data, error, isLoading, mutate } = useSWR<{
    days: { date: string; sales: number; prizes: number }[]
    totals: SalesReport
  }>('/api/reports?type=weekly', fetcher)

  return {
    days: data?.days || [],
    totals: data?.totals || {
      totalSales: 0,
      totalTickets: 0,
      totalPrizes: 0,
      totalPaid: 0,
      pendingPrizes: 0,
      netProfit: 0
    },
    isLoading,
    error,
    refresh: mutate
  }
}

export function useGameReport(options?: {
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams({ type: 'games' })
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const { data, error, isLoading, mutate } = useSWR<{
    gameId: string
    gameName: string
    ticketCount: number
    totalAmount: number
    prizesAmount: number
  }[]>(`/api/reports?${params.toString()}`, fetcher)

  return {
    games: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

export function useCancellationsReport(options?: {
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams({ type: 'cancellations' })
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const { data, error, isLoading, mutate } = useSWR<{
    id: string
    ticketNumber: string
    totalAmount: number
    reason: string
    createdAt: string
  }[]>(`/api/reports?${params.toString()}`, fetcher)

  return {
    cancellations: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}
