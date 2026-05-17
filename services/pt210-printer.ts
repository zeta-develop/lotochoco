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
  DOUBLE_SIZE: `${GS}!\x11`,
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
  
  // Encabezado
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += COMMANDS.BOLD_ON;
  receipt += COMMANDS.DOUBLE_SIZE;
  receipt += (settings.businessName || 'LOTERIA').toUpperCase();
  receipt += COMMANDS.FEED_LINE;
  receipt += COMMANDS.NORMAL_SIZE;
  receipt += COMMANDS.BOLD_OFF;
  receipt += 'RECIBO DE VENTA';
  receipt += COMMANDS.FEED_LINE;
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  // Info del Ticket
  receipt += COMMANDS.ALIGN_LEFT;
  receipt += `TICKET: ${ticket.ticketNumber}${COMMANDS.FEED_LINE}`;
  receipt += `FECHA:  ${format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: es })}${COMMANDS.FEED_LINE}`;
  receipt += `HORA:   ${format(new Date(ticket.createdAt), "HH:mm:ss", { locale: es })}${COMMANDS.FEED_LINE}`;
  
  if (ticket.client) {
    receipt += `CLIENTE: ${ticket.client.toUpperCase()}${COMMANDS.FEED_LINE}`;
  }
  
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  // Tabla de Jugadas
  // Columnas: JUEGO (10), NUM (5), PREMIO (15) -> Total 30 + espacios = 32
  receipt += COMMANDS.BOLD_ON;
  receipt += 'JUEGO      NUM       PREMIO'.padEnd(lineWidth);
  receipt += COMMANDS.BOLD_OFF;
  receipt += COMMANDS.FEED_LINE;
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  for (const item of ticket.items) {
    const gameName = (item.game?.name || 'NICA').substring(0, 10).padEnd(10);
    const number = item.number.padStart(5);
    const multiplier = item.game?.multiplier || 70;
    const prize = item.amount * multiplier;
    const prizeStr = `${currency}${prize.toFixed(0)}`.padStart(15);
    
    // Fila 1: Juego, Número y Premio calculado
    receipt += `${gameName}${number}${prizeStr}${COMMANDS.FEED_LINE}`;
    
    // Fila 2: Hora del sorteo e inversión
    const scheduleInfo = ` SORTEO: ${item.schedule}`.padEnd(17);
    const invInfo = `INV: ${currency}${item.amount.toFixed(0)}`.padStart(15);
    receipt += `${scheduleInfo}${invInfo}${COMMANDS.FEED_LINE}`;
    receipt += COMMANDS.FEED_LINE; // Espacio entre items para mejor lectura
  }
  
  receipt += separator;
  receipt += COMMANDS.FEED_LINE;
  
  // Total
  receipt += COMMANDS.ALIGN_RIGHT;
  receipt += COMMANDS.BOLD_ON;
  receipt += COMMANDS.DOUBLE_SIZE;
  receipt += `TOTAL: ${currency}${ticket.totalAmount.toFixed(2)}`;
  receipt += COMMANDS.NORMAL_SIZE;
  receipt += COMMANDS.BOLD_OFF;
  receipt += COMMANDS.FEED_LINE;
  receipt += COMMANDS.FEED_LINE;
  
  // Pie de página
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += settings.ticketMessage || '¡GRACIAS POR SU COMPRA!';
  receipt += COMMANDS.FEED_LINE;
  receipt += 'BUENA SUERTE';
  receipt += COMMANDS.FEED_LINE;
  receipt += '*** CONSERVE SU TICKET ***';
  receipt += COMMANDS.FEED_LINE;
  
  // Feed final
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
