'use client'

import { useEffect, useState } from 'react'
import type { CashSession } from '@/lib/types'
import {
  addOfflineCashMovement,
  bootstrapOfflineData,
  closeOfflineCashSession,
  getOfflineCashSessions,
  getOfflineCashSummary,
  getOfflineCurrentSession,
  openOfflineCashSession,
} from '@/lib/local-db'

export function useCurrentSession() {
  const [session, setSession] = useState<CashSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setSession(getOfflineCurrentSession())
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar caja'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [])

  const openSession = async (openingAmount: number) => {
    const openedSession = openOfflineCashSession(openingAmount)
    await refresh()
    return openedSession
  }

  const closeSession = async (notes?: string) => {
    if (!session?.id) {
      throw new Error('No hay sesión abierta')
    }

    const closedSession = closeOfflineCashSession(session.id, notes)
    await refresh()
    return closedSession
  }

  const addMovement = async (type: 'income' | 'expense', amount: number, description: string) => {
    if (!session?.id) {
      throw new Error('No hay sesión abierta')
    }

    const movement = addOfflineCashMovement({
      cashSessionId: session.id,
      type,
      amount,
      description,
    })
    await refresh()
    return movement
  }

  return {
    session,
    isOpen: session?.status === 'open',
    isLoading,
    error,
    openSession,
    closeSession,
    addMovement,
    refresh,
  }
}

export function useCashSummary(sessionId?: string) {
  const [summary, setSummary] = useState({
    openingAmount: 0,
    salesTotal: 0,
    prizesTotal: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setSummary(getOfflineCashSummary(sessionId))
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar resumen'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [sessionId])

  return {
    summary,
    isLoading,
    error,
    refresh,
  }
}

export function useCashSessions(options?: {
  startDate?: string
  endDate?: string
}) {
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setSessions(
        getOfflineCashSessions({
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar sesiones'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [options?.startDate, options?.endDate])

  return {
    sessions,
    isLoading,
    error,
    refresh,
  }
}
