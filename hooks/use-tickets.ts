'use client'

import { dbEvents } from '@/lib/events'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { Ticket, CartItem } from '@/lib/types'
import { ticketsService } from '@/services/tickets'
import { toast } from 'sonner'

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
        const { tickets: fetchedTickets } = await ticketsService.getAll({
          startDate: parsedStartDate,
          endDate: parsedEndDate
        })
        setTickets(fetchedTickets)
      } else {
        const { tickets: data } = await ticketsService.getAll({
          startDate: startOfDay(new Date()),
          endDate: endOfDay(new Date())
        })
        setTickets(data)
      }
    } catch (error) {
      console.error('Error al cargar tickets:', error)
      toast.error('Error al cargar tickets')
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
      const ticket = await ticketsService.create(items)
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
      await ticketsService.cancel(id, reason)
      toast.success('Ticket cancelado exitosamente')
      await refresh()
      return true
    } catch (error) {
      console.error('Error al cancelar ticket:', error)
      toast.error('Error al cancelar el ticket')
      throw error
    }
  }

  const getTicketByNumber = async (ticketNumber: string) => {
    try {
      return await ticketsService.search(ticketNumber)
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
    getTicketByNumber,
    refresh
  }
}
