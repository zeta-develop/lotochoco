'use client'

import { dbEvents } from '@/lib/events'

import { useCallback, useEffect, useState } from 'react'
import type { PyramidResult } from '@/lib/types'
import {
  analyzeNumber,
  generatePyramid,
  generateReversePyramid,
  getLuckyNumbers
} from '../services/pyramid'

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
      const pyramid = generatePyramid(selectedDate)
      const reversePyramid = generateReversePyramid(selectedDate)
      
      // Adaptar el formato esperado por el componente (rows de números)
      const pyramidWithRows = {
        ...pyramid,
        rows: pyramid.layers.map(layer => layer.map(Number))
      }
      
      const reversePyramidWithRows = {
        ...reversePyramid,
        rows: reversePyramid.layers.map(layer => layer.map(Number))
      }

      const luckyNumbers = getLuckyNumbers(pyramid)

      setData({
        pyramid: pyramidWithRows,
        luckyNumbers,
        reversePyramid: reversePyramidWithRows,
        hotNumbers: [], // Se cargará dinámicamente si es necesario
        coldNumbers: [],
        totalResults: 0,
        totalWinners: 0,
      })
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al calcular pirámide'))
    }
  }, [date])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
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
      const { resultsService } = await import('@/features/results/services/results.service')
      const frequency = await resultsService.getHotColdNumbers(gameId, 10)
      setData(frequency)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar números'))
    }
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [gameId, refresh])

  useEffect(() => {
    return dbEvents.on('results:changed', refresh)
  }, [refresh])

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
    if (!number) return
    setIsLoading(true)
    const selectedDate = date ? new Date(date) : new Date()
    const pyramid = generatePyramid(selectedDate)
    setData(analyzeNumber(number, pyramid))
    setIsLoading(false)
  }, [number, date])

  return {
    compatibility: data.compatibility,
    message: data.message,
    isLoading,
    error
  }
}
