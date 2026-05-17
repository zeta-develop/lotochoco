import prisma from '@/lib/db'
import type { Setting, SettingKey } from '@/lib/types'

const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  businessName: 'Loteria La Fortuna',
  currency: 'C$',
  ticketMessage: 'Buena suerte! Gracias por su compra.',
  printerType: 'network',
  printerAddress: '',
  darkMode: 'false',
  bluetoothDeviceId: '',
  bluetoothDeviceName: ''
}

export async function getSetting(key: SettingKey): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key }
  })
  
  return setting?.value ?? DEFAULT_SETTINGS[key]
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany()
  
  const result: Record<string, string> = { ...DEFAULT_SETTINGS }
  
  for (const setting of settings) {
    result[setting.key] = setting.value
  }
  
  return result
}

export async function updateSetting(key: SettingKey, value: string): Promise<Setting> {
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
  
  return setting as Setting
}

export async function updateSettings(
  settings: Partial<Record<SettingKey, string>>
): Promise<void> {
  const updates = Object.entries(settings).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value: value as string },
      create: { key, value: value as string }
    })
  )
  
  await Promise.all(updates)
}

export async function initializeSettings(): Promise<void> {
  const existing = await prisma.setting.count()
  
  if (existing === 0) {
    const entries = Object.entries(DEFAULT_SETTINGS)
    
    await prisma.setting.createMany({
      data: entries.map(([key, value]) => ({ key, value }))
    })
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
        key === 'bluetoothDeviceName'
      ) {
        normalized[key] = String(value)
      }
    }

    await updateSettings(normalized)
    return getAllSettings()
  },
  updateMany: updateSettings,
  initialize: initializeSettings
}
