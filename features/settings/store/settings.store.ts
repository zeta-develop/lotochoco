'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_TICKET_TEMPLATE } from '../utils/ticket-template'

export interface SettingsState {
  settings: Record<string, string>
  setSettings: (settings: Record<string, string>) => void
  updateSetting: (key: string, value: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        businessName: 'LOTERIA',
        currency: 'C$',
        ticketMessage: '¡Buena suerte!',
        printerType: 'bluetooth',
        printerAddress: '',
        darkMode: 'false',
        bluetoothDeviceId: '',
        bluetoothDeviceName: '',
        ticketWidth: '58mm',
        vendorName: 'Yamileth',
        ticketTemplate: DEFAULT_TICKET_TEMPLATE
      },
      setSettings: (settings) => set({ settings }),
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }))
      }
    }),
    {
      name: 'lotochoco-settings-storage',
    }
  )
)
