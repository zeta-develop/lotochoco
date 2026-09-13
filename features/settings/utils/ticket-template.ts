import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h, formatDateNumber } from '@/lib/utils'
import type { Ticket } from '@/lib/types'

export const DEFAULT_TICKET_TEMPLATE = `Folio: {{ticketNumber}}
Fecha: {{date}}
Juego: {{gameName}}
Sorteo: {{scheduleName}}
{{#if client}}Cliente: {{client}}
{{/if}}Puesto: {{terminalName}}
Vendedor: {{vendorName}}
--------------------------------
Apuesta   Monto           Premio
--------------------------------
{{#items}}
{{number}}      {{amount}}             {{prize}}
{{/items}}
--------------------------------
**TOTAL: {{currency}} {{total}}**
Valido para 1 sorteo
Por favor revise su ticket
Premio valido por 7 dias
[QR]`

export const MOCK_PREVIEW_TICKET: Ticket = {
  id: 'preview-ticket-001',
  ticketNumber: '2100305',
  createdAt: new Date(),
  updatedAt: new Date(),
  totalAmount: 30,
  client: 'Anielka',
  status: 'active',
  items: [
    {
      id: 'mock-item-1',
      ticketId: 'preview-ticket-001',
      number: '80',
      amount: 15,
      multiplier: 70,
      gameName: 'Diaria',
      scheduleName: '9:00 pm',
      game: { id: 'g1', name: 'Diaria', multiplier: 70 } as any
    },
    {
      id: 'mock-item-2',
      ticketId: 'preview-ticket-001',
      number: '25',
      amount: 15,
      multiplier: 70,
      gameName: 'Diaria',
      scheduleName: '9:00 pm',
      game: { id: 'g1', name: 'Diaria', multiplier: 70 } as any
    }
  ] as any
}

export function formatTicketDate(dateVal?: string | Date | null): string {
  try {
    const d = dateVal ? new Date(dateVal) : new Date()
    if (isNaN(d.getTime())) return format(new Date(), 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
    return format(d, 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
  } catch {
    return format(new Date(), 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
  }
}

export interface ResolvedTicketData {
  businessName: string
  ticketNumber: string
  date: string
  gameName: string
  scheduleName: string
  terminalName: string
  vendorName: string
  currency: string
  total: string
  client: string
  ticketMessage: string
  receiptType: string
  items: Array<{
    number: string
    amount: string
    prize: string
    game: string
    currency: string
  }>
}

export type TicketLike = {
  id?: string
  ticketNumber?: string
  createdAt?: Date | string
  updatedAt?: Date | string
  totalAmount?: number
  client?: string | null
  status?: string
  isReprint?: boolean
  items?: any[]
}

export function resolveTicketData(
  ticket: TicketLike,
  settings?: Record<string, string>,
  isReprint: boolean = false
): ResolvedTicketData {
  const s = settings || {}
  const items = ticket.items || []
  const firstItem = items[0] as any
  const gameName = firstItem?.gameName || firstItem?.game?.name || 'Diaria'
  const rawSchedule = firstItem?.scheduleName || firstItem?.schedule || '11:00 am'
  let scheduleName = rawSchedule
  try {
    const formatted = formatTime12h(rawSchedule)
    if (formatted) scheduleName = formatted.toLowerCase()
  } catch {
    scheduleName = rawSchedule
  }

  const rawTerminal = s.terminalId || s.terminalName || 'J081'
  const terminalName = rawTerminal.replace(/^=\s*|\s*=$/g, '').trim() || 'J081'
  const vendorName = s.vendorName || 'Yamileth'
  const businessName = s.businessName || 'LOTERIA'
  const currency = s.currency || 'C$'
  const ticketNumber = ticket.ticketNumber || 'PREVIEW'
  const date = formatTicketDate(ticket.createdAt)
  const client = ticket.client ? ticket.client.trim() : ''
  const ticketMessage = s.ticketMessage || ''

  const totalNum = Number(ticket.totalAmount ?? 0)
  const total = totalNum % 1 === 0 ? totalNum.toFixed(0) : totalNum.toFixed(2)

  const resolvedItems = items.map((item) => {
    const mult = Number((item as any).multiplier || (item as any).game?.multiplier || 70)
    const amt = Number(item.amount || 0)
    const prize = amt * mult
    const numStr = item.number ? (item.number.length === 4 ? formatDateNumber(item.number, true) : item.number) : '00'
    const amtStr = amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(2)
    const prizeStr = prize % 1 === 0 ? prize.toFixed(0) : prize.toFixed(2)
    const itemGame = (item as any).gameName || (item as any).game?.name || gameName
    return {
      number: numStr,
      amount: amtStr,
      prize: prizeStr,
      game: itemGame,
      currency
    }
  })

  return {
    businessName,
    ticketNumber,
    date,
    gameName,
    scheduleName,
    terminalName,
    vendorName,
    currency,
    total,
    client,
    ticketMessage,
    receiptType: isReprint || (ticket as any).isReprint ? '*** COPIA REIMPRESA ***' : '',
    items: resolvedItems
  }
}

export type TicketBlock =
  | { type: 'header_big'; text: string }
  | { type: 'header_med'; text: string }
  | { type: 'separator' }
  | { type: 'items_header'; col1: string; col2: string; col3: string }
  | { type: 'item_row'; number: string; amount: string; prize: string; customText?: string }
  | { type: 'total'; text: string }
  | { type: 'bold_text'; text: string }
  | { type: 'text'; text: string }
  | { type: 'qr'; code: string }
  | { type: 'empty' }

export function parseTemplateToBlocks(
  rawTemplate: string | undefined | null,
  ticket: TicketLike,
  settings?: Record<string, string>,
  isReprint: boolean = false
): TicketBlock[] {
  const template = (rawTemplate && rawTemplate.trim()) ? rawTemplate : DEFAULT_TICKET_TEMPLATE
  const data = resolveTicketData(ticket, settings, isReprint)

  // 1. Limpiar asteriscos accidentales pegados al bloque de items
  let processed = template
    .replace(/\*\*{{#items}}/gi, '{{#items}}')
    .replace(/{{\/items}}\*\*/gi, '{{/items}}')
    .replace(/{{#if client}}([\s\S]*?){{\/if}}/gi, (_, content) => {
      if (data.client) {
        return content.replace(/{{client}}/gi, data.client)
      }
      return ''
    })

  // 2. Extraer bloque de items si existe: {{#items}}...{{/items}}
  const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/i
  const itemsMatch = processed.match(itemsRegex)
  const itemRowTemplate = itemsMatch ? itemsMatch[1].trim() : null

  // Marcador temporal para la posición de los items
  const ITEMS_PLACEHOLDER = '___ITEMS_BLOCK_PLACEHOLDER___'
  if (itemsMatch) {
    processed = processed.replace(itemsRegex, `\n${ITEMS_PLACEHOLDER}\n`)
  }

  // 3. Reemplazar variables globales
  processed = processed
    .replace(/{{businessName}}/g, data.businessName)
    .replace(/{{ticketNumber}}/g, data.ticketNumber)
    .replace(/{{date}}/g, data.date)
    .replace(/{{gameName}}/g, data.gameName)
    .replace(/{{scheduleName}}/g, data.scheduleName)
    .replace(/{{terminalName}}/g, data.terminalName)
    .replace(/{{vendorName}}/g, data.vendorName)
    .replace(/{{currency}}/g, data.currency)
    .replace(/{{total}}/g, data.total)
    .replace(/{{ticketMessage}}/g, data.ticketMessage)
    .replace(/{{receiptType}}/g, data.receiptType)
    .replace(/{{client}}/g, data.client)

  // 4. Dividir en líneas y procesar cada bloque
  const lines = processed.split(/\r?\n/)
  const blocks: TicketBlock[] = []

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.trim() === ITEMS_PLACEHOLDER) {
      // Expandir items
      for (const item of data.items) {
        if (!itemRowTemplate || (itemRowTemplate.includes('{{number}}') && itemRowTemplate.includes('{{amount}}'))) {
          // Formato estándar con columnas bien alineadas
          blocks.push({
            type: 'item_row',
            number: item.number,
            amount: item.amount,
            prize: item.prize
          })
        } else {
          // Formato personalizado por el usuario
          const custom = itemRowTemplate
            .replace(/{{game}}/g, item.game)
            .replace(/{{number}}/g, item.number)
            .replace(/{{amount}}/g, item.amount)
            .replace(/{{prize}}/g, item.prize)
            .replace(/{{currency}}/g, item.currency)
            .replace(/\*\*/g, '')
          blocks.push({
            type: 'item_row',
            number: item.number,
            amount: item.amount,
            prize: item.prize,
            customText: custom
          })
        }
      }
      continue
    }

    const trimmed = line.trim()

    if (!trimmed) {
      blocks.push({ type: 'empty' })
      continue
    }

    // Si la línea contiene solo asteriscos sueltos (* o **), descartarla por completo
    if (/^\*+$/.test(trimmed)) {
      if (trimmed.length >= 3) {
        blocks.push({ type: 'separator' })
      }
      continue
    }

    // QR Code
    if (/^(\[QR\]|{{qrCode}})$/i.test(trimmed)) {
      blocks.push({ type: 'qr', code: data.ticketNumber })
      continue
    }

    // Separador
    if (/^[-=_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'separator' })
      continue
    }

    // Encabezado de columnas de items
    if (/apuesta/i.test(trimmed) && (/monto/i.test(trimmed) || /premio/i.test(trimmed))) {
      blocks.push({
        type: 'items_header',
        col1: 'Apuesta',
        col2: 'Monto',
        col3: 'Premio'
      })
      continue
    }

    // # Título Grande
    if (trimmed.startsWith('# ')) {
      blocks.push({
        type: 'header_big',
        text: trimmed.substring(2).replace(/\*\*/g, '').trim()
      })
      continue
    }

    // ## Título Mediano
    if (trimmed.startsWith('## ')) {
      blocks.push({
        type: 'header_med',
        text: trimmed.substring(3).replace(/\*\*/g, '').trim()
      })
      continue
    }

    // Total destacado
    if (/total/i.test(trimmed) && (/\*\*/.test(trimmed) || /^total/i.test(trimmed))) {
      const cleanTotal = trimmed.replace(/\*\*/g, '').trim()
      blocks.push({
        type: 'total',
        text: cleanTotal
      })
      continue
    }

    // Texto en Negrita completa (**Texto**)
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      const cleanBold = trimmed.slice(2, -2).replace(/\*\*/g, '').trim()
      if (cleanBold) {
        blocks.push({
          type: 'bold_text',
          text: cleanBold
        })
      }
      continue
    }

    // Línea que empieza con ** sin cerrar (ej: "**Premio valido por 7 dias")
    if (trimmed.startsWith('**')) {
      const cleanBold = trimmed.replace(/\*\*/g, '').trim()
      if (cleanBold) {
        blocks.push({
          type: 'bold_text',
          text: cleanBold
        })
      }
      continue
    }

    // Línea de texto general (ej: Folio, Fecha, Puesto, Valido para...)
    // Limpiar asteriscos markdown internos o accidentales
    const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*\*/g, '').trim()
    if (!cleanText) {
      continue
    }

    blocks.push({
      type: 'text',
      text: cleanText
    })
  }

  // Asegurar que el ticket siempre tenga código QR al final para validación/escaneo
  if (!blocks.some(b => b.type === 'qr')) {
    blocks.push({ type: 'qr', code: data.ticketNumber })
  }

  return blocks
}
