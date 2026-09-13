// ESC/POS Printer Service para PT-210 (58mm)
import type { Ticket, TicketItem, CashSession } from '@/lib/types'
import { format } from 'date-fns'
import { formatTime12h, formatDateNumber } from '@/lib/utils'
import { es } from 'date-fns/locale'

// ESC/POS Commands
const ESC = '\x1B'
const GS = '\x1D'

const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  NORMAL_SIZE: `${GS}!\x00`,
  DOUBLE_SIZE: `${GS}!\x11`,
  FEED_LINE: '\x0A',
  FEED_PAPER: `${ESC}d\x04`,
  CUT_PAPER: `${GS}V\x00`,
}

function repeatChar(char: string, count: number): string {
  return char.repeat(count)
}

/**
 * Genera el comando ESC/POS para el ticket de venta optimizado para PT-210
 */
export function generateTicketReceipt(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
  settings: Record<string, string>
): string {
  const lineWidth = 32 // Estándar para 58mm
  const separator = repeatChar('-', lineWidth)
  const currency = settings.currency || 'C$'
  const businessName = (settings.businessName || 'LOTERIA').toUpperCase()
  const vendorName = settings.vendorName || 'Yamileth'
  
  const firstItem = ticket.items?.[0]
  const gameName = firstItem?.game?.name || 'Tica'
  const rawSchedule = (firstItem as any)?.scheduleName || firstItem?.schedule || '7:30 pm'
  let scheduleName = rawSchedule
  try {
    const formattedSch = formatTime12h(rawSchedule)
    if (formattedSch) scheduleName = formattedSch.toLowerCase()
  } catch {
    scheduleName = rawSchedule
  }

  const formattedDate = format(new Date(ticket.createdAt), "dd/MM/yyyy h:mm a", { locale: es }).toLowerCase()
  
  let receipt = ''
  receipt += COMMANDS.INIT
  
  // Encabezado
  receipt += COMMANDS.ALIGN_CENTER
  receipt += COMMANDS.BOLD_ON
  receipt += COMMANDS.DOUBLE_SIZE
  receipt += businessName
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.NORMAL_SIZE
  receipt += COMMANDS.BOLD_OFF
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Metadata (Centrado)
  receipt += 'RECIBO DE VENTA'
  receipt += COMMANDS.FEED_LINE
  receipt += `Folio: ${ticket.ticketNumber}${COMMANDS.FEED_LINE}`
  receipt += `Fecha: ${formattedDate}${COMMANDS.FEED_LINE}`
  receipt += `Juego: ${gameName}${COMMANDS.FEED_LINE}`
  receipt += `Sorteo: ${scheduleName}${COMMANDS.FEED_LINE}`
  if (ticket.client) {
    receipt += `Cliente: ${ticket.client}${COMMANDS.FEED_LINE}`
  }
  receipt += `Vendedor: ${vendorName}${COMMANDS.FEED_LINE}`
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Tabla de Jugadas (32 caracteres de ancho)
  receipt += COMMANDS.ALIGN_LEFT
  receipt += COMMANDS.BOLD_ON
  receipt += 'Apuesta'.padEnd(16) + 'Monto'.padEnd(8) + 'Premio'.padStart(8)
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  for (const item of ticket.items) {
    const number = (item.number.length === 4 ? formatDateNumber(item.number, true) : item.number)
    const multiplier = item.game?.multiplier || 70
    const prize = item.amount * multiplier

    const col1 = number.padEnd(16)
    const col2 = item.amount.toFixed(0).padEnd(8)
    const col3 = prize.toFixed(0).padStart(8)
    receipt += `${col1}${col2}${col3}${COMMANDS.FEED_LINE}`
  }
  
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Total (Centrado)
  const totalStr = ticket.totalAmount % 1 === 0 
    ? ticket.totalAmount.toFixed(0) 
    : ticket.totalAmount.toFixed(2)
  receipt += COMMANDS.ALIGN_CENTER
  receipt += COMMANDS.BOLD_ON
  receipt += `TOTAL: ${currency} ${totalStr}`
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Textos legales (Centrado)
  receipt += 'Valido para 1 sorteo'
  receipt += COMMANDS.FEED_LINE
  receipt += 'Por favor revise su boleto'
  receipt += COMMANDS.FEED_LINE
  receipt += 'Premio valido por 7 dias'
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Espacio para corte manual
  receipt += COMMANDS.FEED_PAPER
  
  return receipt
}

// Re-exportamos lo necesario para mantener compatibilidad
export const printerService = {
  generateTicketReceipt,
  // ... (otros métodos se mantendrán igual o se actualizarán si es necesario)
}
