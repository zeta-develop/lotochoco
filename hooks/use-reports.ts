'use client'

import { dbEvents } from '@/lib/events'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { SalesReport } from '@/lib/types'
import { reportsService } from '@/services/reports'

function parseLocalDate(value?: string) {
  if (!value) return undefined

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
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
    () => {
      const parsedDate = parseLocalDate(options?.startDate)
      return parsedDate ? startOfDay(parsedDate) : undefined
    },
    [options?.startDate]
  )
  const parsedEndDate = useMemo(
    () => {
      const parsedDate = parseLocalDate(options?.endDate)
      return parsedDate ? endOfDay(parsedDate) : undefined
    },
    [options?.endDate]
  )

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await reportsService.getSales({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      })
      setReport(data)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte'))
    }
  }, [parsedEndDate, parsedStartDate])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [refresh])


  useEffect(() => {
    const offTickets = dbEvents.on('tickets:changed', refresh);
    const offCash = dbEvents.on('cash:changed', refresh);
    return () => {
      offTickets();
      offCash();
    }
  }, [refresh])

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
      const data = await reportsService.getSales(date ? parseLocalDate(date) || new Date() : new Date())
      setReport(data)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte diario'))
    }
  }, [date])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [date, refresh])


  useEffect(() => {
    const offTickets = dbEvents.on('tickets:changed', refresh);
    const offCash = dbEvents.on('cash:changed', refresh);
    return () => {
      offTickets();
      offCash();
    }
  }, [refresh])

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
      const data = await reportsService.getSales()
      setDays(data.days)
      setTotals(data.totals)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte semanal'))
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [refresh])


  useEffect(() => {
    const offTickets = dbEvents.on('tickets:changed', refresh);
    const offCash = dbEvents.on('cash:changed', refresh);
    return () => {
      offTickets();
      offCash();
    }
  }, [refresh])

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
    () => {
      const parsedDate = parseLocalDate(options?.startDate)
      return parsedDate ? startOfDay(parsedDate) : undefined
    },
    [options?.startDate]
  )
  const parsedEndDate = useMemo(
    () => {
      const parsedDate = parseLocalDate(options?.endDate)
      return parsedDate ? endOfDay(parsedDate) : undefined
    },
    [options?.endDate]
  )

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await reportsService.getGameStats({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      })
      setGames(data)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar reporte por juego'))
    }
  }, [parsedEndDate, parsedStartDate])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [refresh])


  useEffect(() => {
    const offTickets = dbEvents.on('tickets:changed', refresh);
    const offCash = dbEvents.on('cash:changed', refresh);
    return () => {
      offTickets();
      offCash();
    }
  }, [refresh])

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
    createdAt: Date
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
      const { getCancellations } = await import('@/services/tickets')
      const data = await getCancellations({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      })
      setCancellations(data)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar cancelaciones'))
    }
  }, [parsedEndDate, parsedStartDate])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [refresh])


  useEffect(() => {
    const offTickets = dbEvents.on('tickets:changed', refresh);
    const offCash = dbEvents.on('cash:changed', refresh);
    return () => {
      offTickets();
      offCash();
    }
  }, [refresh])

  return {
    cancellations,
    isLoading,
    error,
    refresh,
  }
}
