'use client'

import useSWR from 'swr'
import type { Result, Winner } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useResults(options?: {
  today?: boolean
  gameId?: string
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams()
  
  if (options?.today) params.set('today', 'true')
  if (options?.gameId) params.set('gameId', options.gameId)
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const url = `/api/results${params.toString() ? `?${params.toString()}` : ''}`
  
  const { data, error, isLoading, mutate } = useSWR<Result[]>(url, fetcher)

  const createResult = async (resultData: {
    gameId: string
    scheduleId: string
    winningNumber: string
    drawDate?: Date
    autoProcess?: boolean
  }) => {
    const response = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al registrar resultado')
    }
    
    const result = await response.json()
    mutate()
    return result
  }

  return {
    results: data || [],
    isLoading,
    error,
    createResult,
    refresh: mutate
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
  const params = new URLSearchParams()
  
  if (options?.isPaid !== undefined) params.set('isPaid', String(options.isPaid))
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const url = `/api/winners${params.toString() ? `?${params.toString()}` : ''}`
  
  const { data, error, isLoading, mutate } = useSWR<Winner[]>(url, fetcher)

  const markAsPaid = async (winnerId: string) => {
    const response = await fetch('/api/winners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerId })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al marcar como pagado')
    }
    
    const winner = await response.json()
    mutate()
    return winner
  }

  return {
    winners: data || [],
    isLoading,
    error,
    markAsPaid,
    refresh: mutate
  }
}

export function usePendingWinners() {
  return useWinners({ isPaid: false })
}
