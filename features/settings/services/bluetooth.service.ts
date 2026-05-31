import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le'

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
    
    // Necesitamos descubrir el servicio y la característica correcta si no la conocemos.
    // Para impresoras genéricas (PT-210, etc) suelen usar la misma.
    // Buscaremos el servicio que tenga características de escritura.
    
    const services = await BleClient.getServices(deviceId)
    let targetService = ''
    let targetCharacteristic = ''

    for (const service of services) {
      for (const char of service.characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          targetService = service.uuid
          targetCharacteristic = char.uuid
          break
        }
      }
      if (targetService) break
    }

    if (!targetService || !targetCharacteristic) {
      throw new Error('La impresora no tiene servicios de escritura compatibles.')
    }

    // Dividimos en chunks pequeños (20 bytes es el estándar seguro para BLE sin negociación de MTU)
    const CHUNK_SIZE = 20
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE)
      
      const buffer = new ArrayBuffer(chunk.length)
      const view = new DataView(buffer)
      for (let j = 0; j < chunk.length; j++) {
        view.setUint8(j, chunk[j])
      }

      // Escribir sin respuesta suele ser más rápido y compatible con impresoras
      try {
        await BleClient.writeWithoutResponse(deviceId, targetService, targetCharacteristic, view)
      } catch (e) {
        // Si falla sin respuesta, intentar con respuesta (algunas impresoras lo requieren)
        await BleClient.write(deviceId, targetService, targetCharacteristic, view)
      }
      
      // Pequeña pausa para no saturar el buffer de la impresora
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
  }
}
