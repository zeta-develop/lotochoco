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
          size: 58mm auto;
          margin: 0; 
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          width: 58mm;
          margin: 0;
          padding: 2mm;
          color: #000;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .bold { font-weight: bold; }
        .large { font-size: 18px; line-height: 1.2; margin-bottom: 2px; text-transform: uppercase; }
        .separator { border-top: 1px dashed #000; margin: 6px 0; }
        .double-separator { border-top: 2px solid #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        th { font-weight: bold; text-align: left; border-bottom: 1px solid #000; padding-bottom: 3px; }
        th.center { text-align: center; }
        th.right { text-align: right; }
        td { padding: 4px 0; vertical-align: top; }
        td.number { font-weight: bold; font-size: 14px; text-align: center; }
        .game-name { max-width: 25mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .schedule { font-size: 10px; color: #333; }
        .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 5px 0; }
        .barcode-container { display: flex; justify-content: center; height: 35px; margin: 10px 0 2px; }
        .barcode-bar { background-color: #000; height: 100%; }
        .ticket-num-small { font-size: 10px; letter-spacing: 2px; }
        .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
      </style>
    </head>
    <body>
      <div class="center large bold">${settings.businessName || 'LOTERÍA'}</div>
      <div class="center" style="margin-bottom: 6px;">Ticket de Loteria</div>

      <div class="separator"></div>

      <div class="info-row">
        <span>TICKET:</span>
        <span class="bold">#${ticket.ticketNumber}</span>
      </div>
      <div class="info-row">
        <span>FECHA:</span>
        <span>${format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: es })}</span>
      </div>
      <div class="info-row">
        <span>HORA:</span>
        <span>${format(new Date(ticket.createdAt), "HH:mm", { locale: es })}</span>
      </div>

      <div class="separator"></div>
      
      <table>
        <thead>
          <tr>
            <th>JUEGO</th>
            <th class="center">NUM</th>
            <th class="right">MONTO</th>
          </tr>
        </thead>
        <tbody>
          ${ticket.items.map(item => `
            <tr>
              <td>
                <div class="game-name">${item.game?.name || item.gameName || 'Juego'}</div>
                <div class="schedule">${item.schedule || item.scheduleTime || ''}</div>
              </td>
              <td class="number">${item.number}</td>
              <td class="right">${currency}${(item.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="separator"></div>

      <div class="total-row">
        <span>TOTAL:</span>
        <span>${currency}${(ticket.totalAmount || ticket.total || 0).toFixed(2)}</span>
      </div>

      <div class="double-separator"></div>

      <div class="center bold" style="margin-top: 8px;">${settings.ticketMessage || '¡Buena suerte!'}</div>

      <div class="barcode-container">
        ${ticket.ticketNumber.split('').map(char => {
            const width = (char.charCodeAt(0) % 3 === 0) ? "3px" : (char.charCodeAt(0) % 2 === 0) ? "2px" : "1px";
            return `<div class="barcode-bar" style="width: ${width}; margin-right: 1px;"></div>`;
        }).join('')}
      </div>
      <div class="center ticket-num-small">${ticket.ticketNumber}</div>

      <div class="center bold" style="margin-top: 15px; font-size: 11px;">*** CONSERVE SU TICKET ***</div>
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
  ticket: Ticket & { items: (TicketItem & { game?: { name: string }; gameName?: string; scheduleTime?: string })[] },
  settings: Record<string, string>
): string {
  // Thermal paper width equivalent 58mm (scaled to ~380px for high res)
  const width = 380
  const baseHeight = 300
  const itemHeight = 35
  const height = baseHeight + ticket.items.length * itemHeight
  const currency = settings.currency || 'C$'
  const businessName = escapeXml(settings.businessName || 'LOTERÍA')
  const ticketMessage = escapeXml(settings.ticketMessage || '¡Buena suerte!')
  const createdAt = escapeXml(format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }))

  const itemRows = ticket.items
    .map((item, index) => {
      const y = 175 + index * itemHeight
      const gameName = escapeXml((item.game?.name || item.gameName || 'Juego').slice(0, 15))
      const number = escapeXml(item.number)
      const schedule = escapeXml((item.schedule || item.scheduleTime || '').slice(0, 8))
      const amount = escapeXml(`${currency}${(item.amount || 0).toFixed(2)}`)

      return `
        <g font-family="'Courier New', Courier, monospace">
          <text x="20" y="${y}" font-size="14" font-weight="700" fill="#000">${gameName}</text>
          <text x="20" y="${y + 12}" font-size="10" fill="#333">${schedule}</text>
          <text x="200" y="${y}" font-size="16" font-weight="900" fill="#000" text-anchor="middle">${number}</text>
          <text x="360" y="${y}" font-size="14" font-weight="700" fill="#000" text-anchor="end">${amount}</text>
        </g>
      `
    })
    .join('')

  const barcodeBars = ticket.ticketNumber.split('').map((char, index) => {
    const barWidth = (char.charCodeAt(0) % 3 === 0) ? 3 : (char.charCodeAt(0) % 2 === 0) ? 2 : 1;
    // Calculate total width to center it roughly. Assuming avg width is 2.
    // simpler is just generating right to left or starting at an offset.
    // Let's just generate the SVG rects
    // X position offset accumulates
    return barWidth;
  });

  let currentX = (width - barcodeBars.reduce((a,b)=>a+b+1, 0)) / 2;
  const barcodeSvg = barcodeBars.map(w => {
    const rect = `<rect x="${currentX}" y="${height - 90}" width="${w}" height="35" fill="#000" />`;
    currentX += w + 1;
    return rect;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <g font-family="'Courier New', Courier, monospace" fill="#000">
        <!-- Header -->
        <text x="${width/2}" y="40" text-anchor="middle" font-size="24" font-weight="900">${businessName}</text>
        <text x="${width/2}" y="60" text-anchor="middle" font-size="14">Ticket de Loteria</text>

        <line x1="15" y1="75" x2="${width-15}" y2="75" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" />

        <!-- Info -->
        <text x="20" y="95" font-size="14" font-weight="700">TICKET:</text>
        <text x="${width-20}" y="95" text-anchor="end" font-size="14" font-weight="900">#${escapeXml(ticket.ticketNumber)}</text>

        <text x="20" y="115" font-size="14" font-weight="700">FECHA:</text>
        <text x="${width-20}" y="115" text-anchor="end" font-size="14">${createdAt}</text>

        <line x1="15" y1="130" x2="${width-15}" y2="130" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" />

        <!-- Table Header -->
        <text x="20" y="150" font-size="14" font-weight="900">JUEGO</text>
        <text x="200" y="150" font-size="14" font-weight="900" text-anchor="middle">NUM</text>
        <text x="${width-20}" y="150" font-size="14" font-weight="900" text-anchor="end">MONTO</text>

        <line x1="15" y1="158" x2="${width-15}" y2="158" stroke="#000" stroke-width="1" />

        <!-- Items -->
        ${itemRows}

        <line x1="15" y1="${height - 145}" x2="${width-15}" y2="${height - 145}" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" />

        <!-- Total -->
        <text x="20" y="${height - 120}" font-size="18" font-weight="900">TOTAL:</text>
        <text x="${width-20}" y="${height - 120}" text-anchor="end" font-size="20" font-weight="900">${escapeXml(`${currency}${(ticket.totalAmount || ticket.total || 0).toFixed(2)}`)}</text>

        <line x1="15" y1="${height - 105}" x2="${width-15}" y2="${height - 105}" stroke="#000" stroke-width="2" />

        <!-- Barcode and Footer -->
        ${barcodeSvg}
        <text x="${width/2}" y="${height - 40}" text-anchor="middle" font-size="10" letter-spacing="2">${escapeXml(ticket.ticketNumber)}</text>

        <text x="${width/2}" y="${height - 20}" text-anchor="middle" font-size="12" font-weight="700">${ticketMessage}</text>
        <text x="${width/2}" y="${height - 5}" text-anchor="middle" font-size="10">*** CONSERVE SU TICKET ***</text>
      </g>
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
