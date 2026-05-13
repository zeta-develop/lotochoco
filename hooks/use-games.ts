'use client'

import { useEffect, useState } from 'react'
import type { Game } from '@/lib/types'
import {
  bootstrapOfflineData,
  createOfflineGame,
  deleteOfflineGame,
  getOfflineGames,
  updateOfflineGame,
} from '@/lib/local-db'

export function useGames(activeOnly = true) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      setGames(getOfflineGames(activeOnly))
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar juegos'))
    }
  }

  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [activeOnly])

  const createGame = async (gameData: {
    name: string
    digitCount: number
    multiplier: number
    schedules?: { name: string; time: string }[]
  }) => {
    const game = createOfflineGame(gameData)
    await refresh()
    return game
  }

  const updateGame = async (id: string, updates: Partial<Game>) => {
    const game = updateOfflineGame(id, updates)
    await refresh()
    return game
  }

  const deleteGame = async (id: string) => {
    deleteOfflineGame(id)
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
