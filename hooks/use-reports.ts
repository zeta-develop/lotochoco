'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { SalesReport } from '@/lib/types'
import {
  OFFLINE_DB_UPDATED_EVENT,
  bootstrapOfflineData,
  getOfflineCancellations,
  getOfflineDailyReport,
  getOfflineGameReport,
  getOfflineSalesReport,
  getOfflineWeeklyReport,
} from '@/lib/local-db'

function useReportAutoRefresh(refresh: () => Promise<void>) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUpdated = () => {
      void refresh()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    window.addEventListener(OFFLINE_DB_UPDATED_EVENT, handleUpdated)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener(OFFLINE_DB_UPDATED_EVENT, handleUpdated)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])
}

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

  const parsedStartDate = useMemo(
    () => (options?.startDate ? startOfDay(new Date(options.startDate)) : undefined),
    [options?.startDate]
  )
  const parsedEndDate = useMemo(
    () => (options?.endDate ? endOfDay(new Date(options.endDate)) : undefined),
    [options?.endDate]
  )

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setReport(
        getOfflineSalesReport({
          startDate: parsedStartDate,
          endDate: parsedEndDate,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte'))
    }
  }, [parsedEndDate, parsedStartDate])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled) return
      setIsLoading(true)
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [refresh])

  useReportAutoRefresh(refresh)

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

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setReport(getOfflineDailyReport(date ? new Date(date) : new Date()))
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte diario'))
    }
  }, [date])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled) return
      setIsLoading(true)
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [date, refresh])

  useReportAutoRefresh(refresh)

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

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = getOfflineWeeklyReport()
      setDays(data.days)
      setTotals(data.totals)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte semanal'))
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled) return
      setIsLoading(true)
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [refresh])

  useReportAutoRefresh(refresh)

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

  const parsedStartDate = useMemo(
    () => (options?.startDate ? startOfDay(new Date(options.startDate)) : undefined),
    [options?.startDate]
  )
  const parsedEndDate = useMemo(
    () => (options?.endDate ? endOfDay(new Date(options.endDate)) : undefined),
    [options?.endDate]
  )

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setGames(
        getOfflineGameReport({
          startDate: parsedStartDate,
          endDate: parsedEndDate,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte por juego'))
    }
  }, [parsedEndDate, parsedStartDate])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled) return
      setIsLoading(true)
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [refresh])

  useReportAutoRefresh(refresh)

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

  const parsedStartDate = useMemo(
    () => (options?.startDate ? startOfDay(new Date(options.startDate)) : undefined),
    [options?.startDate]
  )
  const parsedEndDate = useMemo(
    () => (options?.endDate ? endOfDay(new Date(options.endDate)) : undefined),
    [options?.endDate]
  )

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setCancellations(
        getOfflineCancellations({
          startDate: parsedStartDate,
          endDate: parsedEndDate,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar cancelaciones'))
    }
  }, [parsedEndDate, parsedStartDate])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled) return
      setIsLoading(true)
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [refresh])

  useReportAutoRefresh(refresh)

  return {
    cancellations,
    isLoading,
    error,
    refresh,
  }
}
