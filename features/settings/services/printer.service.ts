import { bluetoothService } from './bluetooth.service'
import type { Ticket, CashSession } from '@/lib/types'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h, formatDateNumber } from '@/lib/utils'
import { toPng } from 'html-to-image'

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
      const businessName = (settings.businessName || 'LOTERIA').toUpperCase()
      const vendorName = settings.vendorName || 'Yamileth'
      const formattedDate = format(ticketDate, 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
      
      const firstItem = ticket.items?.[0] as any
      const gameName = firstItem?.gameName || firstItem?.game?.name || 'Tica'
      const rawSchedule = firstItem?.scheduleName || firstItem?.schedule || '7:30 pm'
      let scheduleName = rawSchedule
      try {
        const formattedSch = formatTime12h(rawSchedule)
        if (formattedSch) scheduleName = formattedSch.toLowerCase()
      } catch {
        scheduleName = rawSchedule
      }

      const receiptType = isReprint ? 'RECIBO DE COPIA' : 'RECIBO DE VENTA'
      const separator = '--------------------------------'

      // 1. ENCABEZADO
      builder.alignCenter().bold(true).doubleHeight(true).text(businessName).doubleHeight(false).bold(false).newline()
      builder.text(separator).newline()

      // 2. METADATA (Centrado)
      builder.text(receiptType).newline()
      builder.text(`Folio: ${ticket.ticketNumber || 'N/A'}`).newline()
      builder.text(`Fecha: ${formattedDate}`).newline()
      builder.text(`Juego: ${gameName}`).newline()
      builder.text(`Sorteo: ${scheduleName}`).newline()
      if (ticket.client && ticket.client.trim()) {
        builder.text(`Cliente: ${ticket.client.trim()}`).newline()
      }
      builder.text(`Vendedor: ${vendorName}`).newline()
      builder.text(separator).newline()

      // 3. TABLA DE APUESTAS (32 columnas estándar para 58mm)
      builder.alignLeft().bold(true)
      builder.text('Apuesta'.padEnd(16) + 'Monto'.padEnd(8) + 'Premio'.padStart(8)).newline()
      builder.bold(false)
      builder.text(separator).newline()

      // Soporte para números más grandes según configuración (por defecto 'large' / doble altura)
      const fontSize = settings.ticketFontSize || 'large'
      const isExtraLarge = fontSize === 'extra-large' || fontSize === 'double'
      const isLarge = fontSize === 'large' || isExtraLarge || !settings.ticketFontSize

      for (const item of (ticket.items || [])) {
        const multiplier = (item as any).multiplier || (item as any).game?.multiplier || 70
        const prize = item.amount * multiplier
        const numStr = (item.number.length === 4 ? formatDateNumber(item.number, true) : item.number)
        const amtStr = item.amount.toFixed(0)
        const prizeStr = prize.toFixed(0)

        const col1 = numStr.padEnd(16)
        const col2 = amtStr.padEnd(8)
        const col3 = prizeStr.padStart(8)

        if (isExtraLarge) {
          builder.bold(true).doubleSize(true)
          builder.text(`${numStr.padEnd(8)}${amtStr.padStart(8)}`).newline()
          builder.doubleSize(false).bold(false)
        } else if (isLarge) {
          // Doble altura (mantiene 32 columnas pero números el doble de altos y en negrita)
          builder.bold(true).doubleHeight(true)
          builder.text(`${col1}${col2}${col3}`)
          builder.doubleHeight(false).bold(false).newline()
        } else {
          builder.text(`${col1}${col2}${col3}`).newline()
        }
      }

      builder.text(separator).newline()

      // 4. TOTAL (Centrado, Doble Altura y Negrita)
      const totalStr = ticket.totalAmount % 1 === 0 
        ? ticket.totalAmount.toFixed(0) 
        : ticket.totalAmount.toFixed(2)

      builder.alignCenter().bold(true).doubleHeight(true)
      builder.text(`TOTAL: ${currency} ${totalStr}`).doubleHeight(false).bold(false).newline()
      builder.newline()

      // 5. TEXTO LEGAL (Centrado)
      builder.text('Valido para 1 sorteo').newline()
      builder.text('Por favor revise su boleto').newline()
      builder.text('Premio valido por 7 dias').newline()
      builder.newline()

      // 6. CÓDIGO QR NATIVO ESC/POS
      builder.qrCode(ticket.ticketNumber || 'LOTERIA', 6)
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

