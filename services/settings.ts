import { dbEvents } from '@/lib/events'
import type { SettingKey } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  businessName: 'Loteria La Fortuna',
  currency: 'C$',
  ticketMessage: 'Buena suerte! Gracias por su compra.',
  printerType: 'network',
  printerAddress: '',
  darkMode: 'false',
  bluetoothDeviceId: '',
  bluetoothDeviceName: '',
  ticketFontSize: 'normal',
  ticketFontType: 'A',
  ticketDensity: '1'
}

export async function getSetting(key: SettingKey): Promise<string> {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).single()
  if (error || !data) return DEFAULT_SETTINGS[key]
  return data.value
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { data: settings, error } = await supabase.from('settings').select('key, value')
  const result: Record<string, string> = { ...DEFAULT_SETTINGS }
  if (!error && settings) { for (const setting of settings) { result[setting.key] = setting.value } }
  return result
}

export async function updateSetting(key: SettingKey, value: string): Promise<void> {
  const { data: existing } = await supabase.from('settings').select('id').eq('key', key).single()
  const id = existing?.id || generateId()
  const { error } = await supabase.from('settings').upsert({ id, key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) { console.error(`Error updating setting ${key}:`, error) }
}

export async function updateSettings(settings: Partial<Record<SettingKey, string>>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) { await updateSetting(key as SettingKey, value as string) }
}

export async function initializeSettings(): Promise<void> {
  const { count, error } = await supabase.from('settings').select('*', { count: 'exact', head: true })
  if (!error && count === 0) { for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) { await updateSetting(key as SettingKey, value as string) } }
}

export const settingsService = {
  getAll: getAllSettings,
  get: getSetting,
  update: async (settings: Record<string, string | number | boolean>) => {
    const normalized: Partial<Record<SettingKey, string>> = {}
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'printerIp') { normalized.printerAddress = String(value); continue }
      if (key === 'darkMode') { normalized.darkMode = String(value); continue }
      if (['businessName','currency','ticketMessage','printerType','printerAddress','bluetoothDeviceId','bluetoothDeviceName','ticketFontSize','ticketFontType','ticketDensity'].includes(key)) {
        normalized[key as SettingKey] = String(value)
      }
    }
    await updateSettings(normalized)
    dbEvents.emit('settings:changed')
    return getAllSettings()
  },
  updateMany: updateSettings,
  initialize: initializeSettings
}
