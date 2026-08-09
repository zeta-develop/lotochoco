import type { Ticket, TicketItem } from '@/lib/types'
import { formatTime12h, formatDateNumber } from '@/lib/utils'

export interface TicketTemplateContext {
  /** Nombre del vendedor (usuario autenticado o configurado). */
  vendorName?: string
  /** Nombre/puesto del terminal (configurable en ajustes). */
  terminalName?: string
}

export type TemplateTicket = Ticket & {
  items?: (TicketItem & { game?: { name?: string; multiplier?: number } })[]
}

/**
 * Renderiza un template de ticket/factura con el formato de variables
 * usado por LotoChoco:
 *
 *   # {{businessName}}            → encabezado centrado
 *   **Texto**                     → negrita
 *   {{#if client}}...{{/if}}      → bloque condicional
 *   {{#items}}...{{/items}}       → repite por cada jugada
 *
 * Variables disponibles:
 *   businessName, ticketNumber, date, gameName, scheduleName,
 *   client, vendorName, terminalName, currency, total, ticketMessage
 *   y dentro de {{#items}}: game, number, amount, prize, currency
 */
export function renderTicketTemplate(
  template: string,
  ticket: TemplateTicket,
  settings: Record<string, string>,
  context: TicketTemplateContext = {}
): string {
  const currency = settings.currency || 'C$'
  const items = ticket.items || []

  const firstItem = items[0] as any
  const gameName = firstItem?.gameName || firstItem?.game?.name || 'Diaria'
  const scheduleSource = firstItem?.scheduleName || firstItem?.schedule || 'Sorteo'
  const scheduleName = scheduleSource === 'Sorteo' ? scheduleSource : formatTime12h(scheduleSource)

  let rendered = template
    .replace(/{{businessName}}/g, settings.businessName || 'LOTOCHOCO')
    .replace(/{{ticketNumber}}/g, ticket.ticketNumber || 'N/A')
    .replace(/{{date}}/g, new Date(ticket.createdAt).toLocaleString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }))
    .replace(/{{gameName}}/g, gameName)
    .replace(/{{scheduleName}}/g, scheduleName)
    .replace(/{{client}}/g, ticket.client ? ticket.client.toUpperCase() : '')
    .replace(/{{vendorName}}/g, context.vendorName || settings.vendorName || '')
    .replace(/{{terminalName}}/g, context.terminalName || settings.terminalName || '')
    .replace(/{{currency}}/g, currency)
    .replace(/{{total}}/g, (ticket.totalAmount || 0).toFixed(2))
    .replace(/{{ticketMessage}}/g, settings.ticketMessage || '')

  // Bloque condicional: cliente
  rendered = rendered.replace(
    /{{#if client}}([\s\S]*?){{\/if}}/g,
    ticket.client ? `$1`.replace(/{{client}}/g, ticket.client.toUpperCase()) : ''
  )

  // Bloque repetible: jugadas
  const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/g
  rendered = rendered.replace(itemsRegex, (match, content: string) => {
    return items
      .map((item) => {
        const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
        const prize = item.amount * multiplier
        return content
          .replace(/{{game}}/g, (item as any).game?.name || (item as any).gameName || 'JUEGO')
          .replace(/{{number}}/g, item.number.length === 4 ? formatDateNumber(item.number, true) : item.number)
          .replace(/{{amount}}/g, item.amount.toFixed(0))
          .replace(/{{prize}}/g, prize.toFixed(0))
          .replace(/{{currency}}/g, currency)
      })
      .join('\n')
  })

  return rendered
}
