'use client'

import { useCallback, useEffect, useState } from 'react'
import { dbEvents } from '@/lib/events'
import type { Winner } from '@/lib/types'
import { winnersService } from '../services/winners.service'
import { toast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

export function useWinnersManager() {
  const [winners, setWinners] = useState<Winner[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await winnersService.getWinners()
      setWinners(data)
    } catch (error) {
      console.error('Error al cargar ganadores:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cargar ganadores',
        description: error instanceof Error ? error.message : 'Desconocido'
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    return dbEvents.on('winners:changed', refresh)
  }, [refresh])

  useEffect(() => {
    const channelId = Math.random().toString(36).substring(7);
    const winnersChannel = supabase
      .channel(`public:winners_sync_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', table: 'winners', schema: 'public' },
        () => {
          refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(winnersChannel)
    }
  }, [refresh])

  const markAsPaid = async (winnerId: string) => {
    try {
      await winnersService.markAsPaid(winnerId)
      toast({ title: 'Premio marcado como pagado' })
    } catch (error) {
      console.error('Error al marcar como pagado:', error)
      toast({
        variant: 'destructive',
        title: 'Error al procesar pago',
        description: error instanceof Error ? error.message : 'Desconocido'
      })
    }
  }

  return {
    winners,
    isLoading,
    refresh,
    markAsPaid
  }
}
