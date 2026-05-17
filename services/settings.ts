import { query, execute } from '@/lib/db'
import type { Setting, SettingKey } from '@/lib/types'
import { generateId } from '@/lib/utils'

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
  const results = await query<Setting>('SELECT "value" FROM "Setting" WHERE "key" = ?', [key])
  return results[0]?.value ?? DEFAULT_SETTINGS[key]
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await query<Setting>('SELECT "key", "value" FROM "Setting"')
  
  const result: Record<string, string> = { ...DEFAULT_SETTINGS }
  
  for (const setting of settings) {
    result[setting.key as SettingKey] = setting.value
  }
  
  return result
}

export async function updateSetting(key: SettingKey, value: string): Promise<void> {
  const id = generateId()
  await execute(
    `INSERT OR REPLACE INTO "Setting" ("id", "key", "value", "updatedAt") 
     VALUES (
       COALESCE((SELECT "id" FROM "Setting" WHERE "key" = ?), ?),
       ?, ?, CURRENT_TIMESTAMP
     )`,
    [key, id, key, value]
  )
}

export async function updateSettings(
  settings: Partial<Record<SettingKey, string>>
): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await updateSetting(key as SettingKey, value as string)
  }
}

export async function initializeSettings(): Promise<void> {
  const results = await query('SELECT COUNT(*) as count FROM Setting')
  const count = results[0]?.count || 0
  
  if (count === 0) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await updateSetting(key as SettingKey, value as string)
    }
  }
}

export const settingsService = {
  getAll: getAllSettings,
  get: getSetting,
  update: async (settings: Record<string, string | number | boolean>) => {
    const normalized: Partial<Record<SettingKey, string>> = {}

    for (const [key, value] of Object.entries(settings)) {
      if (key === 'printerIp') {
        normalized.printerAddress = String(value)
        continue
      }

      if (key === 'darkMode') {
        normalized.darkMode = String(value)
        continue
      }

      if (
        key === 'businessName' ||
        key === 'currency' ||
        key === 'ticketMessage' ||
        key === 'printerType' ||
        key === 'printerAddress' ||
        key === 'bluetoothDeviceId' ||
        key === 'bluetoothDeviceName' ||
        key === 'ticketFontSize' ||
        key === 'ticketFontType' ||
        key === 'ticketDensity'
      ) {
        normalized[key as SettingKey] = String(value)
      }
    }

    await updateSettings(normalized)
    return getAllSettings()
  },
  updateMany: updateSettings,
  initialize: initializeSettings
}
