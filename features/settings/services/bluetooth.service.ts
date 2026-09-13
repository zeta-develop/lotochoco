import { BleClient, BleDevice, ConnectionPriority } from '@capacitor-community/bluetooth-le'

// Standard UUIDs for Bluetooth Thermal Printers
const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHARACTERISTIC = '00002af1-0000-1000-8000-00805f9b34fb'

export const bluetoothService = {
  isInitialized: false,

  async initialize() {
    if (this.isInitialized) return
    try {
      await BleClient.initialize({ androidNeverForLocation: true })
      this.isInitialized = true
    } catch (error) {
      console.error('Error inicializando Bluetooth:', error)
      throw new Error('No se pudo inicializar el Bluetooth. Verifica los permisos.')
    }
  },

  async requestPermissions() {
    try {
      const isEnabled = await BleClient.isEnabled()
      if (!isEnabled) {
        throw new Error('El Bluetooth está apagado. Por favor enciéndelo.')
      }
    } catch (error) {
      console.error('Error verificando estado Bluetooth:', error)
      throw error
    }
  },

  async scanForPrinters(onDeviceFound: (device: BleDevice) => void, timeoutMs = 5000) {
    await this.initialize()
    await this.requestPermissions()

    return new Promise<void>((resolve, reject) => {
      let isFinished = false
      const finish = () => {
        if (isFinished) return
        isFinished = true
        BleClient.stopLEScan().catch(console.error)
        resolve()
      }

      BleClient.requestLEScan(
        {
          // Filtros vacíos para mostrar absolutamente todos los dispositivos cercanos
        },
        (result) => {
          // Si el dispositivo tiene nombre, lo mostramos
          if (result.device && (result.device.name || result.device.deviceId)) {
            onDeviceFound(result.device)
          }
        }
      ).catch((err) => {
        isFinished = true
        reject(err)
      })

      setTimeout(finish, timeoutMs)
    })
  },

  async connect(deviceId: string) {
    await this.initialize()
    try {
      await BleClient.connect(deviceId)
      // Prioridad alta de conexión BLE (menor latencia de intervalo y máxima velocidad de transmisión)
      try {
        await BleClient.requestConnectionPriority(deviceId, ConnectionPriority.CONNECTION_PRIORITY_HIGH)
      } catch (prioErr) {
        console.warn('requestConnectionPriority no soportado o falló:', prioErr)
      }
    } catch (error) {
      console.error('Error conectando a dispositivo:', error)
      throw new Error('No se pudo establecer la conexión Bluetooth.')
    }
  },

  async disconnect(deviceId: string) {
    try {
      await BleClient.disconnect(deviceId)
    } catch (error) {
      console.warn('Error al desconectar:', error)
    }
  },

  async writeData(deviceId: string, data: Uint8Array) {
    await this.initialize()
    
    // Asegurar prioridad de conexión alta
    try {
      await BleClient.requestConnectionPriority(deviceId, ConnectionPriority.CONNECTION_PRIORITY_HIGH)
    } catch {
      // Ignorar si el dispositivo no soporta cambio de prioridad
    }

    // Buscamos el servicio y característica que soporte escritura
    const services = await BleClient.getServices(deviceId)
    let targetService = ''
    let targetCharacteristic = ''
    let supportsWriteWithoutResponse = false

    for (const service of services) {
      for (const char of service.characteristics) {
        if (char.properties.writeWithoutResponse) {
          targetService = service.uuid
          targetCharacteristic = char.uuid
          supportsWriteWithoutResponse = true
          break
        } else if (char.properties.write && !targetService) {
          targetService = service.uuid
          targetCharacteristic = char.uuid
          supportsWriteWithoutResponse = false
        }
      }
      if (supportsWriteWithoutResponse) break
    }

    if (!targetService || !targetCharacteristic) {
      throw new Error('La impresora no tiene servicios de escritura compatibles.')
    }

    // Negociación dinámica de MTU para BLE:
    // En Android, BleClient solicita MTU 512 al conectar. Si la impresora lo soporta,
    // podemos enviar paquetes de hasta 240 bytes. Si no, usamos el estándar de 20 bytes.
    let chunkSize = 20
    try {
      const mtu = await BleClient.getMtu(deviceId)
      if (mtu && mtu > 23) {
        // Reservar 3 bytes para encabezado ATT (GATT)
        chunkSize = Math.max(20, Math.min(240, mtu - 3))
      }
    } catch {
      chunkSize = 20
    }

    let bytesSentSincePause = 0
    // Si el MTU es alto, pausamos tras cada paquete.
    // Si el MTU es de 20 bytes, transmitimos ráfagas de 100 bytes (5 paquetes) antes de una pausa breve,
    // evitando la penalización de ~16ms que impone setTimeout en el WebView de Android en cada micro-paquete.
    const PAUSE_THRESHOLD = chunkSize > 50 ? chunkSize : 100

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      
      const buffer = new ArrayBuffer(chunk.length)
      const view = new DataView(buffer)
      for (let j = 0; j < chunk.length; j++) {
        view.setUint8(j, chunk[j])
      }

      if (supportsWriteWithoutResponse) {
        try {
          await BleClient.writeWithoutResponse(deviceId, targetService, targetCharacteristic, view)
        } catch {
          // En caso de buffer lleno temporal en Android, pausar brevemente y reintentar
          await new Promise(resolve => setTimeout(resolve, 15))
          try {
            await BleClient.writeWithoutResponse(deviceId, targetService, targetCharacteristic, view)
          } catch {
            await BleClient.write(deviceId, targetService, targetCharacteristic, view)
          }
        }
      } else {
        await BleClient.write(deviceId, targetService, targetCharacteristic, view)
      }
      
      bytesSentSincePause += chunk.length
      if (bytesSentSincePause >= PAUSE_THRESHOLD) {
        bytesSentSincePause = 0
        await new Promise(resolve => setTimeout(resolve, 6))
      }
    }
  }
}
