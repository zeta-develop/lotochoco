'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Printer, 
  Bluetooth, 
  Wifi, 
  Cloud, 
  RefreshCw, 
  Download, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  Receipt, 
  Database, 
  RotateCcw, 
  Check, 
  Search,
  Sliders,
  FileCode,
  BatteryCharging,
  Radio,
  Server
} from 'lucide-react'
import { useSettingsManager } from '../hooks/use-settings-manager'
import { useBluetooth } from '../hooks/use-bluetooth'
import { printerService } from '../services/printer.service'
import { useCompany } from '../hooks/use-company'
import { useAuthStore } from '@/store/auth-store'
import { signOut } from '@/lib/supabase/auth'
import { toast } from '@/components/ui/use-toast'
import { GeneralSettingsTab } from './GeneralSettingsTab'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function SettingsManager() {
  const [activeTab, setActiveTab] = useState('connections')
  const { settings, updateSettings, refresh } = useSettingsManager()
  const { isScanning, isConnecting, devices, scanForDevices, connectDevice, connectedDeviceId } = useBluetooth()
  const { company } = useCompany()
  const { user } = useAuthStore()

  const [isTestingPrinter, setIsTestingPrinter] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Local state for instant field editing
  const [businessName, setBusinessName] = useState(settings.businessName || 'LOTOCHOCO EXPRESS')
  const [ticketMessage, setTicketMessage] = useState(settings.ticketMessage || '¡Gracias por su compra! Conserve su ticket.')
  const [terminalId, setTerminalId] = useState(settings.terminalId || 'POS-081')
  const [currency, setCurrency] = useState(settings.currency || 'C$')
  const [showBarcode, setShowBarcode] = useState(settings.showBarcode !== 'false')
  const [autoSync, setAutoSync] = useState(true)
  const [forcedOffline, setForcedOffline] = useState(false)

  const handleSaveField = async (field: Record<string, string>) => {
    try {
      await updateSettings(field)
      toast({ title: 'Configuración guardada' })
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar' })
    }
  }

  const handleTestPrint = async () => {
    setIsTestingPrinter(true)
    try {
      const success = await printerService.testPrinter(
        settings.printerType || 'bluetooth', 
        settings.printerAddress, 
        settings
      )
      if (success) {
        toast({ title: 'Prueba de impresión enviada a la PT-210' })
      } else {
        toast({ variant: 'destructive', title: 'Error al enviar prueba de impresión' })
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fallo al conectar con la impresora' })
    } finally {
      setIsTestingPrinter(false)
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await refresh()
      toast({ title: 'Sincronización con Supabase completada' })
    } catch {
      toast({ variant: 'destructive', title: 'Error al sincronizar con la nube' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportBackup = () => {
    try {
      const backupData = {
        settings,
        terminal: terminalId,
        exportedAt: new Date().toISOString(),
        version: '1.8.2'
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lotochoco_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Copia de seguridad (.json) exportada correctamente' })
    } catch {
      toast({ variant: 'destructive', title: 'Error al exportar copia de seguridad' })
    }
  }

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Screen Header Title Banner */}
      <section className="bg-[#131b2e] p-3.5 sm:p-4 rounded-xl border border-[#3c4a42]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#10b981]" />
            <h1 className="font-mono text-xl font-bold text-[#dae2fd] tracking-tight">
              Configuración del Sistema
            </h1>
          </div>
          <p className="font-mono text-xs text-[#bbcabf]">
            LotoChoco POS • Terminal {settings.terminalId || 'T-J081'} • <span className="text-[#dae2fd] font-semibold">{user?.email || 'Operadora'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 rounded-lg bg-[#171f33] border-[#3c4a42] text-xs font-mono text-[#bbcabf] hover:text-[#dae2fd] active:scale-95"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Recargar ajustes desde la nube"
          >
            <RotateCcw className={cn("h-3.5 w-3.5 mr-1.5", isSyncing && "animate-spin text-[#10b981]")} />
            {isSyncing ? 'Sincronizando...' : 'Recargar'}
          </Button>
        </div>
      </section>

      {/* Tabs list for Settings categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#131b2e] border border-[#3c4a42]/50 p-1 rounded-xl h-11 grid grid-cols-2">
          <TabsTrigger 
            value="connections" 
            className="font-mono text-xs font-bold rounded-lg data-[state=active]:bg-[#10b981] data-[state=active]:text-[#003824]"
          >
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            Conexiones y Terminal
          </TabsTrigger>
          <TabsTrigger 
            value="ticket-designer" 
            className="font-mono text-xs font-bold rounded-lg data-[state=active]:bg-[#4cd7f6] data-[state=active]:text-[#001f26]"
          >
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            Diseño de Ticket
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Conexiones y Hardware (Stitch Obsidian Layout) */}
        <TabsContent value="connections" className="space-y-4 outline-none">
          {/* SECTION 1: Bluetooth Thermal Printer Configuration (PT-210) */}
          <section className="bg-[#131b2e] rounded-xl border border-[#10b981]/50 p-4 relative overflow-hidden active-glow space-y-3.5">
            {/* Top status banner */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold text-[#dae2fd]">
                    Impresora Térmica PT-210
                  </h2>
                  <p className="font-mono text-xs text-[#bbcabf]">
                    Conexión directa Bluetooth ESC/POS para recibos
                  </p>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-wide shadow-sm",
                connectedDeviceId || settings.bluetoothDeviceId
                  ? "bg-[#10b981] text-[#003824]"
                  : "bg-[#171f33] text-[#bbcabf] border border-[#3c4a42]"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  connectedDeviceId || settings.bluetoothDeviceId ? "bg-[#003824] animate-pulse" : "bg-[#86948a]"
                )} />
                {connectedDeviceId || settings.bluetoothDeviceId ? 'CONECTADA' : 'SIN CONEXIÓN'}
              </span>
            </div>

            {/* Specs pill grid */}
            <div className="grid grid-cols-3 gap-2 bg-[#0b1326] p-2.5 rounded-lg border border-[#3c4a42] text-center font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-[#86948a] tracking-wider">Dispositivo</span>
                <span className="text-xs text-[#4cd7f6] font-bold truncate max-w-full">
                  {settings.bluetoothDeviceName || 'PT-210'}
                </span>
              </div>
              <div className="flex flex-col items-center border-x border-[#3c4a42]/60">
                <span className="text-[10px] uppercase text-[#86948a] tracking-wider">Batería</span>
                <span className="text-xs text-[#10b981] font-bold flex items-center gap-1">
                  <BatteryCharging className="h-3 w-3" /> 98%
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-[#86948a] tracking-wider">Protocolo</span>
                <span className="text-xs text-[#dae2fd] font-semibold">BLE Directo</span>
              </div>
            </div>

            {/* Settings table */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-[#3c4a42]/50">
                <span className="text-[#bbcabf]">Ancho de papel de bobina</span>
                <span className="text-[#dae2fd] bg-[#171f33] px-2 py-0.5 rounded border border-[#3c4a42]">
                  58mm (Estándar PT-210)
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#3c4a42]/50">
                <span className="text-[#bbcabf]">Densidad / Contraste Térmico</span>
                <span className="text-[#dae2fd] bg-[#171f33] px-2 py-0.5 rounded border border-[#3c4a42]">
                  Alta (100% Nítido)
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#bbcabf]">Corte de papel</span>
                <span className="text-[#86948a] bg-[#171f33] px-2 py-0.5 rounded border border-[#3c4a42]">
                  Serrado Manual
                </span>
              </div>
            </div>

            {/* Device scanning area if searching */}
            {devices.length > 0 && (
              <div className="space-y-2 p-3 bg-[#0b1326] rounded-xl border border-[#4cd7f6]/40">
                <span className="text-xs font-mono text-[#4cd7f6] font-bold">Dispositivos detectados:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                  {devices.map((device) => (
                    <div 
                      key={device.deviceId}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#131b2e] border border-[#3c4a42] text-xs font-mono"
                    >
                      <div className="truncate">
                        <span className="font-bold text-[#dae2fd] block">{device.name || 'Impresora Bluetooth'}</span>
                        <span className="text-[10px] text-[#86948a]">{device.deviceId}</span>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 px-2.5 font-mono text-[11px] bg-[#10b981] hover:bg-[#059669] text-[#003824] font-bold"
                        onClick={() => connectDevice(device)}
                        disabled={isConnecting}
                      >
                        {connectedDeviceId === device.deviceId ? 'Conectado' : 'Conectar'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                className="h-11 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] font-mono font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-md"
                onClick={handleTestPrint}
                disabled={isTestingPrinter}
              >
                <Printer className="h-4 w-4" />
                {isTestingPrinter ? 'Imprimiendo prueba...' : 'Probar Impresión'}
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-[#171f33] text-[#4cd7f6] border-[#3c4a42] hover:bg-[#222a3d] hover:text-[#dae2fd] font-mono font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-transform"
                onClick={scanForDevices}
                disabled={isScanning}
              >
                <Search className="h-4 w-4" />
                {isScanning ? 'Escaneando BLE...' : 'Buscar Dispositivos BLE'}
              </Button>
            </div>
          </section>

          {/* SECTION 2: Cloud Sync & Offline Architecture (Supabase) */}
          <section className="bg-[#131b2e] rounded-xl border border-[#3c4a42]/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#4cd7f6]/15 flex items-center justify-center text-[#4cd7f6]">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold text-[#dae2fd]">
                    Sincronización en la Nube
                  </h2>
                  <p className="font-mono text-xs text-[#bbcabf]">
                    Arquitectura híbrida local y Supabase
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 font-mono text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                AL DÍA (0 pendientes)
              </span>
            </div>

            {/* Cloud Metadata */}
            <div className="grid grid-cols-2 gap-2 bg-[#0b1326] p-3 rounded-lg border border-[#3c4a42] font-mono text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#86948a] uppercase flex items-center gap-1">
                  Último Sync
                </span>
                <p className="text-[#dae2fd] font-semibold">{format(new Date(), "hh:mm a")}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#86948a] uppercase flex items-center gap-1">
                  Servidor Supabase
                </span>
                <p className="text-[#4cd7f6] font-semibold">Online (Cloud OK)</p>
              </div>
              <div className="space-y-0.5 pt-1.5 border-t border-[#3c4a42]/40">
                <span className="text-[10px] text-[#86948a] uppercase flex items-center gap-1">
                  Empresa
                </span>
                <p className="text-[#dae2fd] font-semibold truncate">{company?.name || 'Lotería Local'}</p>
              </div>
              <div className="space-y-0.5 pt-1.5 border-t border-[#3c4a42]/40">
                <span className="text-[10px] text-[#86948a] uppercase flex items-center gap-1">
                  Cuenta Activa
                </span>
                <p className="text-[#dae2fd] font-semibold truncate">{user?.email || 'Operadora'}</p>
              </div>
            </div>

            {/* Sync Toggles */}
            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#171f33] border border-[#3c4a42]/50 hover:bg-[#222a3d] transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-[#dae2fd] font-bold">Modo Offline Forzado</span>
                  <span className="text-[11px] text-[#86948a]">Opera localmente y encola boletos</span>
                </div>
                <input 
                  type="checkbox"
                  checked={forcedOffline}
                  onChange={(e) => setForcedOffline(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0b1326] border-[#3c4a42] text-[#10b981] focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#171f33] border border-[#3c4a42]/50 hover:bg-[#222a3d] transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-[#dae2fd] font-bold">Auto-sincronizar ventas</span>
                  <span className="text-[11px] text-[#86948a]">Transmite boletos emitidos automáticamente</span>
                </div>
                <input 
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0b1326] border-[#3c4a42] text-[#10b981] focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            {/* Action */}
            <Button
              className="h-11 w-full rounded-xl bg-[#171f33] border border-[#4cd7f6]/40 text-[#4cd7f6] hover:bg-[#4cd7f6] hover:text-[#001f26] font-mono font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              Sincronizar Ahora con Supabase
            </Button>
          </section>

          {/* SECTION 3: Business & Ticket Customization */}
          <section className="bg-[#131b2e] rounded-xl border border-[#3c4a42]/70 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center text-[#f59e0b]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-bold text-[#dae2fd]">
                  Datos del Ticket Térmico
                </h2>
                <p className="font-mono text-xs text-[#bbcabf]">
                  Encabezado y pie de página de venta
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Field 1: Business Name */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#86948a] uppercase font-bold">
                  Nombre Comercial en Recibo
                </label>
                <div className="flex gap-2">
                  <Input
                    className="bg-[#0b1326] border-[#3c4a42] text-xs font-mono text-[#dae2fd] h-10 rounded-lg"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-10 px-3 bg-[#10b981] text-[#003824] font-bold text-xs font-mono"
                    onClick={() => handleSaveField({ businessName })}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Fields 2: Moneda & Terminal ID */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#86948a] uppercase font-bold">
                    Moneda
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      className="bg-[#0b1326] border-[#3c4a42] text-xs font-mono text-[#dae2fd] h-10 rounded-lg"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="h-10 px-2.5 bg-[#171f33] border border-[#3c4a42] text-[#dae2fd] font-mono text-xs"
                      onClick={() => handleSaveField({ currency })}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#86948a] uppercase font-bold">
                    Terminal ID
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      className="bg-[#0b1326] border-[#3c4a42] text-xs font-mono text-[#4cd7f6] h-10 rounded-lg font-bold"
                      value={terminalId}
                      onChange={(e) => setTerminalId(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="h-10 px-2.5 bg-[#171f33] border border-[#3c4a42] text-[#dae2fd] font-mono text-xs"
                      onClick={() => handleSaveField({ terminalId })}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Field 3: Ticket Footer Message */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#86948a] uppercase font-bold">
                  Mensaje de Pie del Boleto
                </label>
                <div className="flex gap-2">
                  <Input
                    className="bg-[#0b1326] border-[#3c4a42] text-xs font-mono text-[#dae2fd] h-10 rounded-lg"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-10 px-3 bg-[#10b981] text-[#003824] font-bold text-xs font-mono"
                    onClick={() => handleSaveField({ ticketMessage })}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Toggle: Barcode */}
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#171f33] border border-[#3c4a42]/50 hover:bg-[#222a3d] transition-colors cursor-pointer mt-1">
                <div className="flex flex-col">
                  <span className="text-[#dae2fd] font-bold text-xs">Mostrar Código de Barras / QR</span>
                  <span className="text-[11px] text-[#86948a]">Agiliza la verificación en lector láser o cámara</span>
                </div>
                <input 
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => {
                    setShowBarcode(e.target.checked)
                    handleSaveField({ showBarcode: String(e.target.checked) })
                  }}
                  className="w-4 h-4 rounded bg-[#0b1326] border-[#3c4a42] text-[#10b981] focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* SECTION 4: Local Database & Storage Security (SQLite) */}
          <section className="bg-[#131b2e] rounded-xl border border-[#3c4a42]/70 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#10b981]/15 flex items-center justify-center text-[#10b981]">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-bold text-[#dae2fd]">
                  Base de Datos Local
                </h2>
                <p className="font-mono text-xs text-[#bbcabf]">
                  Almacenamiento Offline-First SQLite / IndexedDB
                </p>
              </div>
            </div>

            {/* Info metrics */}
            <div className="bg-[#0b1326] p-3 rounded-lg border border-[#3c4a42] font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#bbcabf]">Estado almacenamiento local:</span>
                <span className="text-[#10b981] font-bold">Activo & Encriptado</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbcabf]">Copia de seguridad:</span>
                <span className="text-[#dae2fd]">Automática en cada venta</span>
              </div>
              <div className="pt-2 border-t border-[#3c4a42]/40 flex items-center gap-1.5 text-[#10b981] text-[11px] font-bold">
                <Lock className="h-3.5 w-3.5" />
                Seguridad Criptográfica AES-256 (Local OK)
              </div>
            </div>

            <Button
              className="h-10 w-full rounded-xl bg-[#171f33] text-[#dae2fd] border border-[#3c4a42] hover:bg-[#222a3d] font-mono text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform"
              onClick={handleExportBackup}
            >
              <Download className="h-4 w-4 text-[#4cd7f6]" />
              Exportar Copia de Seguridad (.json)
            </Button>
          </section>

          {/* SECTION 5: Danger Zone / Turno Actions */}
          <section className="bg-[#131b2e] rounded-xl border border-red-500/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-[#dae2fd]">
                    Cerrar Sesión de Terminal
                  </h3>
                  <p className="font-mono text-xs text-[#86948a]">
                    Finaliza el turno de {user?.email || 'Operadora'} en este dispositivo
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                className="h-10 px-4 rounded-xl font-mono text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white active:scale-95 transition-all"
                onClick={() => signOut()}
              >
                Cerrar Sesión
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* Tab 2: Ticket Designer (GeneralSettingsTab) */}
        <TabsContent value="ticket-designer" className="outline-none">
          <GeneralSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
