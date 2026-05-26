'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  settings: Record<string, string>
  setSettings: (settings: Record<string, string>) => void
  updateSetting: (key: string, value: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        businessName: 'Lotería La Fortuna',
        currency: 'C$',
        ticketMessage: '¡Buena suerte!',
        printerType: 'network',
        printerAddress: '192.168.1.100',
        darkMode: 'false',
        bluetoothDeviceId: '',
        bluetoothDeviceName: '',
        ticketWidth: '58mm',
        ticketTemplate: `# {{businessName}}
RECIBO DE VENTA
--------------------------------
TICKET: #{{ticketNumber}}
FECHA: {{date}}
{{#if client}}CLIENTE: {{client}}{{/if}}
--------------------------------
JUEGO      NUM       MONTO
--------------------------------
{{#items}}
{{game}}  {{number}}  {{currency}}{{amount}}  Prem: {{currency}}{{prize}}
{{/items}}
--------------------------------
**TOTAL: {{currency}}{{total}}**

{{ticketMessage}}
*** CONSERVE ESTE TICKET ***`
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
