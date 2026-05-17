'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Ticket, CartItem } from '@/lib/types'
import { ticketService } from '@/services/tickets'
import { toast } from 'sonner'

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await ticketService.getTodayTickets()
      setTickets(data)
    } catch (error) {
      console.error('Error al cargar tickets:', error)
      toast.error('Error al cargar tickets')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createTicket = async (items: CartItem[]) => {
    setIsSubmitting(true)
    try {
      const ticket = await ticketService.create(items)
      toast.success(`Ticket ${ticket.ticketNumber} creado`)
      await refresh()
      return ticket
    } catch (error) {
      console.error('Error al crear ticket:', error)
      toast.error('Error al crear el ticket')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelTicket = async (id: string, reason: string) => {
    try {
      const result = await ticketService.cancelTicket(id, reason)
      if (result.success) {
        toast.success(result.message)
        await refresh()
      } else {
        toast.error(result.message)
      }
      return result
    } catch (error) {
      console.error('Error al cancelar ticket:', error)
      toast.error('Error al cancelar el ticket')
      throw error
    }
  }

  const getTicketByNumber = async (ticketNumber: string) => {
    try {
      return await ticketService.getByNumber(ticketNumber)
    } catch (error) {
      console.error('Error al buscar ticket:', error)
      return null
    }
  }

  return {
    tickets,
    isLoading,
    isSubmitting,
    createTicket,
    cancelTicket,
    getTicketByNumber,
    refresh
  }
}
