'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Game } from '@/lib/types'
import { gamesService } from '@/services/games'

export function useGames(activeOnly = true) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = activeOnly 
        ? await gamesService.getActive() 
        : await gamesService.getAll()
      setGames(data)
    } catch (error) {
      console.error('Error en useGames refresh:', error)
      setError(error instanceof Error ? error : new Error('Error al cargar juegos'))
    }
  }, [activeOnly])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      setIsLoading(true)
      // Asegurarse de que existan juegos por defecto la primera vez
      try {
        await gamesService.seedDefaultGames()
      } catch (e) {
        console.warn('Error al sembrar juegos por defecto:', e)
      }
      
      if (cancelled) return
      
      void refresh().finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [refresh])

  const createGame = async (gameData: {
    name: string
    digitCount: number
    multiplier: number
    schedules?: { name: string; time: string }[]
  }) => {
    const game = await gamesService.create(gameData)
    await refresh()
    return game
  }

  const updateGame = async (id: string, updates: Partial<Game>) => {
    const game = await gamesService.update(id, updates)
    await refresh()
    return game
  }

  const deleteGame = async (id: string) => {
    await gamesService.delete(id)
    await refresh()
  }

  return {
    games,
    isLoading,
    error,
    createGame,
    updateGame,
    deleteGame,
    refresh,
  }
}
