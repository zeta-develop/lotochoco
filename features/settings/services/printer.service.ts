import { bluetoothService } from './bluetooth.service'
import type { Ticket, CashSession } from '@/lib/types'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h, formatDateNumber } from '@/lib/utils'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import { parseTemplateToBlocks, DEFAULT_TICKET_TEMPLATE, generateTicketQrHash } from '../utils/ticket-template'

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

  qrCode(data: string, _widthDots: number = 384, _leadingSpaces: number = 0) {
    try {
      const cleanData = (data || 'LOTERIA').trim()
      const qr = QRCode.create(cleanData, { errorCorrectionLevel: 'M' })
      const size = qr.modules.size // 25 modules para token de 32 chars
      const margin = 1 // 1 módulo de quiet zone (óptimo en papel térmico blanco)
      const totalModules = size + margin * 2 // 27 modules
      // Escala 5: 27 * 5 = 135 dots (~16.87 mm de ancho), tamaño óptimo para escaneo rápido
      // y transmisión ultra-ligera por Bluetooth
      const scale = 5
      const qrPixelSize = totalModules * scale // 135 dots

      // Ancho exacto del QR en bytes: 135 puntos / 8 = 17 bytes por fila
      // Sin ceros laterales manuales para reducir el payload a solo 2,295 bytes (más de 70% de ahorro)
      // Esto elimina por completo el retraso/parones en la impresora y hace que salga "de un solo".
      const widthBytes = Math.ceil(qrPixelSize / 8) // 17 bytes
      const xL = widthBytes & 0xFF
      const xH = (widthBytes >> 8) & 0xFF
      const yL = qrPixelSize & 0xFF
      const yH = (qrPixelSize >> 8) & 0xFF

      // Asegurar modo centrado en la impresora para el gráfico raster
      this.buffer.push(0x1B, 0x61, 0x01)

      // Comando ESC/POS universal: GS v 0 (Print raster bit image)
      // La impresora térmica PT-210 centra automáticamente la imagen de 17 bytes con ESC a 1
      this.buffer.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH)

      for (let y = 0; y < qrPixelSize; y++) {
        const rowBytes = new Uint8Array(widthBytes)
        const modY = Math.floor(y / scale) - margin
        
        if (modY >= 0 && modY < size) {
          for (let x = 0; x < qrPixelSize; x++) {
            const modX = Math.floor(x / scale) - margin
            if (modX >= 0 && modX < size) {
              if (qr.modules.get(modY, modX)) {
                const bIdx = Math.floor(x / 8)
                const bit = 7 - (x % 8)
                rowBytes[bIdx] |= (1 << bit)
              }
            }
          }
        }
        
        for (let b = 0; b < widthBytes; b++) {
          this.buffer.push(rowBytes[b])
        }
      }

      // Salto de línea después del gráfico raster
      this.buffer.push(0x0A)
      // Mantener alineación centrada para los mensajes del pie
      this.buffer.push(0x1B, 0x61, 0x01)
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
            if (block.isBold) builder.bold(true)
            // Encabezado estándar de 32 columnas alineado con las columnas de los números
            builder.alignLeft().text('   Apuesta       Monto    Premio').newline()
            if (block.isBold) builder.bold(false)
            break

          case 'item_row': {
            builder.alignLeft().bold(true).doubleWidth(true)
            const num = (block.number || '').trim()
            const amt = (block.amount || '').trim()
            const prz = (block.prize || '').trim()

            // 16 columnas de doble ancho (equivalen a las 32 columnas físicas de 58mm):
            // Col 1 (Apuesta): 3 cols (ej: " 09", " 22", "123")
            // Col 2 (Monto):   6 cols centradas (ej: "   5  ", "  100 ")
            // Col 3 (Premio):  7 cols alineadas a la derecha (ej: "    400", "   8000", "  35000")
            // Suma total: 3 + 6 + 7 = 16 columnas exactas
            const col1 = num.padStart(Math.min(num.length + 1, 3)).padEnd(3)
            const col2 = amt.padStart(amt.length <= 2 ? 4 : 5).padEnd(6)
            const col3 = prz.padStart(7)

            builder.text(`${col1}${col2}${col3}`)
            builder.doubleWidth(false).bold(false).newline()
            break
          }

          case 'total':
            if (block.isBold !== false) {
              builder.alignCenter().bold(true).doubleWidth(true)
              builder.text(block.text)
              builder.doubleWidth(false).bold(false).newline()
            } else {
              builder.alignCenter().bold(false).doubleWidth(false)
              builder.text(block.text).newline()
            }
            break

          case 'bold_text':
            builder.alignCenter().bold(true).text(block.text).bold(false).newline()
            break

          case 'text':
            builder.alignCenter()
            if (block.segments && block.segments.length > 0) {
              for (const seg of block.segments) {
                if (seg.bold) {
                  builder.bold(true).text(seg.text).bold(false)
                } else {
                  builder.bold(false).text(seg.text)
                }
              }
              builder.bold(false).newline()
            } else if (block.isBold) {
              builder.bold(true).text(block.text).bold(false).newline()
            } else {
              builder.bold(false).text(block.text).newline()
            }
            break

          case 'qr':
            builder.qrCode(block.code || generateTicketQrHash(ticket) || 'LOTERIA', paperDots, block.leadingSpaces || 0)
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

