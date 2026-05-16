// ESC/POS Printer Service
// Supports network (TCP/IP) and generates commands for thermal printers

import type { Ticket, TicketItem, CashSession } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ESC/POS Commands
const ESC = '\x1B'
const GS = '\x1D'

const COMMANDS = {
  // Initialize printer
  INIT: `${ESC}@`,
  
  // Text alignment
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  
  // Text formatting
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT_ON: `${GS}!\x11`,
  DOUBLE_WIDTH_ON: `${GS}!\x20`,
  DOUBLE_SIZE_ON: `${GS}!\x30`,
  NORMAL_SIZE: `${GS}!\x00`,
  UNDERLINE_ON: `${ESC}-\x01`,
  UNDERLINE_OFF: `${ESC}-\x00`,
  
  // Paper
  FEED_LINE: '\x0A',
  FEED_PAPER: `${ESC}d\x04`,
  CUT_PAPER: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  
  // Barcode
  BARCODE_HEIGHT: `${GS}h\x50`,
  BARCODE_WIDTH: `${GS}w\x02`,
  BARCODE_TEXT_BELOW: `${GS}H\x02`,
  BARCODE_CODE128: `${GS}k\x49`,
}

function repeatChar(char: string, count: number): string {
  return char.repeat(count)
}

export function generateTicketReceipt(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string } })[] },
  settings: Record<string, string>
): string {
  const lineWidth = 32
  const separator = repeatChar('-', lineWidth)
  const doubleSeparator = repeatChar('=', lineWidth)
  
  let receipt = ''
  
  // Initialize
  receipt += COMMANDS.INIT
  
  // Header - Business name
  receipt += COMMANDS.ALIGN_CENTER
  receipt += COMMANDS.DOUBLE_SIZE_ON
  receipt += settings.businessName || 'LOTERÍA'
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.NORMAL_SIZE
  
  // Date and ticket number
  receipt += format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.BOLD_ON
  receipt += `Ticket: ${ticket.ticketNumber}`
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Items header
  receipt += COMMANDS.ALIGN_LEFT
  receipt += COMMANDS.BOLD_ON
  receipt += 'JUEGO      NUM  HOR   MONTO'
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Items
  for (const item of ticket.items) {
    const gameName = (item.game?.name || 'N/A').substring(0, 10).padEnd(10)
    const number = item.number.padStart(3)
    const schedule = item.schedule.substring(0, 5)
    const amount = `${settings.currency || 'C$'}${item.amount.toFixed(0)}`.padStart(7)
    
    receipt += `${gameName} ${number}  ${schedule} ${amount}`
    receipt += COMMANDS.FEED_LINE
  }
  
  // Total
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.ALIGN_RIGHT
  receipt += COMMANDS.DOUBLE_HEIGHT_ON
  receipt += COMMANDS.BOLD_ON
  receipt += `TOTAL: ${settings.currency || 'C$'}${ticket.totalAmount.toFixed(2)}`
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.NORMAL_SIZE
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Footer message
  receipt += COMMANDS.ALIGN_CENTER
  receipt += doubleSeparator
  receipt += COMMANDS.FEED_LINE
  receipt += settings.ticketMessage || '¡Buena suerte!'
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Barcode with ticket number
  receipt += COMMANDS.BARCODE_HEIGHT
  receipt += COMMANDS.BARCODE_WIDTH
  receipt += COMMANDS.BARCODE_TEXT_BELOW
  receipt += COMMANDS.BARCODE_CODE128
  receipt += String.fromCharCode(ticket.ticketNumber.length)
  receipt += ticket.ticketNumber
  receipt += COMMANDS.FEED_LINE
  
  // Cut paper
  receipt += COMMANDS.FEED_PAPER
  receipt += COMMANDS.PARTIAL_CUT
  
  return receipt
}

export function generateCashCloseReceipt(
  session: CashSession,
  settings: Record<string, string>
): string {
  const lineWidth = 32
  const separator = repeatChar('-', lineWidth)
  const doubleSeparator = repeatChar('=', lineWidth)
  const currency = settings.currency || 'C$'
  
  let receipt = ''
  
  // Initialize
  receipt += COMMANDS.INIT
  
  // Header
  receipt += COMMANDS.ALIGN_CENTER
  receipt += COMMANDS.DOUBLE_SIZE_ON
  receipt += 'CIERRE DE CAJA'
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.NORMAL_SIZE
  receipt += settings.businessName || 'LOTERÍA'
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Date range
  receipt += COMMANDS.ALIGN_LEFT
  receipt += `Apertura: ${format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}`
  receipt += COMMANDS.FEED_LINE
  if (session.closedAt) {
    receipt += `Cierre: ${format(new Date(session.closedAt), "dd/MM/yyyy HH:mm", { locale: es })}`
    receipt += COMMANDS.FEED_LINE
  }
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Summary
  const formatLine = (label: string, amount: number, bold = false) => {
    const amountStr = `${currency}${amount.toFixed(2)}`
    const padding = lineWidth - label.length - amountStr.length
    return `${bold ? COMMANDS.BOLD_ON : ''}${label}${repeatChar(' ', Math.max(1, padding))}${amountStr}${bold ? COMMANDS.BOLD_OFF : ''}${COMMANDS.FEED_LINE}`
  }
  
  receipt += formatLine('Monto Inicial:', session.openingAmount)
  receipt += formatLine('Ventas:', session.salesTotal)
  receipt += formatLine('Premios Pagados:', session.prizesTotal)
  
  // Extra movements
  const incomeTotal = session.movements
    ?.filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0) || 0
  
  const expenseTotal = session.movements
    ?.filter(m => m.type === 'expense' && m.amount > 0)
    .reduce((sum, m) => sum + m.amount, 0) || 0
  
  if (incomeTotal > 0) {
    receipt += formatLine('Entradas:', incomeTotal)
  }
  if (expenseTotal > 0) {
    receipt += formatLine('Salidas:', expenseTotal)
  }
  
  receipt += doubleSeparator
  receipt += COMMANDS.FEED_LINE
  
  // Final balance
  const balance = session.openingAmount + session.salesTotal - session.prizesTotal + incomeTotal - expenseTotal
  receipt += COMMANDS.DOUBLE_HEIGHT_ON
  receipt += formatLine('BALANCE FINAL:', balance, true)
  receipt += COMMANDS.NORMAL_SIZE
  
  // Profit
  const profit = session.salesTotal - session.prizesTotal
  receipt += COMMANDS.FEED_LINE
  receipt += formatLine('Ganancia Neta:', profit, true)
  
  // Notes
  if (session.notes) {
    receipt += COMMANDS.FEED_LINE
    receipt += separator
    receipt += COMMANDS.FEED_LINE
    receipt += 'Notas:'
    receipt += COMMANDS.FEED_LINE
    receipt += session.notes
    receipt += COMMANDS.FEED_LINE
  }
  
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Signature line
  receipt += COMMANDS.ALIGN_CENTER
  receipt += repeatChar('_', 20)
  receipt += COMMANDS.FEED_LINE
  receipt += 'Firma'
  receipt += COMMANDS.FEED_LINE
  
  // Cut paper
  receipt += COMMANDS.FEED_PAPER
  receipt += COMMANDS.PARTIAL_CUT
  
  return receipt
}

// Network printer interface (for browser use, this would need a backend proxy)
export async function printToNetwork(
  printerAddress: string,
  data: string
): Promise<{ success: boolean; message: string }> {
  try {
    // In a real implementation, this would send to a local print server
    // or use WebSocket/HTTP to a print proxy service
    const response = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: printerAddress,
        data: data
      })
    })
    
    if (!response.ok) {
      throw new Error('Error al imprimir')
    }
    
    return { success: true, message: 'Impresión enviada' }
  } catch (error) {
    console.error('Print error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

// Generate printable HTML for browser printing
export function generatePrintableHTML(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string } })[] },
  settings: Record<string, string>
): string {
  const currency = settings.currency || 'C$'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { 
          size: 80mm auto; 
          margin: 0; 
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          margin: 0;
          padding: 5mm;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .large { font-size: 16px; }
        .separator { border-top: 1px dashed #000; margin: 5px 0; }
        .double-separator { border-top: 2px solid #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .total { font-size: 14px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="center large bold">${settings.businessName || 'LOTERÍA'}</div>
      <div class="center">${format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</div>
      <div class="center bold">Ticket: ${ticket.ticketNumber}</div>
      <div class="separator"></div>
      
      <table>
        <thead>
          <tr class="bold">
            <td>Juego</td>
            <td>Núm</td>
            <td>Hora</td>
            <td class="right">Monto</td>
          </tr>
        </thead>
        <tbody>
          ${ticket.items.map(item => `
            <tr>
              <td>${item.game?.name || 'N/A'}</td>
              <td>${item.number}</td>
              <td>${item.schedule}</td>
              <td class="right">${currency}${item.amount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="separator"></div>
      <div class="right total">TOTAL: ${currency}${ticket.totalAmount.toFixed(2)}</div>
      <div class="double-separator"></div>
      <div class="center">${settings.ticketMessage || '¡Buena suerte!'}</div>
    </body>
    </html>
  `
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function generateTicketImageUrl(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string } })[] },
  settings: Record<string, string>
): string {
  const width = 420
  const baseHeight = 260
  const itemHeight = 42
  const height = baseHeight + ticket.items.length * itemHeight
  const currency = settings.currency || 'C$'
  const businessName = escapeXml(settings.businessName || 'LOTERÍA')
  const ticketMessage = escapeXml(settings.ticketMessage || '¡Buena suerte!')
  const createdAt = escapeXml(format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }))

  const itemRows = ticket.items
    .map((item, index) => {
      const y = 190 + index * itemHeight
      const gameName = escapeXml((item.game?.name || 'Juego').slice(0, 18))
      const number = escapeXml(item.number)
      const schedule = escapeXml(item.schedule.slice(0, 8))
      const amount = escapeXml(`${currency}${item.amount.toFixed(2)}`)

      return `
        <g>
          <text x="28" y="${y}" font-size="15" font-weight="700" fill="#111827">${gameName}</text>
          <text x="190" y="${y}" font-size="15" font-weight="700" fill="#111827">${number}</text>
          <text x="250" y="${y}" font-size="13" fill="#4b5563">${schedule}</text>
          <text x="380" y="${y}" font-size="15" font-weight="700" fill="#111827" text-anchor="end">${amount}</text>
          <line x1="24" y1="${y + 12}" x2="396" y2="${y + 12}" stroke="#e5e7eb" stroke-width="1" />
        </g>
      `
    })
    .join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <rect x="12" y="12" width="396" height="${height - 24}" rx="18" fill="#ffffff" stroke="#111827" stroke-width="1.5" />
      <text x="210" y="52" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#111827">${businessName}</text>
      <text x="210" y="76" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#6b7280">Ticket de Loteria</text>
      <line x1="28" y1="95" x2="392" y2="95" stroke="#111827" stroke-dasharray="6 5" stroke-width="1" />
      <text x="28" y="122" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#374151">Ticket:</text>
      <text x="390" y="122" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#111827">${escapeXml(ticket.ticketNumber)}</text>
      <text x="28" y="146" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#374151">Fecha:</text>
      <text x="390" y="146" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#111827">${createdAt}</text>
      <line x1="28" y1="160" x2="392" y2="160" stroke="#111827" stroke-dasharray="6 5" stroke-width="1" />
      <text x="28" y="184" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#6b7280">JUEGO</text>
      <text x="190" y="184" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#6b7280">NUM</text>
      <text x="250" y="184" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#6b7280">HOR</text>
      <text x="380" y="184" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#6b7280">MONTO</text>
      ${itemRows}
      <line x1="28" y1="${height - 78}" x2="392" y2="${height - 78}" stroke="#111827" stroke-dasharray="6 5" stroke-width="1.2" />
      <text x="28" y="${height - 48}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#111827">TOTAL:</text>
      <text x="390" y="${height - 48}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#111827">${escapeXml(`${currency}${ticket.totalAmount.toFixed(2)}`)}</text>
      <text x="210" y="${height - 22}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#6b7280">${ticketMessage}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function generateTestPage(): string {
  return `${COMMANDS.INIT}${COMMANDS.ALIGN_CENTER}PRUEBA DE IMPRESION${COMMANDS.FEED_LINE}${COMMANDS.FEED_LINE}${COMMANDS.CUT_PAPER}`
}

export const printerService = {
  generateTicketCommands: generateTicketReceipt,
  generateCashCloseCommands: generateCashCloseReceipt,
  generateTestPage,
  generatePrintableHTML,
  printToNetwork,
  async printTicket(ticket: Ticket & { items: (TicketItem & { game?: { name: string } })[] }, settings: Record<string,string>) {
    try {
      const type = settings.printerType || 'browser'

      // Native print dialog (cordova-plugin-printer)
      if (type === 'native' && typeof window !== 'undefined' && (window as any).cordova?.plugins?.printer) {
        const html = generatePrintableHTML(ticket, settings)
        return new Promise<{success:boolean;message:string}>((resolve) => {
          ;(window as any).cordova.plugins.printer.print(html, { name: `Ticket ${ticket.ticketNumber}` }, () => resolve({ success: true, message: 'Impresión nativa enviada' }), (err: any) => resolve({ success: false, message: err?.message || String(err) }))
        })
      }

      // Thermal / raw plugin (if available)
      if ((type === 'thermal' || type === 'raw') && typeof window !== 'undefined' && (window as any).thermalprinter) {
        const commands = generateTicketReceipt(ticket, settings)
        try {
          await (window as any).thermalprinter.send(commands)
          return { success: true, message: 'Enviado a impresora térmica' }
        } catch (err) {
          return { success: false, message: String(err) }
        }
      }

      // Network printer
      if (type === 'network') {
        const commands = generateTicketReceipt(ticket, settings)
        return await printToNetwork(settings.printerAddress || '', commands)
      }

      // Fallback: browser printing
      const html = generatePrintableHTML(ticket, settings)
      // dynamically import to avoid cycles
      const { printHtmlDocument } = await import('@/lib/print')
      printHtmlDocument(html)
      return { success: true, message: 'Impresión por navegador iniciada' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  },
  async printClose(session: CashSession, settings: Record<string,string>) {
    try {
      const type = settings.printerType || 'browser'
      // Thermal/raw not typical for close; prefer network/native/browser
      if (type === 'native' && typeof window !== 'undefined' && (window as any).cordova?.plugins?.printer) {
        const html = generatePrintableHTML(session as any, settings)
        return new Promise<{success:boolean;message:string}>((resolve) => {
          ;(window as any).cordova.plugins.printer.print(html, { name: `Cierre de Caja ${session.id || ''}` }, () => resolve({ success: true, message: 'Impresión nativa enviada' }), (err: any) => resolve({ success: false, message: err?.message || String(err) }))
        })
      }

      if (type === 'network') {
        const commands = generateCashCloseReceipt(session, settings)
        return await printToNetwork(settings.printerAddress || '', commands)
      }

      const html = generatePrintableHTML(session as any, settings)
      const { printHtmlDocument } = await import('@/lib/print')
      printHtmlDocument(html)
      return { success: true, message: 'Impresión por navegador iniciada' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }
}
