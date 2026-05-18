import { BleClient } from '@capacitor-community/bluetooth-le';
import type { Ticket, TicketItem, CashSession } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// UUIDs estándar para impresoras térmicas Bluetooth (PT-210)
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Comandos ESC/POS
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  NORMAL_SIZE: `${GS}!\x00`,
  DOUBLE_HEIGHT: `${GS}!\x01`,
  DOUBLE_WIDTH: `${GS}!\x10`,
  DOUBLE_SIZE: `${GS}!\x11`,
  QUAD_SIZE: `${GS}!\x22`,
  FONT_A: `${ESC}M\x00`,
  FONT_B: `${ESC}M\x01`,
  FEED_LINE: '\x0A',
  FEED_PAPER: `${ESC}d\x04`,
};

function repeatChar(char: string, count: number): string {
  return char.repeat(count);
}

/**
 * Genera el contenido ESC/POS optimizado para PT-210 (58mm / 32 chars)
 */
export function generatePT210Receipt(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
  settings: Record<string, string>
): string {
  const lineWidth = 32;
  const separator = repeatChar('-', lineWidth);
  const currency = settings.currency || 'C$';
  
  let receipt = '';
  receipt += COMMANDS.INIT;
  
  // Fuente A (Estandar 12x24, 32 chars en 58mm)
  receipt += COMMANDS.FONT_A;
  
  // Encabezado
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += COMMANDS.BOLD_ON;
  
  // Nombre del negocio (limitar a 32 chars o usar double size si es corto)
  const businessName = (settings.businessName || 'LOTERIA').toUpperCase();
  if (businessName.length <= 16) {
    receipt += COMMANDS.DOUBLE_SIZE;
    receipt += businessName;
    receipt += COMMANDS.NORMAL_SIZE;
  } else {
    receipt += businessName.substring(0, lineWidth);
  }
  receipt += COMMANDS.FEED_LINE;
  
  receipt += COMMANDS.BOLD_OFF;
  receipt += 'RECIBO DE VENTA';
  receipt += COMMANDS.FEED_LINE;
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  // Info del Ticket
  receipt += COMMANDS.ALIGN_LEFT;
  receipt += `TICKET: ${ticket.ticketNumber}\n`;
  receipt += `FECHA:  ${format(new Date(ticket.createdAt), "dd/MM/yy HH:mm")}\n`;
  
  if (ticket.client) {
    receipt += `CLIENTE: ${ticket.client.toUpperCase().substring(0, 23)}\n`;
  }
  
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  // Cuerpo del Ticket (Jugadas)
  for (const item of ticket.items) {
    const gameName = (item.game?.name || 'JUEGO').toUpperCase();
    const number = item.number;
    const amount = `${currency}${item.amount.toFixed(0)}`;
    const multiplier = item.game?.multiplier || 70;
    const prize = `${currency}${(item.amount * multiplier).toFixed(0)}`;

    // Línea 1: JUEGO y HORARIO
    receipt += COMMANDS.BOLD_ON;
    receipt += `${gameName} (${item.schedule})\n`;
    receipt += COMMANDS.BOLD_OFF;

    // Línea 2: NUMERO, VALOR y PREMIO bien alineados
    // NUM: 00 (7) | VAL: 100 (10) | PRE: 7000 (15) = 32
    const numPart = `NUM:${number}`.padEnd(7);
    const valPart = `VAL:${amount}`.padEnd(10);
    const prePart = `PRE:${prize}`.padStart(15);
    
    receipt += numPart + valPart + prePart + '\n';
    receipt += COMMANDS.FEED_LINE;
  }
  
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  // Total
  receipt += COMMANDS.ALIGN_RIGHT;
  receipt += COMMANDS.BOLD_ON;
  receipt += COMMANDS.DOUBLE_HEIGHT;
  receipt += `TOTAL: ${currency}${ticket.totalAmount.toFixed(2)}\n`;
  receipt += COMMANDS.NORMAL_SIZE;
  receipt += COMMANDS.BOLD_OFF;
  
  receipt += COMMANDS.FEED_LINE;
  
  // Pie de página
  receipt += COMMANDS.ALIGN_CENTER;
  const msg = settings.ticketMessage || '¡GRACIAS POR SU COMPRA!';
  receipt += msg.substring(0, lineWidth) + '\n';
  receipt += 'BUENA SUERTE\n';
  receipt += '*** CONSERVE SU TICKET ***\n';
  
  // Espacio para corte
  receipt += COMMANDS.FEED_PAPER;
  receipt += COMMANDS.FEED_PAPER;
  
  return receipt;
}

/**
 * Impresión directa vía Bluetooth LE (sin RawBT)
 */
export async function printDirect(deviceId: string, data: string): Promise<{ success: boolean; message: string }> {
  try {
    await BleClient.initialize();
    await BleClient.connect(deviceId);

    // Codificación a bytes (PT-210 suele usar CP437 o similar, pero UTF-8 básico funciona para texto simple)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    // Enviar en trozos (MTU limitado en Bluetooth LE)
    const CHUNK_SIZE = 20;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      await BleClient.write(deviceId, PRINTER_SERVICE_UUID, PRINTER_CHARACTERISTIC_UUID, new DataView(chunk.buffer));
    }

    await BleClient.disconnect(deviceId);
    return { success: true, message: 'Impreso correctamente' };
  } catch (error) {
    console.error('Error en impresión directa:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Error al imprimir' };
  }
}
