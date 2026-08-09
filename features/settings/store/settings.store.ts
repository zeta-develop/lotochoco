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
        vendorName: '',
        terminalName: 'Terminal 1',
        printerType: 'network',
        printerAddress: '192.168.1.100',
        darkMode: 'false',
        bluetoothDeviceId: '',
        bluetoothDeviceName: '',
        ticketWidth: '58mm',
        ticketTemplate: `# {{businessName}}
**Juego:** {{gameName}}
**Venta No:** {{ticketNumber}}
**Fecha:** {{date}}
**Sorteo:** {{scheduleName}}

{{#if client}}* **Cliente:** {{client}}{{/if}}
* **Vendedor:** {{vendorName}}
* **Puesto:** {{terminalName}}

--------------------------------
APUESTA    MONTO    PREMIO
--------------------------------
{{#items}}
{{number}}         {{amount}}       {{prize}}
{{/items}}
--------------------------------
**Total: {{currency}}{{total}}**

*Válido para 1 sorteo*
*Por favor revise su ticket*
*Premio válido por 7 días*`
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
