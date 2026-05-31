// ESC/POS Printer Service para PT-210 (58mm)
import type { Ticket, TicketItem, CashSession } from '@/lib/types'
import { format } from 'date-fns'
import { formatTime12h } from '@/lib/utils'
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
  
  let receipt = ''
  receipt += COMMANDS.INIT
  
  // Encabezado
  receipt += COMMANDS.ALIGN_CENTER
  receipt += COMMANDS.BOLD_ON
  receipt += COMMANDS.DOUBLE_SIZE
  receipt += (settings.businessName || 'LOTERIA').toUpperCase()
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.NORMAL_SIZE
  receipt += COMMANDS.BOLD_OFF
  receipt += 'RECIBO DE VENTA'
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Info del Ticket
  receipt += COMMANDS.ALIGN_LEFT
  receipt += `TICKET: ${ticket.ticketNumber}${COMMANDS.FEED_LINE}`
  receipt += `FECHA:  ${format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: es })}${COMMANDS.FEED_LINE}`
  receipt += `HORA:   ${format(new Date(ticket.createdAt), "hh:mm:ss a", { locale: es })}${COMMANDS.FEED_LINE}`
  
  if (ticket.client) {
    receipt += `CLIENTE: ${ticket.client.toUpperCase()}${COMMANDS.FEED_LINE}`
  }
  
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Tabla de Jugadas
  receipt += COMMANDS.BOLD_ON
  // JUEGO(10) NUM(4) PREMIO(12) -> total ~26 chars + espacios
  receipt += 'JUEGO      NUM    PREMIO    '
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  for (const item of ticket.items) {
    const gameName = (item.game?.name || 'NICA').substring(0, 10).padEnd(10)
    const number = item.number.padStart(4)
    const multiplier = item.game?.multiplier || 70
    const prize = item.amount * multiplier
    const prizeStr = `${currency}${prize.toFixed(0)}`.padStart(12)
    
    // Fila Principal: Juego, Número y Premio
    receipt += `${gameName} ${number} ${prizeStr}${COMMANDS.FEED_LINE}`
    
    // Fila Secundaria: Hora del sorteo e inversión
    const scheduleInfo = ` SORTEO: ${formatTime12h(item.schedule)}`.padEnd(20)
    const invInfo = `INV: ${currency}${item.amount.toFixed(0)}`.padStart(12)
    receipt += `${scheduleInfo}${invInfo}${COMMANDS.FEED_LINE}`
    receipt += COMMANDS.FEED_LINE // Espacio entre jugadas
  }
  
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Total
  receipt += COMMANDS.ALIGN_RIGHT
  receipt += COMMANDS.BOLD_ON
  receipt += `TOTAL: ${currency}${ticket.totalAmount.toFixed(2)}`
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Pie de página
  receipt += COMMANDS.ALIGN_CENTER
  receipt += settings.ticketMessage || '¡GRACIAS POR SU COMPRA!'
  receipt += COMMANDS.FEED_LINE
  receipt += 'BUENA SUERTE'
  receipt += COMMANDS.FEED_LINE
  receipt += '*** CONSERVE SU TICKET ***'
  receipt += COMMANDS.FEED_LINE
  
  // Espacio para corte manual si no tiene auto-cut
  receipt += COMMANDS.FEED_PAPER
  
  return receipt
}

// Re-exportamos lo necesario para mantener compatibilidad
export const printerService = {
  generateTicketReceipt,
  // ... (otros métodos se mantendrán igual o se actualizarán si es necesario)
}
