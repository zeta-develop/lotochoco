'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettings } from '@/hooks/use-settings'
import { toast } from 'sonner'

export function PrinterSettings() {
  const { settings, updateSettings } = useSettings()
  const [printerType, setPrinterType] = useState('')
  const [printerAddress, setPrinterAddress] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPrinterType(settings?.printerType || 'browser')
    setPrinterAddress(settings?.printerAddress || '')
  }, [settings])

  const handleSave = async () => {
    if (!printerType) {
      toast.error('Selecciona un tipo de impresora')
      return
    }

    if ((printerType === 'network' || printerType === 'thermal') && !printerAddress) {
      toast.error('Ingresa la dirección IP o nombre de impresora')
      return
    }

    setSaving(true)
    try {
      await updateSettings({ printerType, printerAddress })
      toast.success('Configuración de impresora guardada')
    } catch (err) {
      toast.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de impresora</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Tipo de impresora</label>
          <Select onValueChange={(v) => setPrinterType(v)} value={printerType}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">Navegador (HTML)</SelectItem>
              <SelectItem value="network">Red (ESC/POS vía proxy)</SelectItem>
              <SelectItem value="native">Nativa (diálogo)</SelectItem>
              <SelectItem value="thermal">Térmica (raw/ESC-POS)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm mb-1">Dirección / IP (si aplica)</label>
          <Input value={printerAddress} onChange={(e) => setPrinterAddress(e.target.value)} placeholder="192.168.1.100" />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PrinterSettings
