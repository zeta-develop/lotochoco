'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PyramidResult } from '@/lib/types'
import {
  analyzeOfflineNumber,
  bootstrapOfflineData,
  generateOfflinePyramid,
  generateOfflineReversePyramid,
  getOfflineNumberFrequency,
} from '@/lib/local-db'

export function usePyramid(date?: string) {
  const [data, setData] = useState<{
    pyramid: (PyramidResult & { rows: number[][] }) | null
    luckyNumbers: {
      single: string[]
      double: string[]
      triple: string[]
    }
    reversePyramid: (PyramidResult & { rows: number[][] }) | null
    hotNumbers?: { number: string; count: number }[]
    coldNumbers?: { number: string; count: number }[]
    totalResults?: number
    totalWinners?: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const selectedDate = date ? new Date(date) : new Date()
      const pyramid = generateOfflinePyramid(selectedDate)
      const reversePyramid = generateOfflineReversePyramid(selectedDate)
      const luckyNumbers = {
        single: pyramid.rows.flat().slice(0, 10).map(String),
        double: pyramid.rows.flat().slice(10, 20).map(String),
        triple: pyramid.rows.flat().slice(20, 30).map(String),
      }

      setData({
        pyramid,
        luckyNumbers,
        reversePyramid,
        hotNumbers: getOfflineNumberFrequency({ limit: 10 }).map((item) => ({ number: item.number, count: item.frequency })),
        coldNumbers: getOfflineNumberFrequency({ limit: 10 }).slice().reverse().map((item) => ({ number: item.number, count: item.frequency })),
        totalResults: 0,
        totalWinners: 0,
      })
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al calcular pirámide'))
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

  return {
    data,
    pyramid: data?.pyramid || null,
    luckyNumbers: data?.luckyNumbers || { single: [], double: [], triple: [] },
    reversePyramid: data?.reversePyramid || null,
    isLoading,
    error,
    refresh,
    mutate: refresh,
  }
}

export function useHotColdNumbers(gameId: string) {
  const [data, setData] = useState<{
    hot: { number: string; frequency: number }[]
    cold: { number: string; frequency: number }[]
  }>({ hot: [], cold: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const frequency = getOfflineNumberFrequency({ gameId, limit: 20 })
      setData({
        hot: frequency.slice(0, 10),
        cold: frequency.slice(-10).reverse(),
      })
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar números'))
    }
  }, [gameId])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled || !gameId) return
      setIsLoading(true)
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [gameId, refresh])

  return {
    hot: data.hot,
    cold: data.cold,
    isLoading,
    error,
    refresh,
  }
}

export function useNumberAnalysis(number: string, date?: string) {
  const [data, setData] = useState<{
    compatibility: number
    message: string
  }>({ compatibility: 0, message: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      await bootstrapOfflineData()
      if (cancelled || !number) return
      setIsLoading(true)
      const selectedDate = date ? new Date(date) : new Date()
      const pyramid = generateOfflinePyramid(selectedDate)
      setData(analyzeOfflineNumber(number, pyramid))
      if (!cancelled) setIsLoading(false)
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [number, date])

  return {
    compatibility: data.compatibility,
    message: data.message,
    isLoading,
    error
  }
}
