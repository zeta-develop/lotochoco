import { bluetoothService } from './bluetooth.service'
import type { Ticket, CashSession } from '@/lib/types'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h, formatDateNumber } from '@/lib/utils'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
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

  qrCode(data: string, widthDots: number = 384, leadingSpaces: number = 0) {
    try {
      const cleanData = (data || 'LOTERIA').trim()
      const qr = QRCode.create(cleanData, { errorCorrectionLevel: 'M' })
      const size = qr.modules.size // e.g. 21
      const margin = 2
      const totalModules = size + margin * 2 // 25 modules
      // Escala ampliada para QR más grande y legible: ~200 puntos (~25 mm de ancho en papel 58mm)
      const scale = Math.max(6, Math.min(8, Math.floor(216 / totalModules)))
      const qrPixelSize = totalModules * scale // ~200 dots
      
      // Ancho imprimible estándar para impresoras térmicas portátiles (58mm = 384 puntos = 32 cols)
      const targetWidthDots = widthDots || 384
      const defaultCenterDots = Math.max(0, Math.floor((targetWidthDots - qrPixelSize) / 2))

      // Si el usuario especificó espacios manuales antes de [QR] en el editor, desplazamos proporcionalmente
      let leftPaddingDots = defaultCenterDots
      if (leadingSpaces > 0) {
        // En fuente monoespaciada estándar, cada espacio equivale a 12 puntos de ancho
        leftPaddingDots = Math.max(0, Math.min(targetWidthDots - qrPixelSize, leadingSpaces * 12))
      }

      // Asegurar modo alineado a la izquierda antes de la imagen raster para control exacto por coordenadas
      this.buffer.push(0x1B, 0x61, 0x00)

      // Comando ESC/POS universal: GS v 0 (Print raster bit image)
      // Soportado por el 100% de impresoras térmicas portátiles (Goojprt PT-210, MPT-II, etc.)
      const widthBytes = Math.ceil(targetWidthDots / 8) // 48 bytes para 384 dots (58mm)
      const xL = widthBytes & 0xFF
      const xH = (widthBytes >> 8) & 0xFF
      const yL = qrPixelSize & 0xFF
      const yH = (qrPixelSize >> 8) & 0xFF

      this.buffer.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH)

      for (let y = 0; y < qrPixelSize; y++) {
        const rowBytes = new Uint8Array(widthBytes)
        const modY = Math.floor(y / scale) - margin
        
        if (modY >= 0 && modY < size) {
          for (let x = 0; x < qrPixelSize; x++) {
            const modX = Math.floor(x / scale) - margin
            if (modX >= 0 && modX < size) {
              if (qr.modules.get(modY, modX)) {
                const targetDot = leftPaddingDots + x
                if (targetDot < targetWidthDots) {
                  const bIdx = Math.floor(targetDot / 8)
                  const bit = 7 - (targetDot % 8)
                  rowBytes[bIdx] |= (1 << bit)
                }
              }
            }
          }
        }
        
        for (let b = 0; b < widthBytes; b++) {
          this.buffer.push(rowBytes[b])
        }
      }
    } catch (e) {
      console.error('Error generando QR ESC/POS universal:', e)
    }
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
      const paperDots = settings.ticketWidth === '80mm' ? 576 : 384

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
            if (block.rawText) {
              builder.alignLeft().text(block.rawText).newline()
            } else {
              builder.alignLeft().text(block.col1.padEnd(10) + block.col2.padEnd(10) + block.col3.padStart(12)).newline()
            }
            break

          case 'item_row':
            if (block.customText) {
              builder.alignLeft().bold(true)
              if (block.customText.length <= 16) {
                builder.doubleWidth(true)
                builder.text(block.customText)
                builder.doubleWidth(false)
              } else {
                builder.text(block.customText)
              }
              builder.bold(false).newline()
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
            builder.qrCode(block.code || ticket.ticketNumber || 'LOTERIA', 384, block.leadingSpaces || 0)
            break

          case 'empty':
            builder.newline()
            break
        }
      }

      builder.feed(3)

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

