'use client'

import { useEffect, useState } from 'react'
import type { Ticket, CartItem } from '@/lib/types'
import {
  bootstrapOfflineData,
  cancelOfflineTicket,
  createOfflineTicket,
  getOfflineTicketById,
  getOfflineTickets,
  getOfflineTodayTickets,
} from '@/lib/local-db'

export function useTickets(options?: {
  today?: boolean
  status?: string
  startDate?: string
  endDate?: string
}) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      if (options?.today) {
        setData(getOfflineTodayTickets())
        return
      }

      setData(
        getOfflineTickets({
          status: options?.status,
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar tickets'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [options?.today, options?.status, options?.startDate, options?.endDate])

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
    return getOfflineTicketById(idOrNumber) || getOfflineTicketByNumber(idOrNumber) || null
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
