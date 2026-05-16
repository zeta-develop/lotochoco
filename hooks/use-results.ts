'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Result, Winner } from '@/lib/types'
import {
  bootstrapOfflineData,
  createOfflineResult,
  getOfflineResults,
  getOfflineTodayResults,
  getOfflineWinners,
  markOfflineWinnerAsPaid,
  processOfflineResult,
} from '@/lib/local-db'

export function useResults(options?: {
  today?: boolean
  gameId?: string
  startDate?: string
  endDate?: string
}) {
  const [results, setResults] = useState<Result[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setResults(
        options?.today
          ? getOfflineTodayResults()
          : getOfflineResults({
              gameId: options?.gameId,
              startDate: options?.startDate ? new Date(options.startDate) : undefined,
              endDate: options?.endDate ? new Date(options.endDate) : undefined,
            })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar resultados'))
    }
  }, [options?.endDate, options?.gameId, options?.startDate, options?.today])

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
  }, [options?.today, options?.gameId, options?.startDate, options?.endDate, refresh])

  const createResult = async (resultData: {
    gameId: string
    scheduleId: string
    winningNumber: string
    drawDate?: Date
    autoProcess?: boolean
  }) => {
    const result = createOfflineResult(resultData)
    if (resultData.autoProcess) {
      processOfflineResult(result.id)
    }
    await refresh()
    return result
  }

  return {
    results,
    isLoading,
    error,
    createResult,
    refresh,
  }
}

export function useTodayResults() {
  return useResults({ today: true })
}

export function useWinners(options?: {
  isPaid?: boolean
  startDate?: string
  endDate?: string
}) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setWinners(
        getOfflineWinners({
          isPaid: options?.isPaid,
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar ganadores'))
    }
  }, [options?.endDate, options?.isPaid, options?.startDate])

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
  }, [options?.isPaid, options?.startDate, options?.endDate, refresh])

  const markAsPaid = async (winnerId: string) => {
    const winner = markOfflineWinnerAsPaid(winnerId)
    await refresh()
    return winner
  }

  return {
    winners,
    isLoading,
    error,
    markAsPaid,
    refresh,
  }
}

export function usePendingWinners() {
  return useWinners({ isPaid: false })
}
