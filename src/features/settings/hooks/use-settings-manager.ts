'use client'

import { useCallback, useEffect, useState } from 'react'
import { dbEvents } from '@/lib/events'
import { useSettingsStore } from '../store/settings.store'
import { settingsService } from '../services/settings.service'

const LOCAL_KEYS = ['bluetoothDeviceId', 'bluetoothDeviceName', 'printerAddress', 'printerType', 'theme']

export function useSettingsManager() {
  // ⚡ Bolt: Optimización de rendimiento
  // Selectores individuales para evitar re-renderizados innecesarios
  const settings = useSettingsStore(state => state.settings)
  const setSettings = useSettingsStore(state => state.setSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const remoteSettings = await settingsService.getAll()
      
      const currentLocalSettings = useSettingsStore.getState().settings
      const merged = { ...currentLocalSettings, ...remoteSettings }
      
      // Asegurar que los ajustes locales del dispositivo NO sean sobrescritos por la DB remota
      LOCAL_KEYS.forEach(key => {
        if (currentLocalSettings[key]) {
          merged[key] = currentLocalSettings[key]
        }
      })

      setSettings(merged)
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

  useEffect(() => {
    return dbEvents.on('settings:changed', refresh)
  }, [refresh])

  const updateSettings = async (newSettings: Partial<Record<string, string>>) => {
    // Actualización optimista local: garantiza que la app use inmediatamente
    // la configuración (ej: ticketTemplate) aunque falle la escritura remota.
    const current = useSettingsStore.getState().settings
    const optimisticSettings = { ...current, ...newSettings } as Record<string, string>
    setSettings(optimisticSettings)

    try {
      const remoteUpdates: Partial<Record<string, string>> = {}
      const localUpdates: Partial<Record<string, string>> = {}

      for (const [key, value] of Object.entries(newSettings)) {
        if (LOCAL_KEYS.includes(key)) {
          localUpdates[key] = value
        } else {
          remoteUpdates[key] = value
        }
      }

      // 1. Actualizar remotos en Supabase (si hay alguno)
      if (Object.keys(remoteUpdates).length > 0) {
        await settingsService.update(remoteUpdates)
      }

      // Si hubo cambios locales, disparar evento interno para refrescar UI
      if (Object.keys(localUpdates).length > 0) {
        dbEvents.emit('settings:changed')
      }
    } catch (error) {
      console.error('Error al actualizar ajustes:', error)
      throw error
    }
  }

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refresh,
  }
}
