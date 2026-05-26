import { bluetoothService } from './bluetooth.service'
import type { Ticket, CashSession } from '@/lib/types'
import { jsPDF } from 'jspdf'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

  size(width: number, height: number) {
    let n = 0;
    if (width === 2) n |= 0x10;
    if (height === 2) n |= 0x01;
    this.buffer.push(0x1D, 0x21, n)
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
--------------------------------
JUEGO      NUM       MONTO
--------------------------------
{{#items}}
{{game}}  {{number}}  {{currency}}{{amount}}
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

      let processed = template
        .replace(/{{businessName}}/g, settings.businessName || 'LOTOCHOCO')
        .replace(/{{ticketNumber}}/g, ticket.ticketNumber || 'N/A')
        .replace(/{{date}}/g, format(ticketDate, 'dd/MM/yyyy hh:mm a', { locale: es }))
        .replace(/{{currency}}/g, settings.currency || 'C$')
        .replace(/{{total}}/g, (ticket.totalAmount || 0).toFixed(2))
        .replace(/{{ticketMessage}}/g, settings.ticketMessage || '')
        .replace(/{{#if client}}.*?{{\/if}}/g, ticket.client ? `CLIENTE: ${ticket.client.toUpperCase()}` : '')

      const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/g
      processed = processed.replace(itemsRegex, (match, content) => {
        return (ticket.items || []).map(item => {
          const gameName = (item as any).gameName || (item as any).game?.name || 'JUEGO'
          const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
          const prizePotential = item.amount * multiplier

          return content
            .replace(/{{game}}/g, gameName)
            .replace(/{{number}}/g, item.number)
            .replace(/{{amount}}/g, item.amount.toFixed(0))
            .replace(/{{prize}}/g, prizePotential.toFixed(0))
        }).join('\n')
      })

      const lines = processed.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('# ')) {
          builder.alignCenter().size(2, 2).bold(true).text(trimmedLine.replace('# ', '')).size(1, 1).bold(false).newline()
        } else if (trimmedLine.startsWith('## ')) {
          builder.alignCenter().size(1, 1).bold(true).text(trimmedLine.replace('## ', '')).bold(false).newline()
        } else {
          builder.alignLeft().size(1, 1)
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
      const doc = new jsPDF({
        unit: 'mm',
        format: [80, 180]
      })

      const template = settings.ticketTemplate || `# {{businessName}}
RECIBO DE VENTA
--------------------------------
TICKET: #{{ticketNumber}}
FECHA: {{date}}
--------------------------------
JUEGO      NUM       MONTO
--------------------------------
{{#items}}
{{game}}  {{number}}  {{currency}}{{amount}}
{{/items}}
--------------------------------
**TOTAL: {{currency}}{{total}}**

{{ticketMessage}}
*** CONSERVE ESTE TICKET ***`

      let processed = template
        .replace(/{{businessName}}/g, settings.businessName || 'LOTOCHOCO')
        .replace(/{{ticketNumber}}/g, ticket.ticketNumber)
        .replace(/{{date}}/g, format(new Date(ticket.createdAt), 'dd/MM/yyyy hh:mm a', { locale: es }))
        .replace(/{{currency}}/g, settings.currency || 'C$')
        .replace(/{{total}}/g, ticket.totalAmount.toFixed(2))
        .replace(/{{ticketMessage}}/g, settings.ticketMessage || '')
        .replace(/{{#if client}}.*?{{\/if}}/g, ticket.client ? `CLIENTE: ${ticket.client.toUpperCase()}` : '')

      const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/g
      processed = processed.replace(itemsRegex, (match, content) => {
        return (ticket.items || []).map(item => {
          const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
          const prizePotential = item.amount * multiplier

          return content
            .replace(/{{game}}/g, (item as any).gameName || 'JUEGO')
            .replace(/{{number}}/g, item.number)
            .replace(/{{amount}}/g, item.amount.toFixed(0))
            .replace(/{{prize}}/g, prizePotential.toFixed(0))
        }).join('\n')
      })

      const lines = processed.split('\n')
      let y = 15
      for (const line of lines) {
        if (line.startsWith('# ')) {
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.text(line.replace('# ', ''), 40, y, { align: 'center' })
          y += 10
        } else if (line.startsWith('## ')) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text(line.replace('## ', ''), 40, y, { align: 'center' })
          y += 8
        } else {
          doc.setFontSize(9)
          const parts = line.split('**')
          let currentX = 10
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) doc.setFont('helvetica', 'bold')
            else doc.setFont('helvetica', 'normal')
            
            doc.text(parts[i], currentX, y)
            currentX += doc.getTextWidth(parts[i])
          }
          y += 5
        }
        if (y > 170) break
      }

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
        text: `Compartiendo Ticket #${ticket.ticketNumber}`,
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

