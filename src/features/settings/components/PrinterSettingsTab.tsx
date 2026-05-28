'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bluetooth, Wifi, TestTube, Search, CheckCircle2 } from 'lucide-react'
import { useSettingsManager } from '../hooks/use-settings-manager'
import { useBluetooth } from '../hooks/use-bluetooth'
import { printerService } from '../services/printer.service'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

export function PrinterSettingsTab() {
  const { settings, updateSettings } = useSettingsManager()
  const { isScanning, isConnecting, devices, scanForDevices, connectDevice, connectedDeviceId } = useBluetooth()
  const [isTesting, setIsTesting] = useState(false)

  const handleTestPrinter = async () => {
    setIsTesting(true)
    try {
      const success = await printerService.testPrinter(settings.printerType, settings.printerAddress, settings)
      if (success) {
        toast({ title: 'Prueba enviada correctamente' })
      } else {
        toast({ variant: 'destructive', title: 'Error en la prueba de impresión' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: String(error) })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
      <CardHeader className="relative">
        <CardTitle>Configuración de Impresión</CardTitle>
        <CardDescription>
          Conecta tu impresora térmica Bluetooth (ej. PT-210) o de Red.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        <div className="space-y-2">
          <Label>Tipo de Conexión</Label>
          <Select
            value={settings.printerType || 'network'}
            onValueChange={(v) => updateSettings({ printerType: v })}
          >
            <SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50 transition-all">
              <SelectValue placeholder="Selecciona el tipo de impresora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bluetooth">
                <div className="flex items-center">
                  <Bluetooth className="h-4 w-4 mr-2" />
                  Impresora Bluetooth (PT-210, genéricas)
                </div>
              </SelectItem>
              <SelectItem value="network">
                <div className="flex items-center">
                  <Wifi className="h-4 w-4 mr-2" />
                  Impresora de Red / Wi-Fi
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.printerType === 'bluetooth' && (
          <div className="space-y-4 p-5 border border-white/10 rounded-2xl bg-muted/20 backdrop-blur-sm shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Label>Dispositivos Bluetooth</Label>
                <p className="text-xs text-muted-foreground mt-1">Asegúrate de que la impresora esté encendida.</p>
              </div>
              <Button onClick={scanForDevices} disabled={isScanning} size="sm">
                <Search className="mr-2 h-4 w-4" />
                {isScanning ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            {devices.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {devices.map((device) => (
                  <div key={device.deviceId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-background/60 border border-white/5 rounded-xl gap-3 hover:bg-background/80 transition-colors shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{device.name || 'Dispositivo Desconocido'}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{device.deviceId}</p>
                    </div>
                    <Button 
                      variant={connectedDeviceId === device.deviceId ? 'default' : 'outline'}
                      size="sm"
                      disabled={isConnecting}
                      onClick={() => connectDevice(device)}
                    >
                      {connectedDeviceId === device.deviceId ? (
                        <><CheckCircle2 className="mr-2 h-4 w-4"/>Seleccionada</>
                      ) : 'Conectar'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {connectedDeviceId && (
              <div className="mt-4 text-sm font-semibold text-primary flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Impresora actual: {settings.bluetoothDeviceName}
              </div>
            )}
          </div>
        )}

        {settings.printerType === 'network' && (
          <div className="space-y-2">
            <Label>Dirección IP de la Impresora</Label>
            <Input 
              value={settings.printerAddress || ''} 
              onChange={(e) => updateSettings({ printerAddress: e.target.value })} 
              placeholder="192.168.1.100" 
              className="bg-background/50 border-white/10 focus:border-primary/50 transition-all"
            />
          </div>
        )}

        <Button type="button" variant="outline" onClick={handleTestPrinter} disabled={isTesting}>
          <TestTube className="h-4 w-4 mr-2" />
          {isTesting ? "Imprimiendo..." : "Prueba de Impresión"}
        </Button>
      </CardContent>
    </Card>
  )
}
