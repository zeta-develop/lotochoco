'use client'

import { dbEvents } from '@/lib/events'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { SalesReport } from '@/lib/types'
import { reportsService } from '../services/reports.service'

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
      const data = await reportsService.getSales({
        startDate: date ? parseLocalDate(date) : undefined
      })
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

export function useCancellationsReport(date?: string) {
  const [cancellations, setCancellations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { ticketsService } = await import('@/features/tickets/services/tickets.service')
      const start = parseLocalDate(date) || new Date()
      const end = new Date(start)
      end.setHours(23, 59, 59, 999)
      
      const { tickets } = await ticketsService.getTickets({
        startDate: start,
        endDate: end,
        status: 'cancelled',
        limit: 100
      })
      
      setCancellations(tickets)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar cancelaciones'))
    } finally {
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    void refresh()
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
