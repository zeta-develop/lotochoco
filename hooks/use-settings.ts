'use client'

import { useEffect, useState } from 'react'
import { usePOSStore } from '@/store/pos-store'
import {
  bootstrapOfflineData,
  getOfflineSettings,
  updateOfflineSettings,
} from '@/lib/local-db'

export function useSettings() {
  const { settings: localSettings, setSettings: setLocalSettings, updateSetting: updateLocalSetting } = usePOSStore()
  const [data, setData] = useState<Record<string, string> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
    try {
      setError(null)
      const settings = getOfflineSettings()
      setData(settings)
      setLocalSettings(settings)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error al cargar configuración'))
    }
  }

  // Sync with Zustand store
  useEffect(() => {
    bootstrapOfflineData()
    setIsLoading(true)
    void refresh().finally(() => setIsLoading(false))
  }, [setLocalSettings])

  const updateSettings = async (updates: Record<string, string>) => {
    // Optimistic update
    setLocalSettings({ ...localSettings, ...updates })

    const settings = updateOfflineSettings(updates)
    setData(settings)
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
    refresh,
  }
}
