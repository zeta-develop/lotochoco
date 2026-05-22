'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Result } from '@/lib/types'
import { getTodayResults, createResult, processResult } from '@/services/results'
import { toast } from 'sonner'

export function useResults() {
  const [results, setResults] = useState<Result[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getTodayResults()
      setResults(data)
    } catch (error) {
      console.error('Error al cargar resultados:', error)
      toast.error(error instanceof Error ? `Error: ${error.message}` : 'Error al cargar resultados')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addResult = async (data: {
    gameId: string
    scheduleId: string
    winningNumber: string
    drawDate?: Date
  }) => {
    setIsSubmitting(true)
    try {
      const result = await createResult(data)
      toast.success('Resultado guardado correctamente')
      
      // Proceso automático de ganadores
      toast.info('Buscando ganadores...')
      const processing = await processResult(result.id)
      
      if (processing.winnersCount > 0) {
        toast.success(`¡Se encontraron ${processing.winnersCount} ganadores!`)
      } else {
        toast.info('No se encontraron ganadores para este sorteo')
      }
      
      await refresh()
      return result
    } catch (error) {
      console.error('Error al guardar resultado:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar resultado')
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
  const { results, isLoading, refresh } = useResults()
  return { results, isLoading, refresh }
}

export const useWinners = () => {
  const { isLoading, refresh } = useResults()
  const [winners, setWinners] = useState<Winner[]>([])

  useEffect(() => {
    const load = async () => {
      const { getWinners } = await import('@/services/results')
      const data = await getWinners()
      setWinners(data)
    }
    load()
  }, [refresh])

  const markAsPaid = async (winnerId: string) => {
    const { markWinnerAsPaid } = await import('@/services/results')
    await markWinnerAsPaid(winnerId)
  }

  return { winners, isLoading, refresh, markAsPaid }
}

export const usePendingWinners = () => {
  const { isLoading, refresh } = useResults()
  const [winners, setWinners] = useState<Winner[]>([])

  useEffect(() => {
    const load = async () => {
      const { getWinners } = await import('@/services/results')
      const data = await getWinners({ isPaid: false })
      setWinners(data)
    }
    load()
  }, [refresh])

  return { winners, isLoading, refresh }
}

import type { Winner } from '@/lib/types'

