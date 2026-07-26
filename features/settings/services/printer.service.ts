import { bluetoothService } from './bluetooth.service'
import type { Ticket, CashSession } from '@/lib/types'
import { jsPDF } from 'jspdf'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h, formatDateNumber } from '@/lib/utils'

class EscPosBuilder {
  private buffer: number[] = []

  init() {
    this.buffer.push(0x1B, 0x40)
    return this
  }

  alignCenter() {
    this.buffer.push(0x1B, 0x61, 0x01)
    return this
  }

  alignLeft() {
    this.buffer.push(0x1B, 0x61, 0x00)
    return this
  }

  alignRight() {
    this.buffer.push(0x1B, 0x61, 0x02)
    return this
  }

  bold(on: boolean) {
    this.buffer.push(0x1B, 0x45, on ? 1 : 0)
    return this
  }

  text(str: string) {
    const cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    for (let i = 0; i < cleanStr.length; i++) {
      this.buffer.push(cleanStr.charCodeAt(i))
    }
    return this
  }

  newline() {
    this.buffer.push(0x0A)
    return this
  }

  feed(lines: number) {
    this.buffer.push(0x1B, 0x64, lines)
    return this
  }

  cut() {
    this.buffer.push(0x1D, 0x56, 0x41, 0x00)
    return this
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer)
  }
}

export const printerService = {
  async printTicket(ticket: Ticket, settings: Record<string, string>): Promise<boolean> {
    try {
      console.log('Iniciando impresión de ticket:', ticket.ticketNumber);
      
      if (settings.printerType !== 'bluetooth') {
        console.warn('Solo Bluetooth soportado nativamente por ahora. Tipo actual:', settings.printerType)
        return true
      }

      const deviceId = settings.bluetoothDeviceId
      if (!deviceId) {
        console.error('No hay ID de dispositivo Bluetooth configurado');
        throw new Error('No hay impresora configurada')
      }

      const template = settings.ticketTemplate || `# {{businessName}}
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

      const builder = new EscPosBuilder()
      builder.init()

      // Validar fecha
      let ticketDate = new Date();
      try {
        if (ticket.createdAt) {
          ticketDate = new Date(ticket.createdAt);
          if (isNaN(ticketDate.getTime())) ticketDate = new Date();
        }
      } catch (e) {
        console.warn('Error al procesar fecha del ticket:', e);
      }

      const currency = settings.currency || 'C$'
      const ticketMessage = settings.ticketMessage || '¡Gracias por su compra!'
      const businessName = settings.businessName || 'LOTOCHOCO'
      
      // Obtener info del primer item para el encabezado si es necesario
      const firstItem = ticket.items?.[0] as any
      const gameName = firstItem?.gameName || firstItem?.game?.name || 'Diaria'
      const scheduleSource = firstItem?.scheduleName || firstItem?.schedule || 'Sorteo'
      const scheduleName = scheduleSource === 'Sorteo' ? scheduleSource : formatTime12h(scheduleSource)

      let processed = template
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{ticketNumber}}/g, ticket.ticketNumber || 'N/A')
        .replace(/{{date}}/g, format(ticketDate, 'dd-MM-yyyy hh:mm:ss a', { locale: es }))
        .replace(/{{gameName}}/g, gameName)
        .replace(/{{scheduleName}}/g, scheduleName)
        .replace(/{{vendorName}}/g, 'Yamileth') // TODO: Vincular con usuario real
        .replace(/{{terminalName}}/g, '= J081 =') // TODO: Vincular con terminal real
        .replace(/{{currency}}/g, currency)
        .replace(/{{total}}/g, (ticket.totalAmount || 0).toFixed(0))
        .replace(/{{ticketMessage}}/g, ticketMessage)
        .replace(/{{#if client}}([\s\S]*?){{\/if}}/g, ticket.client ? `$1`.replace(/{{client}}/g, ticket.client.toUpperCase()) : '')
        .replace(/{{client}}/g, ticket.client ? ticket.client.toUpperCase() : '')

      const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/g
      processed = processed.replace(itemsRegex, (match, content) => {
        return (ticket.items || []).map(item => {
          const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
          const prizePotential = item.amount * multiplier

          // Formateo de columnas simple (suponiendo 32 chars de ancho)
          // APUESTA(10) MONTO(10) PREMIO(12)
          return content
            .replace(/{{game}}/g, (item as any).gameName || (item as any).game?.name || 'Diaria')
            .replace(/{{number}}/g, (item.number.length === 4 ? formatDateNumber(item.number, true) : item.number).padEnd(8))
            .replace(/{{amount}}/g, item.amount.toFixed(0).padEnd(8))
            .replace(/{{prize}}/g, prizePotential.toFixed(0).padStart(8))
            .replace(/{{currency}}/g, currency)
        }).join('\n')
      })

      const lines = processed.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('# ')) {
          builder.alignCenter().bold(true).text(trimmedLine.replace('# ', '')).bold(false).newline()
        } else if (trimmedLine.startsWith('## ')) {
          builder.alignCenter().bold(true).text(trimmedLine.replace('## ', '')).bold(false).newline()
        } else {
          const parts = line.split('**')
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) builder.bold(true)
            builder.text(parts[i])
            if (i % 2 === 1) builder.bold(false)
          }
          builder.newline()
        }
      }
      
      builder.feed(4)

      console.log('Conectando a impresora:', deviceId);
      await bluetoothService.connect(deviceId)
      
      console.log('Enviando datos...');
      await bluetoothService.writeData(deviceId, builder.build())
      
      // Esperar un momento antes de desconectar para asegurar que el buffer se procese
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await bluetoothService.disconnect(deviceId)
      console.log('Impresión finalizada con éxito');
      
      return true
    } catch (error) {
      console.error('Error crítico al imprimir ticket:', error)
      return false
    }
  },

  async printClose(session: CashSession, settings: Record<string, string>): Promise<boolean> {
    return true
  },

  async shareTicketPDF(ticket: Ticket, settings: Record<string, string>) {
    try {
      const currency = settings.currency || 'C$'
      const ticketMessage = settings.ticketMessage || '¡Gracias por su compra!'
      const businessName = settings.businessName || 'LOTOCHOCO'

      let ticketDate = new Date();
      try {
        if (ticket.createdAt) {
          ticketDate = new Date(ticket.createdAt);
          if (isNaN(ticketDate.getTime())) ticketDate = new Date();
        }
      } catch (e) {
        console.warn('Error al procesar fecha del ticket:', e);
      }

      const items = ticket.items || []
      const itemHeight = 21
      const contentHeight = Math.max(145, 80 + (items.length * itemHeight))

      const doc = new jsPDF({
        unit: 'mm',
        format: [85, contentHeight]
      })

      // 1. Fondo Oscuro Premium (Estilo App Dark Mode)
      doc.setFillColor(15, 23, 42) // Slate 900 (#0f172a)
      doc.rect(0, 0, 85, contentHeight, 'F')

      // 2. Encabezado / Branding
      // Barra Superior Verde Esmeralda
      doc.setFillColor(16, 185, 129) // Emerald 500 (#10b981)
      doc.roundedRect(5, 5, 75, 3, 1.5, 1.5, 'F')

      // Tarjeta de Título
      doc.setFillColor(30, 41, 59) // Slate 800 (#1e293b)
      doc.roundedRect(5, 9, 75, 24, 3, 3, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.text(businessName.toUpperCase(), 42.5, 17, { align: 'center' })

      doc.setFontSize(8)
      doc.setTextColor(52, 211, 153) // Emerald 400
      doc.text('COMPROBANTE DIGITAL DE VENTA', 42.5, 22, { align: 'center' })

      // Badge Número de Ticket
      doc.setFillColor(51, 65, 85) // Slate 700
      doc.roundedRect(20, 25, 45, 6, 3, 3, 'F')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.text(`TICKET #${ticket.ticketNumber || 'N/A'}`, 42.5, 29.2, { align: 'center' })

      // 3. Info del Ticket (Fecha, Cliente, etc.)
      doc.setFillColor(30, 41, 59)
      doc.roundedRect(5, 36, 75, ticket.client ? 22 : 16, 3, 3, 'F')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(148, 163, 184) // Slate 400
      doc.text('FECHA:', 8, 42)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(241, 245, 249) // Slate 100
      doc.text(format(ticketDate, 'dd/MM/yyyy - hh:mm:ss a', { locale: es }), 24, 42)

      if (ticket.client) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(148, 163, 184)
        doc.text('CLIENTE:', 8, 48)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(241, 245, 249)
        doc.text(ticket.client.toUpperCase(), 25, 48)
      }

      const statusY = ticket.client ? 54 : 48
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(148, 163, 184)
      doc.text('ESTADO:', 8, statusY)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(52, 211, 153)
      doc.text('EMITIDO / OFFLINE', 25, statusY)

      // 4. Detalle de Jugadas
      let y = ticket.client ? 63 : 57

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text('JUGADAS REGISTRADAS', 8, y)
      y += 3

      items.forEach((item) => {
        const gameName = (item as any).gameName || (item as any).game?.name || 'JUEGO'
        const scheduleSource = (item as any).scheduleName || (item as any).schedule || 'Sorteo'
        const scheduleName = scheduleSource === 'Sorteo' ? scheduleSource : formatTime12h(scheduleSource)
        const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
        const prizePotential = item.amount * multiplier
        const formattedNum = item.number.length === 4 ? formatDateNumber(item.number) : item.number

        // Fondo de tarjeta de jugada
        doc.setFillColor(30, 41, 59)
        doc.roundedRect(5, y, 75, 18, 3, 3, 'F')

        // Borde izquierdo esmeralda
        doc.setFillColor(16, 185, 129)
        doc.roundedRect(5, y, 2.5, 18, 1, 1, 'F')

        // Juego + Horario
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(52, 211, 153)
        doc.text(`${gameName.toUpperCase()}`, 10, y + 5)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text(`(${scheduleName})`, 10 + doc.getTextWidth(`${gameName.toUpperCase()} `), y + 5)

        // Número jugado
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)
        doc.text(formattedNum, 10, y + 14)

        // Monto
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(16, 185, 129)
        doc.text(`${currency}${item.amount.toFixed(2)}`, 76, y + 6, { align: 'right' })

        // Premio potencial
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.text(`Gana: ${currency}${prizePotential.toLocaleString()}`, 76, y + 13, { align: 'right' })

        y += itemHeight
      })

      // 5. Total
      y += 2
      doc.setFillColor(16, 185, 129) // Emerald Background
      doc.roundedRect(5, y, 75, 18, 3, 3, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.text('TOTAL DE VENTA:', 10, y + 11)

      doc.setFontSize(14)
      doc.text(`${currency}${(ticket.totalAmount || 0).toFixed(2)}`, 75, y + 12, { align: 'right' })

      // 6. Mensaje y Pie de página
      y += 24
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(203, 213, 225) // Slate 300
      doc.text(ticketMessage, 42.5, y, { align: 'center' })

      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139) // Slate 500
      doc.text('Conservar comprobante para reclamo de premios', 42.5, y + 5, { align: 'center' })

      doc.setFontSize(6)
      doc.setTextColor(16, 185, 129)
      doc.text('Lotochoco POS • Sistema POS 100% Offline', 42.5, y + 9, { align: 'center' })

      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const fileName = `ticket_${ticket.ticketNumber}.pdf`

      await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      })

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      })

      await Share.share({
        title: `Ticket #${ticket.ticketNumber}`,
        text: `Ticket #${ticket.ticketNumber} - ${businessName}`,
        url: fileUri.uri,
        dialogTitle: 'Compartir Ticket'
      })

      return { success: true }
    } catch (error) {
      console.error('Error sharing PDF:', error)
      return { success: false, message: 'No se pudo generar o compartir el PDF' }
    }
  },

  async testPrinter(type: string, address: string, settings?: Record<string, string>): Promise<boolean> {
    try {
      if (type !== 'bluetooth') return true

      const deviceId = address || settings?.bluetoothDeviceId
      if (!deviceId) throw new Error('No hay impresora configurada')

      const builder = new EscPosBuilder()
      builder.init()
      builder.alignCenter().bold(true)
      builder.text('LOTOCHOCO').newline()
      builder.text('PRUEBA DE IMPRESION EXITOSA').newline()
      builder.bold(false)
      builder.text('--------------------------------').newline()
      builder.text('Si puedes leer esto, tu').newline()
      builder.text('impresora esta configurada').newline()
      builder.text('correctamente.').newline()
      builder.feed(3)

      await bluetoothService.connect(deviceId)
      await bluetoothService.writeData(deviceId, builder.build())
      await bluetoothService.disconnect(deviceId)
      
      return true
    } catch (error) {
      console.error('Error en prueba de impresora:', error)
      return false
    }
  }
}

