'use client'

import useSWR from 'swr'
import { usePOSStore } from '@/store/pos-store'
import { useEffect } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSettings() {
  const { settings: localSettings, setSettings: setLocalSettings, updateSetting: updateLocalSetting } = usePOSStore()
  
  const { data, error, isLoading, mutate } = useSWR<Record<string, string>>(
    '/api/settings',
    fetcher
  )

  // Sync with Zustand store
  useEffect(() => {
    if (data) {
      setLocalSettings(data)
    }
  }, [data, setLocalSettings])

  const updateSettings = async (updates: Record<string, string>) => {
    // Optimistic update
    setLocalSettings({ ...localSettings, ...updates })
    
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      // Revert on error
      mutate()
      const error = await response.json()
      throw new Error(error.error || 'Error al actualizar configuración')
    }
    
    const settings = await response.json()
    setLocalSettings(settings)
    return settings
  }

  const updateSetting = async (key: string, value: string) => {
    return updateSettings({ [key]: value })
  }

  return {
    settings: data || localSettings,
    isLoading,
    error,
    updateSettings,
    updateSetting,
    refresh: mutate
  }
}
