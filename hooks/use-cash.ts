'use client'

import { dbEvents } from '@/lib/events'

import { useCallback, useEffect, useState } from 'react'
import type { CashSession } from '@/lib/types'
import { getCurrentSession, openCashSession, closeCashSession, addCashMovement, getCashSummary } from '@/services/cash'
import { toast } from 'sonner'

export function useCash() {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState({
    openingAmount: 0,
    salesTotal: 0,
    prizesTotal: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0
  })

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const [session, cashSummary] = await Promise.all([
        getCurrentSession(),
        getCashSummary()
      ])
      setCurrentSession(session)
      setSummary(cashSummary)
    } catch (error) {
      console.error('Error al cargar datos de caja:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openSession = async (amount: number) => {
    try {
      const session = await openCashSession(amount)
      toast.success('Caja abierta correctamente')
      await refresh()
      return session
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al abrir caja')
      throw error
    }
  }

  const closeSession = async (notes?: string) => {
    if (!currentSession) return
    try {
      const session = await closeCashSession(currentSession.id, notes)
      toast.success('Caja cerrada correctamente')
      await refresh()
      return session
    } catch (error) {
      toast.error('Error al cerrar caja')
      throw error
    }
  }

  const addMovement = async (type: 'income' | 'expense', amount: number, description: string) => {
    if (!currentSession) {
      toast.error('No hay una sesión de caja abierta')
      return
    }
    try {
      const movement = await addCashMovement({
        cashSessionId: currentSession.id,
        type,
        amount,
        description
      })
      toast.success('Movimiento registrado')
      await refresh()
      return movement
    } catch (error) {
      toast.error('Error al registrar movimiento')
      throw error
    }
  }


  useEffect(() => {
    return dbEvents.on('cash:changed', refresh)
  }, [refresh])

  return {
    currentSession,
    isOpen: !!currentSession,
    summary,
    isLoading,
    openSession,
    closeSession,
    addMovement,
    refresh
  }
}

export const useCurrentSession = () => {
  const { currentSession, isOpen, isLoading, refresh, openSession, closeSession, addMovement } = useCash()

  useEffect(() => {
    return dbEvents.on('cash:changed', refresh)
  }, [refresh])


  return { session: currentSession, isOpen, isLoading, refresh, openSession, closeSession, addMovement }
}

export const useCashSummary = () => {
  const { summary, isLoading, refresh } = useCash()

  return { summary, isLoading, refresh }
}

export const useCashSessions = () => {
  const { isLoading, refresh } = useCash()
  const [sessions, setSessions] = useState<CashSession[]>([])

  useEffect(() => {
    const load = async () => {
      const { getCashSessions } = await import('@/services/cash')
      const data = await getCashSessions()
      setSessions(data)
    }
    load()
  }, [refresh])


  useEffect(() => {
    const load = async () => {
      const { getCashSessions } = await import('@/services/cash')
      const data = await getCashSessions()
      setSessions(data)
    }
    return dbEvents.on('cash:changed', load)
  }, [])

  return { sessions, isLoading, refresh }
}

