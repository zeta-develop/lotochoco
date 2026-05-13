'use client'

import { useEffect, useState } from 'react'
import type { SalesReport } from '@/lib/types'
import {
  bootstrapOfflineData,
  getOfflineCancellations,
  getOfflineDailyReport,
  getOfflineGameReport,
  getOfflineSalesReport,
  getOfflineWeeklyReport,
} from '@/lib/local-db'

export function useSalesReport(options?: {
  startDate?: string
  endDate?: string
}) {
  const [report, setReport] = useState<SalesReport>({
    totalSales: 0,
    totalTickets: 0,
    totalPrizes: 0,
    totalPaid: 0,
    pendingPrizes: 0,
    netProfit: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setReport(
        getOfflineSalesReport({
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [options?.startDate, options?.endDate])

  return {
    report,
    isLoading,
    error,
    refresh,
  }
}

export function useDailyReport(date?: string) {
  const [report, setReport] = useState<SalesReport>({
    totalSales: 0,
    totalTickets: 0,
    totalPrizes: 0,
    totalPaid: 0,
    pendingPrizes: 0,
    netProfit: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setReport(getOfflineDailyReport(date ? new Date(date) : new Date()))
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte diario'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [date])

  return {
    report,
    isLoading,
    error,
    refresh,
  }
}

export function useWeeklyReport() {
  const [days, setDays] = useState<{ date: string; sales: number; prizes: number }[]>([])
  const [totals, setTotals] = useState<SalesReport>({
    totalSales: 0,
    totalTickets: 0,
    totalPrizes: 0,
    totalPaid: 0,
    pendingPrizes: 0,
    netProfit: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      const data = getOfflineWeeklyReport()
      setDays(data.days)
      setTotals(data.totals)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte semanal'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [])

  return {
    days,
    totals,
    isLoading,
    error,
    refresh,
  }
}

export function useGameReport(options?: {
  startDate?: string
  endDate?: string
}) {
  const [games, setGames] = useState<{
    gameId: string
    gameName: string
    ticketCount: number
    totalAmount: number
    prizesAmount: number
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setGames(
        getOfflineGameReport({
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte por juego'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [options?.startDate, options?.endDate])

  return {
    games,
    isLoading,
    error,
    refresh,
  }
}

export function useCancellationsReport(options?: {
  startDate?: string
  endDate?: string
}) {
  const [cancellations, setCancellations] = useState<{
    id: string
    ticketNumber: string
    totalAmount: number
    reason: string
    createdAt: string
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setCancellations(
        getOfflineCancellations({
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar cancelaciones'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [options?.startDate, options?.endDate])

  return {
    cancellations,
    isLoading,
    error,
    refresh,
  }
}
