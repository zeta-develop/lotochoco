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
      const itemHeight = 18
      const hasClient = Boolean(ticket.client)
      const metaHeight = hasClient ? 20 : 15
      const contentHeight = Math.max(130, 68 + metaHeight + (items.length * itemHeight))

      const doc = new jsPDF({
        unit: 'mm',
        format: [80, contentHeight]
      })

      // 1. Fondo Blanco Limpio
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, 80, contentHeight, 'F')

      // 2. Barra Superior de Acento Esmeralda
      doc.setFillColor(5, 150, 105) // Emerald 600
      doc.rect(0, 0, 80, 4, 'F')

      // 3. Encabezado / Nombre del Negocio
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(15, 23, 42) // Slate 900
      doc.text(businessName.toUpperCase(), 40, 12, { align: 'center' })

      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(5, 150, 105)
      doc.text('COMPROBANTE OFICIAL DE VENTA', 40, 16, { align: 'center' })

      // Badge Número de Ticket
      doc.setFillColor(241, 245, 249) // Slate 100
      doc.setDrawColor(226, 232, 240) // Slate 200
      doc.roundedRect(18, 19, 44, 6, 3, 3, 'FD')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(`TICKET #${ticket.ticketNumber || 'N/A'}`, 40, 23.2, { align: 'center' })

      // 4. Tarjeta de Metadata (Fecha, Cliente, Estado)
      doc.setFillColor(248, 250, 252) // Slate 50
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(5, 28, 70, metaHeight, 2, 2, 'FD')

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139) // Slate 500
      doc.text('FECHA:', 8, 33)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(15, 23, 42)
      doc.text(format(ticketDate, 'dd/MM/yyyy - hh:mm:ss a', { locale: es }), 23, 33)

      if (hasClient && ticket.client) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 116, 139)
        doc.text('CLIENTE:', 8, 38)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(15, 23, 42)
        doc.text(ticket.client.toUpperCase(), 23, 38)
      }

      const statusY = hasClient ? 43 : 38
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('ESTADO:', 8, statusY)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(5, 150, 105)
      doc.text('COMPLETADO', 23, statusY)

      // 5. Encabezado de Tabla de Jugadas
      let y = 32 + metaHeight
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('JUGADA / NÚMERO', 8, y)
      doc.text('INVERSIÓN', 72, y, { align: 'right' })
      y += 2

      // Línea divisoria
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(5, y, 75, y)
      y += 3

      // 6. Lista de Jugadas
      items.forEach((item) => {
        const gameName = (item as any).gameName || (item as any).game?.name || 'JUEGO'
        const scheduleSource = (item as any).scheduleName || (item as any).schedule || 'Sorteo'
        const scheduleName = scheduleSource === 'Sorteo' ? scheduleSource : formatTime12h(scheduleSource)
        const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
        const prizePotential = item.amount * multiplier
        const formattedNum = item.number.length === 4 ? formatDateNumber(item.number) : item.number

        // Tarjeta de Jugada
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(5, y, 70, 15, 2, 2, 'FD')

        // Borde izquierdo esmeralda
        doc.setFillColor(5, 150, 105)
        doc.roundedRect(5, y, 2, 15, 1, 1, 'F')

        // Juego y Horario
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(5, 150, 105)
        doc.text(gameName.toUpperCase(), 9, y + 4.5)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(100, 116, 139)
        doc.text(`(${scheduleName})`, 9 + doc.getTextWidth(`${gameName.toUpperCase()} `), y + 4.5)

        // Número Jugado (Destacado)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text(formattedNum, 9, y + 11.5)

        // Monto Invertido
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(15, 23, 42)
        doc.text(`${currency}${item.amount.toFixed(2)}`, 72, y + 5.5, { align: 'right' })

        // Premio Potencial
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(100, 116, 139)
        doc.text(`Premio: ${currency}${prizePotential.toLocaleString()}`, 72, y + 11, { align: 'right' })

        y += itemHeight
      })

      // 7. Tarjeta de Total
      y += 1
      doc.setFillColor(5, 150, 105) // Fondo Esmeralda
      doc.roundedRect(5, y, 70, 15, 2.5, 2.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 255, 255)
      doc.text('TOTAL A PAGAR:', 9, y + 9)

      doc.setFontSize(13)
      doc.text(`${currency}${(ticket.totalAmount || 0).toFixed(2)}`, 72, y + 9.5, { align: 'right' })

      // 8. Pie de página
      y += 20
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(51, 65, 85)
      doc.text(ticketMessage, 40, y, { align: 'center' })

      doc.setFontSize(6.5)
      doc.setTextColor(148, 163, 184)
      doc.text('Verifique su ticket antes de retirarse. Conservar para reclamos.', 40, y + 4.5, { align: 'center' })

      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(5, 150, 105)
      doc.text('LOTOCHOCO POS • SISTEMA OFFLINE DE LOTERÍA', 40, y + 8.5, { align: 'center' })

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
        text: `Comprobante de Ticket #${ticket.ticketNumber} - ${businessName}`,
        url: fileUri.uri,
        dialogTitle: 'Compartir Comprobante'
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

