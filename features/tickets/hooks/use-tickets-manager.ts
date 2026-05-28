'use client'

import { dbEvents } from '@/lib/events'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { Ticket, CartItem } from '@/lib/types'
import { ticketsService } from '../services/tickets.service'
import { toast } from '@/components/ui/use-toast'

function parseLocalDate(value?: string) {
  if (!value) return undefined

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

export function useTickets(options?: { startDate?: string; endDate?: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parsedStartDate = useMemo(
    () => {
      const parsedDate = parseLocalDate(options?.startDate)
      return parsedDate ? startOfDay(parsedDate) : undefined
    },
    [options?.startDate]
  )
  
  const parsedEndDate = useMemo(
    () => {
      const parsedDate = parseLocalDate(options?.endDate)
      return parsedDate ? endOfDay(parsedDate) : undefined
    },
    [options?.endDate]
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      if (options?.startDate || options?.endDate) {
        const { tickets: fetchedTickets } = await ticketsService.getTickets({
          startDate: parsedStartDate,
          endDate: parsedEndDate
        })
        setTickets(fetchedTickets)
      } else {
        const { tickets: data } = await ticketsService.getTickets({
          startDate: startOfDay(new Date()),
          endDate: endOfDay(new Date())
        })
        setTickets(data)
      }
    } catch (error) {
      console.error('Error al cargar tickets:', error)
      toast({ variant: 'destructive', title: 'Error al cargar tickets' })
    } finally {
      setIsLoading(false)
    }
  }, [options?.startDate, options?.endDate, parsedStartDate, parsedEndDate])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createTicket = async (items: CartItem[]) => {
    setIsSubmitting(true)
    try {
      const ticket = await ticketsService.createTicket(items)
      toast({ title: `Ticket ${ticket.ticketNumber} creado` })
      await refresh()
      return ticket
    } catch (error) {
      console.error('Error al crear ticket:', error)
      toast({ variant: 'destructive', title: 'Error al crear el ticket' })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelTicket = async (id: string, reason: string) => {
    try {
      await ticketsService.cancelTicket(id, reason)
      toast({ title: 'Ticket cancelado exitosamente' })
      await refresh()
      return true
    } catch (error) {
      console.error('Error al cancelar ticket:', error)
      toast({ variant: 'destructive', title: 'Error al cancelar el ticket' })
      throw error
    }
  }

  const deleteTicket = async (id: string) => {
    try {
      await ticketsService.deleteTicket(id)
      toast({ title: 'Ticket anulado exitosamente' })
      await refresh()
      return true
    } catch (error) {
      console.error('Error al anular ticket:', error)
      toast({ variant: 'destructive', title: 'Error al anular el ticket' })
      throw error
    }
  }

  const getTicketByNumber = async (ticketNumber: string) => {
    try {
      return await ticketsService.searchTicket(ticketNumber)
    } catch (error) {
      console.error('Error al buscar ticket:', error)
      return null
    }
  }


  useEffect(() => {
    return dbEvents.on('tickets:changed', refresh)
  }, [refresh])

  return {
    tickets,
    isLoading,
    isSubmitting,
    createTicket,
    cancelTicket,
    deleteTicket,
    getTicketByNumber,
    refresh
  }
}
