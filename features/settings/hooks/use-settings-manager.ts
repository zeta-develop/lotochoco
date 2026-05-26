'use client'

import { useCallback, useEffect, useState } from 'react'
import { dbEvents } from '@/lib/events'
import { useSettingsStore } from '../store/settings.store'
import { settingsService } from '../services/settings.service'

export function useSettingsManager() {
  const { settings, setSettings } = useSettingsStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const remoteSettings = await settingsService.getAll()
      // Mezclar: Mantener lo que el usuario tiene localmente (impresora) y actualizar lo de la empresa
      setSettings({ ...useSettingsStore.getState().settings, ...remoteSettings })
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
    try {
      // Definir qué ajustes son estrictamente locales del dispositivo
      const LOCAL_KEYS = ['bluetoothDeviceId', 'bluetoothDeviceName', 'printerAddress', 'printerType', 'theme']
      
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

      // 2. Actualizar locales solo en Zustand (persistencia local)
      const finalSettings = { ...settings, ...newSettings }
      setSettings(finalSettings as Record<string, string>)
      
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
