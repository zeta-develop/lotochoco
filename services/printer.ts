// ESC/POS Printer Service
// Supports network (TCP/IP), Web Bluetooth, and generates commands for thermal printers

import type { Ticket, TicketItem, CashSession } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Capacitor } from '@capacitor/core'
import { BleClient } from '@capacitor-community/bluetooth-le'
import { Dialog } from '@capacitor/dialog'
import { toast } from 'sonner'

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

function calculatePrize(amount: number, multiplier: number): number {
  return amount * multiplier
}

export function generateTicketReceipt(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
  settings: Record<string, string>
): string {
  const lineWidth = 32
  const separator = repeatChar('-', lineWidth)
  const doubleSeparator = repeatChar('=', lineWidth)
  const currency = settings.currency || 'C$'
  
  let receipt = ''
  
  // Initialize
  receipt += COMMANDS.INIT
  
  // Header - Business name
  receipt += COMMANDS.ALIGN_CENTER
  receipt += COMMANDS.BOLD_ON
  receipt += COMMANDS.DOUBLE_WIDTH_ON
  receipt += settings.businessName || 'LOTERIA'
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.NORMAL_SIZE
  receipt += COMMANDS.BOLD_OFF
  
  receipt += 'Ticket de Loteria'
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Ticket info
  receipt += COMMANDS.ALIGN_LEFT
  receipt += `Ticket: #${ticket.ticketNumber}`
  receipt += COMMANDS.FEED_LINE
  receipt += `Fecha: ${format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: es })}`
  receipt += COMMANDS.FEED_LINE
  receipt += `Hora: ${format(new Date(ticket.createdAt), "HH:mm", { locale: es })}`
  receipt += COMMANDS.FEED_LINE
  
  if (ticket.client) {
    receipt += `Cliente: ${ticket.client}`
    receipt += COMMANDS.FEED_LINE
  }
  
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Items header
  receipt += COMMANDS.BOLD_ON
  receipt += 'JUEGO       NUM  PREMIO'
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  
  // Items
  for (const item of ticket.items) {
    const gameName = (item.game?.name || 'N/A').substring(0, 11).padEnd(11)
    const number = item.number.padStart(4)
    const multiplier = item.game?.multiplier || 70
    const prize = calculatePrize(item.amount, multiplier)
    const prizeStr = `${currency}${prize.toFixed(0)}`.padStart(10)
    
    receipt += `${gameName}${number} ${prizeStr}`
    receipt += COMMANDS.FEED_LINE
    
    // Schedule time on next line
    receipt += `            ${item.schedule}`
    receipt += COMMANDS.FEED_LINE
  }
  
  // Total
  receipt += separator
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.ALIGN_RIGHT
  receipt += COMMANDS.BOLD_ON
  receipt += COMMANDS.DOUBLE_HEIGHT_ON
  receipt += `TOTAL: ${currency}${ticket.totalAmount.toFixed(2)}`
  receipt += COMMANDS.NORMAL_SIZE
  receipt += COMMANDS.BOLD_OFF
  receipt += COMMANDS.FEED_LINE
  receipt += COMMANDS.FEED_LINE
  
  // Footer message
  receipt += COMMANDS.ALIGN_CENTER
  receipt += doubleSeparator
  receipt += COMMANDS.FEED_LINE
  receipt += settings.ticketMessage || '!Buena suerte!'
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
  receipt += COMMANDS.FEED_LINE
  
  receipt += '*** CONSERVE SU TICKET ***'
  receipt += COMMANDS.FEED_LINE
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
  receipt += settings.businessName || 'LOTERIA'
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
    
    return { success: true, message: 'Impresion enviada' }
  } catch (error) {
    console.error('Print error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

// Web Bluetooth printing for PT-210 and similar thermal printers
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'

let bluetoothDevice: BluetoothDevice | null = null
let bluetoothCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

export async function scanBluetoothPrinter(): Promise<{ name: string; id: string } | null> {
  // Caso nativo (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      await BleClient.initialize();
      
      // Verificar si el Bluetooth está encendido
      const enabled = await BleClient.isEnabled();
      if (!enabled) {
        await Dialog.alert({
          title: 'Bluetooth Apagado',
          message: 'Por favor, enciende el Bluetooth para buscar impresoras.'
        });
        return null;
      }

      // Escaneo sin filtros es más fiable para encontrar impresoras chinas genéricas
      // Usamos requestDevice sin filtros para que aparezca la lista nativa de Android
      const device = await BleClient.requestDevice({
        // No pasamos services para que muestre TODOS los dispositivos disponibles
      });

      return { name: device.name || 'Impresora Térmica', id: device.deviceId };
    } catch (error) {
      console.error('Error scanning native bluetooth:', error);
      // No mostrar error si el usuario canceló el diálogo
      if (error instanceof Error && error.message.includes('requestDevice')) return null;
      
      toast.error('No se pudo encontrar ningún dispositivo Bluetooth');
      return null;
    }
  }

  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    throw new Error('Web Bluetooth no es compatible con este navegador. Si estás en Android, asegúrate de estar usando el APK.')
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      // En Web es obligatorio usar filtros o acceptAllDevices
      acceptAllDevices: true,
      optionalServices: [PRINTER_SERVICE_UUID]
    })

    return { name: device.name || 'Desconocido', id: device.id }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null
    }
    throw error
  }
}

export async function connectBluetoothPrinter(deviceId: string): Promise<boolean> {
  // Caso nativo
  if (Capacitor.isNativePlatform()) {
    try {
      await BleClient.initialize();
      await BleClient.connect(deviceId);
      return true;
    } catch (error) {
      console.error('Error connecting native bluetooth:', error);
      return false;
    }
  }

  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    return false
  }

  try {
    // Get all devices (we need to request again as we can't get by ID directly)
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [PRINTER_SERVICE_UUID] }],
      optionalServices: [PRINTER_SERVICE_UUID]
    })

    if (device.id !== deviceId) {
      return false
    }

    bluetoothDevice = device

    device.addEventListener('gattserverdisconnected', () => {
      bluetoothDevice = null
      bluetoothCharacteristic = null
    })

    const server = await device.gatt?.connect()
    if (!server) return false

    const service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
    bluetoothCharacteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID)

    return true
  } catch (error) {
    console.error('Bluetooth connection error:', error)
    return false
  }
}

export async function printViaBluetooth(data: string): Promise<{ success: boolean; message: string }> {
  // En nativo, printerService.printTicket ya redirige a printDirect
  // pero esta función podría usarse para cierres de caja.
  if (Capacitor.isNativePlatform()) {
    // Si no tenemos un deviceId aquí, es difícil. Pero usualmente se pasa por printerService.
    return { success: false, message: 'Usa printDirect en plataformas nativas' }
  }

  if (!bluetoothCharacteristic) {
    return { success: false, message: 'Impresora Bluetooth no conectada' }
  }

  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(data)
    
    // Split into chunks (MTU is typically 20-512 bytes)
    const chunkSize = 128
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize)
      await bluetoothCharacteristic.writeValue(chunk)
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return { success: true, message: 'Impresion enviada por Bluetooth' }
  } catch (error) {
    console.error('Bluetooth print error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error al imprimir por Bluetooth' 
    }
  }
}

export async function disconnectBluetoothPrinter(): Promise<void> {
  if (bluetoothDevice && bluetoothDevice.gatt?.connected) {
    bluetoothDevice.gatt.disconnect()
  }
  bluetoothDevice = null
  bluetoothCharacteristic = null
}

// Generate printable HTML for browser printing
export function generatePrintableHTML(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
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
          font-size: 11px;
          width: 58mm;
          margin: 0;
          padding: 3mm 2mm;
          color: #000;
          line-height: 1.3;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .bold { font-weight: bold; }
        .header { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .separator { border-top: 1px dashed #000; margin: 4px 0; }
        .double-separator { border-top: 2px solid #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        th { font-weight: bold; text-align: left; border-bottom: 1px solid #000; padding: 2px 0; font-size: 10px; }
        th.center { text-align: center; }
        th.right { text-align: right; }
        td { padding: 3px 0; vertical-align: top; font-size: 11px; }
        td.number { font-weight: bold; font-size: 13px; text-align: center; }
        td.prize { font-weight: bold; text-align: right; }
        td.schedule { font-size: 9px; color: #555; padding-top: 0; }
        .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 6px 0; }
        .info-row { display: flex; justify-content: space-between; font-size: 11px; margin: 1px 0; }
        .barcode-container { display: flex; justify-content: center; height: 30px; margin: 8px 0 2px; }
        .barcode-bar { background-color: #000; height: 100%; }
        .ticket-num-small { font-size: 9px; letter-spacing: 1px; }
        .footer-msg { font-size: 10px; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="center header">${settings.businessName || 'LOTERIA'}</div>
      <div class="center" style="font-size: 11px; margin-bottom: 4px;">Ticket de Loteria</div>

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
      ${ticket.client ? `
      <div class="info-row">
        <span>CLIENTE:</span>
        <span>${ticket.client}</span>
      </div>
      ` : ''}

      <div class="separator"></div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">JUEGO</th>
            <th class="center" style="width: 15%;">NUM</th>
            <th class="right" style="width: 25%;">MONTO</th>
            <th class="right" style="width: 30%;">PREMIO</th>
          </tr>
        </thead>
        <tbody>
          ${ticket.items.map(item => {
            const multiplier = item.game?.multiplier || 70
            const prize = item.amount * multiplier
            return `
            <tr>
              <td>
                <div>${item.game?.name || 'Juego'}</div>
                <div class="schedule">${item.schedule || ''}</div>
              </td>
              <td class="number">${item.number}</td>
              <td class="right">${currency}${item.amount.toFixed(0)}</td>
              <td class="prize">${currency}${prize.toFixed(0)}</td>
            </tr>
            `
          }).join('')}
        </tbody>
      </table>
      
      <div class="separator"></div>

      <div class="total-row">
        <span>TOTAL:</span>
        <span>${currency}${ticket.totalAmount.toFixed(2)}</span>
      </div>

      <div class="double-separator"></div>

      <div class="center bold footer-msg">${settings.ticketMessage || '!Buena suerte!'}</div>

      <div class="barcode-container">
        ${ticket.ticketNumber.split('').map(char => {
            const width = (char.charCodeAt(0) % 3 === 0) ? "3px" : (char.charCodeAt(0) % 2 === 0) ? "2px" : "1px";
            return `<div class="barcode-bar" style="width: ${width}; margin-right: 1px;"></div>`;
        }).join('')}
      </div>
      <div class="center ticket-num-small">${ticket.ticketNumber}</div>

      <div class="center bold" style="margin-top: 10px; font-size: 10px;">*** CONSERVE SU TICKET ***</div>
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


// Helper to convert Uint8Array (ESC/POS commands) to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function generateTicketImageUrl(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string }; gameName?: string; scheduleTime?: string; multiplier?: number })[] },
  settings: Record<string, string>
): string {
  // 384px es el estandar para impresoras termicas de 58mm (48mm efectivos)
  const width = 384
  const baseHeight = 340
  const itemHeight = 45
  const height = baseHeight + ticket.items.length * itemHeight
  const currency = settings.currency || 'C$'
  const businessName = escapeXml(settings.businessName || 'LOTERIA')
  const ticketMessage = escapeXml(settings.ticketMessage || '!Buena suerte!')
  const createdAt = escapeXml(format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }))

  const itemRows = ticket.items
    .map((item, index) => {
      const y = 200 + index * itemHeight
      const gameName = escapeXml((item.game?.name || (item as any).gameName || 'Juego').slice(0, 14))
      const number = escapeXml(item.number)
      const schedule = escapeXml((item.schedule || (item as any).scheduleTime || '').slice(0, 8))
      const multiplier = item.game?.multiplier || (item as any).multiplier || 70
      const prize = (item.amount || 0) * multiplier
      const amount = escapeXml(`${currency}${(item.amount || 0).toFixed(0)}`)
      const prizeStr = escapeXml(`${currency}${prize.toFixed(0)}`)

      return `
        <g font-family="'Courier New', Courier, monospace">
          <text x="15" y="${y}" font-size="14" font-weight="700" fill="#000">${gameName}</text>
          <text x="15" y="${y + 14}" font-size="10" fill="#555">${schedule}</text>
          <text x="140" y="${y}" font-size="15" font-weight="900" fill="#000" text-anchor="middle">${number}</text>
          <text x="210" y="${y}" font-size="14" font-weight="700" fill="#000" text-anchor="middle">${amount}</text>
          <text x="${width - 15}" y="${y}" font-size="14" font-weight="700" fill="#000" text-anchor="end">${prizeStr}</text>
        </g>
      `
    })
    .join('')

  const barcodeBars = ticket.ticketNumber.split('').map((char, index) => {
    const barWidth = (char.charCodeAt(0) % 3 === 0) ? 3 : (char.charCodeAt(0) % 2 === 0) ? 2 : 1;
    return barWidth;
  });

  let currentX = (width - barcodeBars.reduce((a,b)=>a+b+1, 0)) / 2;
  const barcodeSvg = barcodeBars.map(w => {
    const rect = `<rect x="${currentX}" y="${height - 90}" width="${w}" height="35" fill="#000" />`;
    currentX += w + 1;
    return rect;
  }).join('');

  const clientInfo = ticket.client ? `
    <text x="20" y="140" font-size="13" font-weight="700">CLIENTE:</text>
    <text x="${width-20}" y="140" text-anchor="end" font-size="13">${escapeXml(ticket.client)}</text>
  ` : ''

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <g font-family="'Courier New', Courier, monospace" fill="#000">
        <!-- Header -->
        <text x="${width/2}" y="40" text-anchor="middle" font-size="24" font-weight="900">${businessName}</text>
        <text x="${width/2}" y="62" text-anchor="middle" font-size="13">Ticket de Loteria</text>

        <line x1="15" y1="75" x2="${width-15}" y2="75" stroke="#000" stroke-dasharray="6 4" stroke-width="1.5" />

        <!-- Info -->
        <text x="20" y="95" font-size="13" font-weight="700">TICKET:</text>
        <text x="${width-20}" y="95" text-anchor="end" font-size="13" font-weight="900">#${escapeXml(ticket.ticketNumber)}</text>

        <text x="20" y="115" font-size="13" font-weight="700">FECHA:</text>
        <text x="${width-20}" y="115" text-anchor="end" font-size="13">${createdAt}</text>

        ${clientInfo}

        <line x1="15" y1="155" x2="${width-15}" y2="155" stroke="#000" stroke-dasharray="6 4" stroke-width="1.5" />

        <!-- Table Header -->
        <text x="15" y="175" font-size="13" font-weight="900">JUEGO</text>
        <text x="170" y="175" font-size="13" font-weight="900" text-anchor="middle">NUM</text>
        <text x="${width-15}" y="175" font-size="13" font-weight="900" text-anchor="end">PREMIO</text>

        <line x1="5" y1="183" x2="${width-5}" y2="183" stroke="#000" stroke-width="1.5" />

        <!-- Items -->
        ${itemRows}

        <line x1="5" y1="${height - 145}" x2="${width-5}" y2="${height - 145}" stroke="#000" stroke-dasharray="6 4" stroke-width="1.5" />

        <!-- Total -->
        <text x="20" y="${height - 115}" font-size="16" font-weight="900">TOTAL:</text>
        <text x="${width-20}" y="${height - 115}" text-anchor="end" font-size="18" font-weight="900">${escapeXml(`${currency}${(ticket.totalAmount || ticket.totalAmount || 0).toFixed(2)}`)}</text>

        <line x1="5" y1="${height - 100}" x2="${width-5}" y2="${height - 100}" stroke="#000" stroke-width="2" />

        <!-- Barcode and Footer -->
        ${barcodeSvg}
        <text x="${width/2}" y="${height - 40}" text-anchor="middle" font-size="11" letter-spacing="2">${escapeXml(ticket.ticketNumber)}</text>

        <text x="${width/2}" y="${height - 15}" text-anchor="middle" font-size="11" font-weight="700">${ticketMessage}</text>
        <text x="${width/2}" y="${height - 2}" text-anchor="middle" font-size="9">*** CONSERVE SU TICKET ***</text>
      </g>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function generateTestPage(): string {
  return `${COMMANDS.INIT}${COMMANDS.ALIGN_CENTER}${COMMANDS.BOLD_ON}PRUEBA DE IMPRESION${COMMANDS.BOLD_OFF}${COMMANDS.FEED_LINE}${COMMANDS.FEED_LINE}${COMMANDS.PARTIAL_CUT}`
}

import { generatePT210Receipt, printDirect } from './pt210-printer'
import { jsPDF } from 'jspdf'

export const printerService = {
  generateTicketCommands: generateTicketReceipt,
  generateCashCloseCommands: generateCashCloseReceipt,
  generateTestPage,
  generatePrintableHTML,
  printToNetwork,
  scanBluetoothPrinter,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  printViaBluetooth,

  async shareTicketPDF(ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] }, settings: Record<string, string>) {
    try {
      const doc = new jsPDF({
        unit: 'mm',
        format: [58, 150] // Estándar de 58mm
      });

      const currency = settings.currency || 'C$';
      const businessName = (settings.businessName || 'LOTERIA').toUpperCase();
      
      // Estilos básicos
      doc.setFont('courier', 'bold');
      doc.setFontSize(14);
      doc.text(businessName, 29, 10, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('courier', 'normal');
      doc.text('Ticket de Loteria', 29, 15, { align: 'center' });
      
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, 18, 53, 18);
      
      doc.setFontSize(9);
      doc.text(`TICKET: #${ticket.ticketNumber}`, 5, 23);
      doc.text(`FECHA:  ${format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: es })}`, 5, 27);
      doc.text(`HORA:   ${format(new Date(ticket.createdAt), "HH:mm", { locale: es })}`, 5, 31);
      
      if (ticket.client) {
        doc.text(`CLIENTE: ${ticket.client.toUpperCase()}`, 5, 35);
      }

      doc.line(5, 38, 53, 38);
      
      // Encabezado de tabla
      doc.setFont('courier', 'bold');
      doc.text('JUEGO', 5, 43);
      doc.text('NUM', 22, 43, { align: 'center' });
      doc.text('VALOR', 35, 43, { align: 'center' });
      doc.text('PREMIO', 53, 43, { align: 'right' });
      doc.setFont('courier', 'normal');
      
      doc.line(5, 45, 53, 45);
      
      let y = 50;
      for (const item of ticket.items) {
        const gameName = (item.game?.name || 'NICA').substring(0, 10);
        const multiplier = item.game?.multiplier || 70;
        const prize = item.amount * multiplier;

        doc.text(gameName, 5, y);
        doc.setFont('courier', 'bold');
        doc.text(item.number, 22, y, { align: 'center' });
        doc.setFont('courier', 'normal');
        doc.text(`${currency}${item.amount.toFixed(0)}`, 35, y, { align: 'center' });
        doc.text(`${currency}${prize.toFixed(0)}`, 53, y, { align: 'right' });
        
        y += 4;
        doc.setFontSize(7);
        doc.text(`Sorteo: ${item.schedule}`, 5, y);
        doc.setFontSize(9);
        y += 6;

        if (y > 140) doc.addPage([58, 150]);
      }

      doc.line(5, y - 2, 53, y - 2);
      
      doc.setFontSize(12);
      doc.setFont('courier', 'bold');
      doc.text(`TOTAL: ${currency}${ticket.totalAmount.toFixed(2)}`, 53, y + 5, { align: 'right' });
      
      doc.setFontSize(8);
      doc.setFont('courier', 'normal');
      doc.text(settings.ticketMessage || '¡Gracias por su compra!', 29, y + 12, { align: 'center' });
      doc.text('*** CONSERVE SU TICKET ***', 29, y + 16, { align: 'center' });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const fileName = `ticket_${ticket.ticketNumber}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Compartir Ticket',
          text: `Ticket #${ticket.ticketNumber} - Lotochoco`,
          url: savedFile.uri,
          dialogTitle: 'Enviar ticket vía...',
        });
        
        return { success: true, message: 'Listo para compartir' };
      } else {
        doc.save(fileName);
        return { success: true, message: 'Descarga iniciada' };
      }
    } catch (error) {
      console.error('Error al generar/compartir PDF:', error);
      return { success: false, message: 'No se pudo generar el PDF' };
    }
  },

  async printTicket(ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] }, settings: Record<string,string>) {
    try {
      const type = settings.printerType || 'browser'
      const bluetoothDeviceId = settings.bluetoothDeviceId

      // Impresión Directa Bluetooth (PT-210 sin RawBT)
      if (type === 'bluetooth' && bluetoothDeviceId) {
        const commands = generatePT210Receipt(ticket, settings)
        return await printDirect(bluetoothDeviceId, commands)
      }

      // RawBT intent printing (Mantenemos como fallback pero el usuario no la quiere)
      if (type === 'rawbt' && typeof window !== 'undefined') {
        const commands = generatePT210Receipt(ticket, settings)
        const encoded = btoa(unescape(encodeURIComponent(commands)));
        const intentUrl = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`
        window.location.href = intentUrl;
        return { success: true, message: 'Abriendo app RawBT' }
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
      return { success: true, message: 'Impresion por navegador iniciada' }
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
          ;(window as any).cordova.plugins.printer.print(html, { name: `Cierre de Caja ${session.id || ''}` }, () => resolve({ success: true, message: 'Impresion nativa enviada' }), (err: any) => resolve({ success: false, message: err?.message || String(err) }))
        })
      }

      // Web Bluetooth printing
      if (type === 'bluetooth' && typeof window !== 'undefined' && (navigator.bluetooth || Capacitor.isNativePlatform())) {
        const commands = generateCashCloseReceipt(session, settings)
        
        if (Capacitor.isNativePlatform() && settings.bluetoothDeviceId) {
           return await printDirect(settings.bluetoothDeviceId, commands)
        }
        
        return await printViaBluetooth(commands)
      }

      // RawBT intent printing
      if (type === 'rawbt' && typeof window !== 'undefined') {
        const commands = generateCashCloseReceipt(session, settings)
        const encoded = btoa(unescape(encodeURIComponent(commands)));
        const intentUrl = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`

        window.location.href = intentUrl;
        return { success: true, message: 'Abriendo app RawBT para imprimir' }
      }

      if (type === 'network') {
        const commands = generateCashCloseReceipt(session, settings)
        return await printToNetwork(settings.printerAddress || '', commands)
      }

      const html = generatePrintableHTML(session as any, settings)
      const { printHtmlDocument } = await import('@/lib/print')
      printHtmlDocument(html)
      return { success: true, message: 'Impresion por navegador iniciada' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }
}
