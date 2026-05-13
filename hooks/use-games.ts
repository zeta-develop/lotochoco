'use client'

import useSWR from 'swr'
import type { Game } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useGames(activeOnly = true) {
  const { data, error, isLoading, mutate } = useSWR<Game[]>(
    `/api/games${activeOnly ? '?active=true' : ''}`,
    fetcher
  )

  const createGame = async (gameData: {
    name: string
    digitCount: number
    multiplier: number
    schedules?: { name: string; time: string }[]
  }) => {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al crear juego')
    }
    
    const game = await response.json()
    mutate()
    return game
  }

  const updateGame = async (id: string, updates: Partial<Game>) => {
    const response = await fetch(`/api/games/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al actualizar juego')
    }
    
    const game = await response.json()
    mutate()
    return game
  }

  const deleteGame = async (id: string) => {
    const response = await fetch(`/api/games/${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al eliminar juego')
    }
    
    mutate()
  }

  return {
    games: data || [],
    isLoading,
    error,
    createGame,
    updateGame,
    deleteGame,
    refresh: mutate
  }
}
