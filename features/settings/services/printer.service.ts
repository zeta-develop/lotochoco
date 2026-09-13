import { bluetoothService } from './bluetooth.service'
import type { Ticket, CashSession } from '@/lib/types'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h, formatDateNumber } from '@/lib/utils'
import { toPng } from 'html-to-image'
import { parseTemplateToBlocks, DEFAULT_TICKET_TEMPLATE } from '../utils/ticket-template'

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

  doubleSize(on: boolean) {
    this.buffer.push(0x1D, 0x21, on ? 0x11 : 0x00)
    return this
  }

  doubleHeight(on: boolean) {
    this.buffer.push(0x1D, 0x21, on ? 0x01 : 0x00)
    return this
  }

  doubleWidth(on: boolean) {
    this.buffer.push(0x1D, 0x21, on ? 0x10 : 0x00)
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

  qrCode(data: string, size: number = 6) {
    // 1. GS ( k Function 165: Select QR model 2
    this.buffer.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)

    // 2. GS ( k Function 167: Set QR module size (1-16, typical 5-6 for 58mm)
    const moduleSize = Math.max(1, Math.min(16, size))
    this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize)

    // 3. GS ( k Function 169: Set error correction level M (49 / 0x31)
    this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31)

    // 4. GS ( k Function 180: Store data in symbol storage
    const cleanData = (data || 'LOTERIA').normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const len = cleanData.length + 3
    const pL = len & 0xFF
    const pH = (len >> 8) & 0xFF

    this.buffer.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30)
    for (let i = 0; i < cleanData.length; i++) {
      this.buffer.push(cleanData.charCodeAt(i))
    }

    // 5. GS ( k Function 181: Print symbol data in storage
    this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
    return this
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer)
  }
}

export const printerService = {
  async printTicket(ticket: Ticket, settings: Record<string, string>, isReprint: boolean = false): Promise<boolean> {
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

      const builder = new EscPosBuilder()
      builder.init()

      const template = settings.ticketTemplate || DEFAULT_TICKET_TEMPLATE
      const blocks = parseTemplateToBlocks(template, ticket, settings, isReprint)

      for (const block of blocks) {
        switch (block.type) {
          case 'header_big':
            builder.alignCenter().bold(true).doubleSize(true).text(block.text).doubleSize(false).bold(false).newline()
            break

          case 'header_med':
            builder.alignCenter().bold(true).text(block.text).bold(false).newline()
            break

          case 'separator':
            builder.alignCenter().text('--------------------------------').newline()
            break

          case 'items_header':
            builder.alignLeft().text(block.col1.padEnd(10) + block.col2.padEnd(10) + block.col3.padStart(12)).newline()
            break

          case 'item_row':
            if (block.customText) {
              builder.alignCenter().text(block.customText).newline()
            } else {
              // 5 columnas doble ancho para apuesta + 5 para monto + 6 para premio = 16 columnas doble ancho (32 cols 58mm)
              const col1 = block.number.padEnd(5)
              const col2 = block.amount.padEnd(5)
              const col3 = block.prize.padStart(6)
              builder.bold(true).doubleWidth(true)
              builder.text(`${col1}${col2}${col3}`)
              builder.doubleWidth(false).bold(false).newline()
            }
            break

          case 'total':
            builder.alignCenter().bold(true).doubleWidth(true)
            builder.text(block.text)
            builder.doubleWidth(false).bold(false).newline()
            break

          case 'bold_text':
            builder.alignCenter().bold(true).text(block.text).bold(false).newline()
            break

          case 'text':
            builder.alignCenter().text(block.text).newline()
            break

          case 'qr':
            builder.qrCode(block.code || ticket.ticketNumber || 'LOTERIA', 4)
            break

          case 'empty':
            builder.newline()
            break
        }
      }

      builder.feed(2)

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

  async shareTicketImage(ticket: Ticket, settings: Record<string, string>, element: HTMLElement | null) {
    try {
      const businessName = settings.businessName || 'LOTOCHOCO'

      if (!element) {
        throw new Error('No se pudo capturar el ticket')
      }

      // Capturar el boleto como imagen PNG (estilo captura de pantalla)
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      })

      const base64 = dataUrl.split(',')[1]
      const fileName = `ticket_${ticket.ticketNumber || 'preview'}.png`

      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      })

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      })

      await Share.share({
        title: `Ticket #${ticket.ticketNumber}`,
        text: `Comprobante de Ticket #${ticket.ticketNumber} - ${businessName}`,
        url: fileUri.uri,
        dialogTitle: 'Compartir Comprobante',
      })

      return { success: true }
    } catch (error) {
      console.error('Error sharing ticket image:', error)
      return { success: false, message: 'No se pudo generar o compartir la imagen del ticket' }
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

