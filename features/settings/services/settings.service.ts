import { dbEvents } from '@/lib/events'
import { settingsRepository } from '../repositories/settings.repository'

const DEFAULT_SETTINGS: Record<string, string> = {
  businessName: 'Lotería La Fortuna',
  currency: 'C$',
  ticketMessage: '¡Buena suerte! Gracias por su compra.',
  ticketFontSize: 'normal',
  ticketFontType: 'A',
  ticketDensity: '1',
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
}

export const settingsService = {
  async getAll(): Promise<Record<string, string>> {
    const remote = await settingsRepository.getAll()
    return { ...DEFAULT_SETTINGS, ...remote }
  },

  async get(key: string): Promise<string | undefined> {
    const all = await this.getAll()
    return all[key]
  },

  async update(settings: Partial<Record<string, string>>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        await settingsRepository.update(key, String(value))
      }
    }
    dbEvents.emit('settings:changed')
  },

  async initialize(): Promise<void> {
    const remote = await settingsRepository.getAll()
    if (Object.keys(remote).length === 0) {
      await this.update(DEFAULT_SETTINGS)
    }
  }
}
