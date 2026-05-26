'use client'

import { useCallback, useEffect, useState } from 'react'
import { dbEvents } from '@/lib/events'
import type { Result } from '@/lib/types'
import { resultsService } from '../services/results.service'
import { toast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

export function useResultsManager() {
  const [results, setResults] = useState<Result[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await resultsService.getAll()
      setResults(data)
    } catch (error) {
      console.error('Error al cargar resultados:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cargar resultados',
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
    return dbEvents.on('results:changed', refresh)
  }, [refresh])

  useEffect(() => {
    // Usar un ID único para este canal para evitar errores de suscripción duplicada
    const channelId = Math.random().toString(36).substring(7);
    const resultsChannel = supabase
      .channel(`public:results_sync_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', table: 'results', schema: 'public' },
        () => {
          refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(resultsChannel)
    }
  }, [refresh])

  const addResult = async (data: {
    gameId: string
    scheduleId: string
    winningNumber: string
    drawDate?: Date
  }) => {
    setIsSubmitting(true)
    try {
      const result = await resultsService.add(data)
      toast({ title: 'Resultado guardado correctamente' })
      
      // Proceso automático de ganadores
      toast({ title: 'Buscando ganadores...' })
      const processing = await resultsService.process(result.id)
      
      if (processing.winnersCount > 0) {
        toast({ title: `¡Se encontraron ${processing.winnersCount} ganadores!` })
      } else {
        toast({ title: 'No se encontraron ganadores para este sorteo' })
      }
      
      await refresh()
      return result
    } catch (error) {
      console.error('Error al guardar resultado:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar resultado',
        description: error instanceof Error ? error.message : 'Desconocido'
      })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    results,
    isLoading,
    isSubmitting,
    addResult,
    refresh
  }
}

export const useTodayResults = () => {
  const { results, isLoading, refresh } = useResultsManager()
  
  const today = new Date().toISOString().split('T')[0]
  const todayResults = results.filter(r => new Date(r.drawDate).toISOString().split('T')[0] === today)

  return { results: todayResults, isLoading, refresh }
}
