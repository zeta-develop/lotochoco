'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePOSStore } from '@/store/pos-store'

export function useSettings() {
  const { settings: localSettings, setSettings } = usePOSStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const { getSettings } = await import('@/services/settings')
      const remoteSettings = await getSettings()
      
      // Sincronizar store con base de datos
      Object.entries(remoteSettings).forEach(([key, value]) => {
        setSettings({ [key]: value })
      })
    } catch (error) {
      console.error('Error al cargar ajustes:', error)
      setError(error instanceof Error ? error : new Error('Error al cargar ajustes'))
    }
  }, [setSettings])

  useEffect(() => {
    setIsLoading(true)
    void refresh().finally(() => {
      setIsLoading(false)
    })
  }, [refresh])

  const updateSettings = async (newSettings: Partial<Record<string, string>>) => {
    try {
      const { updateSettings: updateRemoteSettings } = await import('@/services/settings')
      await updateRemoteSettings(newSettings)
      setSettings(newSettings)
    } catch (error) {
      console.error('Error al actualizar ajustes:', error)
      throw error
    }
  }

  return {
    settings: localSettings,
    isLoading,
    error,
    updateSettings,
    refresh,
  }
}
