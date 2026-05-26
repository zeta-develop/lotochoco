'use client'

import { useState, useCallback } from 'react'
import { BleDevice } from '@capacitor-community/bluetooth-le'
import { bluetoothService } from '../services/bluetooth.service'
import { toast } from '@/components/ui/use-toast'
import { useSettingsStore } from '../store/settings.store'

export function useBluetooth() {
  const [isScanning, setIsScanning] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [devices, setDevices] = useState<BleDevice[]>([])
  const { settings, updateSetting } = useSettingsStore()

  const scanForDevices = useCallback(async () => {
    try {
      setIsScanning(true)
      setDevices([])
      
      await bluetoothService.scanForPrinters((device) => {
        setDevices((prev) => {
          if (prev.find(d => d.deviceId === device.deviceId)) return prev
          return [...prev, device]
        })
      }, 5000)
      
      toast({ title: 'Búsqueda completada' })
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de Bluetooth',
        description: error instanceof Error ? error.message : 'Verifica que el Bluetooth esté encendido'
      })
    } finally {
      setIsScanning(false)
    }
  }, [])

  const connectDevice = useCallback(async (device: BleDevice) => {
    try {
      setIsConnecting(true)
      
      // Intentar conexión real
      await bluetoothService.connect(device.deviceId)
      
      // Guardar en settings
      updateSetting('bluetoothDeviceId', device.deviceId)
      updateSetting('bluetoothDeviceName', device.name || 'Impresora Genérica')
      updateSetting('printerType', 'bluetooth')
      
      toast({ 
        title: 'Conectado exitosamente',
        description: `Impresora ${device.name || device.deviceId} configurada.`
      })
      
      // Desconectar tras verificar para ahorrar batería
      await bluetoothService.disconnect(device.deviceId)
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de conexión',
        description: 'No se pudo conectar a la impresora'
      })
    } finally {
      setIsConnecting(false)
    }
  }, [updateSetting])

  return {
    isScanning,
    isConnecting,
    devices,
    scanForDevices,
    connectDevice,
    connectedDeviceId: settings.bluetoothDeviceId
  }
}
