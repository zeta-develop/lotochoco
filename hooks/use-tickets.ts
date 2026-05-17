'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Ticket, CartItem } from '@/lib/types'
import {
  bootstrapOfflineData,
  cancelOfflineTicket,
  createOfflineTicket,
  getOfflineTicketById,
  getOfflineTicketByNumber,
  getOfflineTickets,
  getOfflineTodayTickets,
} from '@/lib/local-db'

function parseLocalDate(value?: string) {
  if (!value) return undefined

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

export function useTickets(options?: {
  today?: boolean
  status?: string
  startDate?: string
  endDate?: string
}) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      if (options?.today) {
        setData(getOfflineTodayTickets())
        return
      }

      setData(
        getOfflineTickets({
          status: options?.status,
          startDate: parseLocalDate(options?.startDate),
          endDate: parseLocalDate(options?.endDate),
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar tickets'))
    }
  }, [options?.endDate, options?.startDate, options?.status, options?.today])

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
  }, [options?.today, options?.status, options?.startDate, options?.endDate, refresh])

  const createTicket = async (items: CartItem[]) => {
    const ticket = createOfflineTicket(items)
    await refresh()
    return ticket
  }

  const cancelTicket = async (id: string, reason: string) => {
    const result = cancelOfflineTicket(id, reason)
    await refresh()
    return result
  }

  const getTicket = async (idOrNumber: string): Promise<Ticket | null> => {
    try {
      return getOfflineTicketById(idOrNumber) || getOfflineTicketByNumber(idOrNumber) || null
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al buscar ticket'))
      return null
    }
  }

  // Handle both today's tickets (array) and paginated results
  const tickets = options?.today ? data : data?.tickets
  const total = options?.today ? data?.length : data?.total

  return {
    tickets: (tickets || []) as Ticket[],
    total: total || 0,
    isLoading,
    error,
    createTicket,
    cancelTicket,
    getTicket,
    refresh,
  }
}

export function useTodayTickets() {
  return useTickets({ today: true })
}
