'use client'

import useSWR from 'swr'
import type { PyramidResult } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function usePyramid(date?: string) {
  const params = new URLSearchParams({ type: 'pyramid' })
  if (date) params.set('date', date)
  
  const { data, error, isLoading, mutate } = useSWR<{
    pyramid: PyramidResult
    luckyNumbers: {
      single: string[]
      double: string[]
      triple: string[]
    }
    reversePyramid: PyramidResult
  }>(`/api/pyramid?${params.toString()}`, fetcher)

  return {
    pyramid: data?.pyramid || null,
    luckyNumbers: data?.luckyNumbers || { single: [], double: [], triple: [] },
    reversePyramid: data?.reversePyramid || null,
    isLoading,
    error,
    refresh: mutate
  }
}

export function useHotColdNumbers(gameId: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    hot: { number: string; frequency: number }[]
    cold: { number: string; frequency: number }[]
  }>(gameId ? `/api/pyramid?type=hot-cold&gameId=${gameId}` : null, fetcher)

  return {
    hot: data?.hot || [],
    cold: data?.cold || [],
    isLoading,
    error,
    refresh: mutate
  }
}

export function useNumberAnalysis(number: string, date?: string) {
  const params = new URLSearchParams({ type: 'analyze', number })
  if (date) params.set('date', date)
  
  const { data, error, isLoading } = useSWR<{
    compatibility: number
    message: string
  }>(number ? `/api/pyramid?${params.toString()}` : null, fetcher)

  return {
    compatibility: data?.compatibility || 0,
    message: data?.message || '',
    isLoading,
    error
  }
}
