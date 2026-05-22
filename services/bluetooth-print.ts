import { BleClient } from '@capacitor-community/bluetooth-le';

// UUIDs estándar para impresoras térmicas Bluetooth (PT-210 usa estos por defecto)
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export async function printDirectBluetooth(deviceId: string, data: string): Promise<{ success: boolean; message: string }> {
  try {
    await BleClient.initialize();

    // Conectar al dispositivo
    await BleClient.connect(deviceId, (status) => {
      console.log(`Dispositivo ${deviceId} desconectado:`, status);
    });

    // PT-210 usualmente usa ESC/POS. Necesitamos convertir el string a bytes (Uint8Array)
    // Usamos Windows-1252 para caracteres especiales latinos comunes en impresoras térmicas
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    // Enviar por partes (MTU de Bluetooth suele ser limitado)
    const CHUNK_SIZE = 20; 
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      await BleClient.write(deviceId, PRINTER_SERVICE_UUID, PRINTER_CHARACTERISTIC_UUID, new DataView(chunk.buffer));
    }

    await BleClient.disconnect(deviceId);
    return { success: true, message: 'Impresión enviada correctamente' };
  } catch (error) {
    console.error('Error en impresión Bluetooth nativa:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido al imprimir' 
    };
  }
}

export async function scanPrinters(): Promise<any[]> {
  try {
    await BleClient.initialize();
    const devices: any[] = [];
    
    await BleClient.requestLEScan(
      {
        services: [PRINTER_SERVICE_UUID],
      },
      (result) => {
        if (result.device.name) {
          devices.push(result.device);
        }
      }
    );

    // Esperar 3 segundos de escaneo
    await new Promise(resolve => setTimeout(resolve, 3000));
    await BleClient.stopLEScan();
    
    return devices;
  } catch (error) {
    console.error('Error al escanear impresoras:', error);
    return [];
  }
}
