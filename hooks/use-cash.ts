'use client'

import useSWR from 'swr'
import type { CashSession } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useCurrentSession() {
  const { data, error, isLoading, mutate } = useSWR<CashSession | null>(
    '/api/cash?current=true',
    fetcher
  )

  const openSession = async (openingAmount: number) => {
    const response = await fetch('/api/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open', openingAmount })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al abrir caja')
    }
    
    const session = await response.json()
    mutate()
    return session
  }

  const closeSession = async (notes?: string) => {
    if (!data?.id) {
      throw new Error('No hay sesión abierta')
    }
    
    const response = await fetch('/api/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', sessionId: data.id, notes })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al cerrar caja')
    }
    
    const session = await response.json()
    mutate()
    return session
  }

  const addMovement = async (type: 'income' | 'expense', amount: number, description: string) => {
    if (!data?.id) {
      throw new Error('No hay sesión abierta')
    }
    
    const response = await fetch('/api/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'movement',
        sessionId: data.id,
        type,
        amount,
        description
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al registrar movimiento')
    }
    
    mutate()
    return await response.json()
  }

  return {
    session: data,
    isOpen: data?.status === 'open',
    isLoading,
    error,
    openSession,
    closeSession,
    addMovement,
    refresh: mutate
  }
}

export function useCashSummary(sessionId?: string) {
  const params = new URLSearchParams({ summary: 'true' })
  if (sessionId) params.set('sessionId', sessionId)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cash?${params.toString()}`,
    fetcher
  )

  return {
    summary: data || {
      openingAmount: 0,
      salesTotal: 0,
      prizesTotal: 0,
      incomeTotal: 0,
      expenseTotal: 0,
      balance: 0
    },
    isLoading,
    error,
    refresh: mutate
  }
}

export function useCashSessions(options?: {
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams()
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const { data, error, isLoading, mutate } = useSWR<CashSession[]>(
    `/api/cash${params.toString() ? `?${params.toString()}` : ''}`,
    fetcher
  )

  return {
    sessions: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}
