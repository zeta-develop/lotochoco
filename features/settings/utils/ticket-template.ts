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
   Apuesta       Monto    Premio
--------------------------------
{{#items}}
  {{number}}    {{amount}}   {{prize}}
{{/items}}
--------------------------------
**TOTAL: {{currency}} {{total}}**
--------------------------------
[QR]
Premio valido por 7 dias
Valido para 1 sorteo
Por favor revise su ticket`

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

export interface TextSegment {
  text: string
  bold: boolean
}

export function parseMarkdownLine(line: string): TextSegment[] {
  let normalizedLine = line

  // Si el usuario abrió con ** pero no cerró (número impar de **), auto-cerrar al final
  const asteriskMatches = normalizedLine.match(/\*\*/g)
  if (asteriskMatches && asteriskMatches.length % 2 !== 0 && normalizedLine.includes('**')) {
    normalizedLine = normalizedLine + '**'
  }

  const segments: TextSegment[] = []
  const regex = /\*\*(.*?)\*\*/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(normalizedLine)) !== null) {
    if (match.index > lastIdx) {
      const text = normalizedLine.substring(lastIdx, match.index)
      if (text) {
        segments.push({ text, bold: false })
      }
    }
    if (match[1]) {
      segments.push({ text: match[1], bold: true })
    }
    lastIdx = regex.lastIndex
  }

  if (lastIdx < normalizedLine.length) {
    const text = normalizedLine.substring(lastIdx)
    if (text) {
      segments.push({ text, bold: false })
    }
  }

  // Limpiar cualquier asterisco residual suelto
  const cleaned = segments
    .map(s => ({
      text: s.text.replace(/\*\*/g, ''),
      bold: s.bold
    }))
    .filter(s => s.text.length > 0)

  if (cleaned.length === 0) {
    const fallbackText = normalizedLine.replace(/\*\*/g, '')
    return fallbackText ? [{ text: fallbackText, bold: false }] : []
  }

  return cleaned
}

export type TicketBlock =
  | { type: 'header_big'; text: string }
  | { type: 'header_med'; text: string }
  | { type: 'separator' }
  | { type: 'items_header'; col1: string; col2: string; col3: string; rawText?: string; isBold?: boolean }
  | { type: 'item_row'; number: string; amount: string; prize: string; customText?: string; isBold?: boolean }
  | { type: 'total'; text: string; isBold?: boolean }
  | { type: 'bold_text'; text: string; segments?: TextSegment[] }
  | { type: 'text'; text: string; isBold?: boolean; segments?: TextSegment[] }
  | { type: 'qr'; code: string; leadingSpaces?: number }
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
  let itemRowTemplate: string | null = null
  if (itemsMatch) {
    // Quitar únicamente los saltos de línea iniciales y finales, PRESERVANDO los espacios horizontales (sangría)
    const raw = itemsMatch[1].replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '')
    // Si la plantilla tiene las variables pegadas sin separación de columnas (ej. {{number}}{{amount}}{{prize}}),
    // formatear automáticamente con columnas centradas
    if (raw.includes('{{number}}') && raw.includes('{{amount}}') && !raw.includes('  ')) {
      itemRowTemplate = '  {{number}}    {{amount}}   {{prize}}'
    } else {
      itemRowTemplate = raw
    }
  }

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
      // Expandir items respetando exactamente el espaciado que el usuario configure en la plantilla
      for (const item of data.items) {
        let rowText = ''
        if (itemRowTemplate) {
          rowText = itemRowTemplate
            .replace(/{{game}}/g, item.game)
            .replace(/{{number}}/g, item.number)
            .replace(/{{amount}}/g, item.amount)
            .replace(/{{prize}}/g, item.prize)
            .replace(/{{currency}}/g, item.currency)
            .replace(/\*\*/g, '')
            .trimEnd()
        } else {
          rowText = `  ${item.number.padEnd(4)}${item.amount.padEnd(5)}${item.prize}`
        }

        blocks.push({
          type: 'item_row',
          number: item.number,
          amount: item.amount,
          prize: item.prize,
          customText: rowText
        })
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
    if (/(\[QR\]|{{qrCode}})/i.test(trimmed)) {
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0
      blocks.push({ type: 'qr', code: data.ticketNumber, leadingSpaces })
      continue
    }

    // Separador
    if (/^[-=_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'separator' })
      continue
    }

    // Encabezado de columnas de items (preservar los espacios que el usuario configure)
    if (/apuesta/i.test(trimmed) && (/monto/i.test(trimmed) || /premio/i.test(trimmed))) {
      blocks.push({
        type: 'items_header',
        col1: 'Apuesta',
        col2: 'Monto',
        col3: 'Premio',
        rawText: line.replace(/\*\*/g, '').trimEnd(),
        isBold: trimmed.includes('**')
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

    // Total destacado (detecta si el usuario le puso ** o se lo quitó)
    if (/total/i.test(trimmed)) {
      const isBold = trimmed.includes('**')
      const cleanTotal = trimmed.replace(/\*\*/g, '').trim()
      blocks.push({
        type: 'total',
        text: cleanTotal,
        isBold
      })
      continue
    }

    // Línea de texto general (ej: Folio: **{{ticketNumber}}**, Fecha, Puesto, Valido para...)
    // Soporta formato markdown **campo** para negritas parciales o completas
    const segments = parseMarkdownLine(line.trimEnd())
    const cleanText = segments.map(s => s.text).join('').trim()
    if (!cleanText) {
      continue
    }

    const isAllBold = segments.length > 0 && segments.every(s => s.bold)

    blocks.push({
      type: 'text',
      text: cleanText,
      isBold: isAllBold,
      segments
    })
  }

  // Asegurar que el ticket siempre tenga código QR al final para validación/escaneo
  if (!blocks.some(b => b.type === 'qr')) {
    blocks.push({ type: 'qr', code: data.ticketNumber })
  }

  return blocks
}
