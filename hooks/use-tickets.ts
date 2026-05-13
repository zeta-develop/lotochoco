'use client'

import useSWR from 'swr'
import type { Ticket, CartItem } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useTickets(options?: {
  today?: boolean
  status?: string
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams()
  
  if (options?.today) params.set('today', 'true')
  if (options?.status) params.set('status', options.status)
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)
  
  const url = `/api/tickets${params.toString() ? `?${params.toString()}` : ''}`
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher)

  const createTicket = async (items: CartItem[]) => {
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al crear ticket')
    }
    
    const ticket = await response.json()
    mutate()
    return ticket
  }

  const cancelTicket = async (id: string, reason: string) => {
    const response = await fetch(`/api/tickets/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al cancelar ticket')
    }
    
    mutate()
    return await response.json()
  }

  const getTicket = async (idOrNumber: string): Promise<Ticket | null> => {
    const response = await fetch(`/api/tickets/${idOrNumber}`)
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
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
    refresh: mutate
  }
}

export function useTodayTickets() {
  return useTickets({ today: true })
}
