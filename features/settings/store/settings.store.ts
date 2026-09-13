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
        ticketTemplate: `# {{businessName}}
--------------------------------
{{receiptType}}
Folio: {{ticketNumber}}
Fecha: {{date}}
Juego: {{gameName}}
Sorteo: {{scheduleName}}
{{#if client}}Cliente: {{client}}
{{/if}}Vendedor: {{vendorName}}
--------------------------------
Apuesta         Monto     Premio
--------------------------------
{{#items}}
{{number}}               {{amount}}         {{prize}}
{{/items}}
--------------------------------
**TOTAL: {{currency}} {{total}}**

Valido para 1 sorteo
Por favor revise su boleto
Premio valido por 7 dias

[QR]`
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
