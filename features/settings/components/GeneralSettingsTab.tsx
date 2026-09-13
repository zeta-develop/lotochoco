'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSettingsManager } from '../hooks/use-settings-manager'
import { useCompany } from '../hooks/use-company'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, Info, Eye, Sun, Moon, Monitor, Printer, Receipt, Sliders, RefreshCw, QrCode, Bold } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { DEFAULT_TICKET_TEMPLATE, MOCK_PREVIEW_TICKET } from '../utils/ticket-template'
import { TicketBodyView } from './TicketBodyView'

export function GeneralSettingsTab() {
  const { settings, updateSettings } = useSettingsManager()
  const { isOwner, role, updateCompanyName } = useCompany()

  // Estado local para evitar latencia al escribir
  const [localBusinessName, setLocalBusinessName] = useState(settings.businessName || '')

  // Sincronizar estado local cuando cargan los ajustes
  useEffect(() => {
    if (settings.businessName !== undefined) {
      setLocalBusinessName(settings.businessName)
    }
  }, [settings.businessName])

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleUpdateBusinessName = (name: string) => {
    setLocalBusinessName(name)
    
    // Limpiar timer previo
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Programar nuevo guardado
    debounceTimerRef.current = setTimeout(async () => {
      // 1. Actualizar en settings (local/Supabase settings)
      await updateSettings({ businessName: name })
      
      // 2. Sincronizar con la tabla companies
      if (isOwner) {
        await updateCompanyName(name)
      }
    }, 1000)
  }

  const { theme, setTheme } = useTheme()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  // Por defecto abrimos directamente en 'template' para que el usuario acceda de inmediato al editor
  const [activeEditorTab, setActiveTab] = useState<'info' | 'template'>('template')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Estado local para el editor del ticket
  const cleanTemplate = (t: string | undefined | null): string => {
    if (!t || !t.trim() || t.includes('RECIBO DE VENTA') || t.includes('JUEGO      NUM       MONTO')) {
      return DEFAULT_TICKET_TEMPLATE
    }
    let cleaned = t
    if (cleaned.includes('{{number}}') && cleaned.includes('{{amount}}') && !cleaned.includes('  {{amount}}') && !cleaned.includes('    {{amount}}')) {
      cleaned = cleaned.replace(/{{#items}}[\s\S]*?{{\/items}}/i, `{{#items}}\n  {{number}}    {{amount}}   {{prize}}\n{{/items}}`)
    }
    if (/apuesta\s+monto\s+premio/i.test(cleaned) && !cleaned.includes('   Apuesta')) {
      cleaned = cleaned.replace(/apuesta\s+monto\s+premio/i, '   Apuesta       Monto    Premio')
    }
    return cleaned
  }

  const [localTemplate, setLocalTemplate] = useState(cleanTemplate(settings.ticketTemplate))
  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar cuando cambian los settings
  useEffect(() => {
    const t = settings.ticketTemplate
    if (t && t.trim()) {
      setLocalTemplate(cleanTemplate(t))
    } else {
      setLocalTemplate(DEFAULT_TICKET_TEMPLATE)
    }
  }, [settings.ticketTemplate])

  const alignColumnsCenter = () => {
    let t = localTemplate
    t = t.replace(/.*apuesta.*monto.*premio.*/i, '   Apuesta       Monto    Premio')
    t = t.replace(/{{#items}}[\s\S]*?{{\/items}}/i, `{{#items}}\n  {{number}}    {{amount}}   {{prize}}\n{{/items}}`)
    setLocalTemplate(t)
    toast({ title: 'Columnas alineadas y centradas' })
  }

  const toggleBold = () => {
    const textarea = document.getElementById('ticketTemplate') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const text = localTemplate

    if (start === end) {
      // Si no hay texto seleccionado, insertar **** y colocar el cursor en medio
      const newText = text.substring(0, start) + '****' + text.substring(end)
      setLocalTemplate(newText)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + 2, start + 2)
      }, 50)
      return
    }

    const selectedText = text.substring(start, end)
    let newText = ''
    let newStart = start
    let newEnd = end

    if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
      // Quitar negritas del texto seleccionado
      const unwrapped = selectedText.slice(2, -2)
      newText = text.substring(0, start) + unwrapped + text.substring(end)
      newEnd = start + unwrapped.length
    } else if (
      start >= 2 &&
      end <= text.length - 2 &&
      text.substring(start - 2, start) === '**' &&
      text.substring(end, end + 2) === '**'
    ) {
      // Quitar asteriscos exteriores
      newText = text.substring(0, start - 2) + selectedText + text.substring(end + 2)
      newStart = start - 2
      newEnd = end - 2
    } else {
      // Poner negritas al texto seleccionado
      const wrapped = `**${selectedText}**`
      newText = text.substring(0, start) + wrapped + text.substring(end)
      newEnd = start + wrapped.length
    }

    setLocalTemplate(newText)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newStart, newEnd)
    }, 50)
  }

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true)
      await updateSettings({ ticketTemplate: localTemplate })
      toast({ title: 'Diseño guardado correctamente' })
    } catch (error) {
      console.error('Error al guardar diseño de ticket:', error)
      toast({ variant: 'destructive', title: 'Error al guardar diseño' })
    } finally {
      setIsSaving(false)
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('ticketTemplate') as HTMLTextAreaElement
    let insertText = variable
    if (!variable.startsWith('[') && !variable.startsWith('{{')) {
      insertText = `{{${variable}}}`
    }

    if (!textarea) {
      setLocalTemplate(prev => prev + '\n' + insertText)
      return
    }

    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? textarea.value.length
    const text = localTemplate
    const before = text.substring(0, start)
    const after = text.substring(end)

    const newText = `${before}${insertText}${after}`
    setLocalTemplate(newText)
    
    setTimeout(() => {
      textarea.focus()
      const newPos = start + insertText.length
      textarea.setSelectionRange(newPos, newPos)
    }, 10)
  }

  const resetTemplate = async () => {
    if (!confirm('¿Estás seguro de restablecer el diseño? Volverá al formato corto compacto optimizado.')) return

    setLocalTemplate(DEFAULT_TICKET_TEMPLATE)
    await updateSettings({ ticketTemplate: DEFAULT_TICKET_TEMPLATE })
    toast({ title: 'Plantilla restablecida al formato compacto' })
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    updateSettings({ theme: newTheme })
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Subtabs Switcher */}
      <div className="flex bg-[#131b2e] p-1 rounded-xl border border-[#3c4a42]/50 shadow-sm w-full sm:w-fit">
        <Button 
          variant={activeEditorTab === 'template' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('template')}
          className={cn(
            "rounded-lg px-4 font-mono text-xs font-bold gap-1.5",
            activeEditorTab === 'template' 
              ? "bg-[#4cd7f6] text-[#001f26] hover:bg-[#4cd7f6]/90" 
              : "text-[#bbcabf] hover:text-[#dae2fd]"
          )}
        >
          <Receipt className="h-3.5 w-3.5" />
          Editor del Ticket
        </Button>
        <Button 
          variant={activeEditorTab === 'info' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('info')}
          className={cn(
            "rounded-lg px-4 font-mono text-xs font-bold gap-1.5",
            activeEditorTab === 'info' 
              ? "bg-[#10b981] text-[#003824] hover:bg-[#10b981]/90" 
              : "text-[#bbcabf] hover:text-[#dae2fd]"
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          Información del Negocio
        </Button>
      </div>

      {activeEditorTab === 'info' ? (
        <Card className="bg-[#131b2e] border border-[#3c4a42]/50 shadow-2xl overflow-hidden relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono text-[#dae2fd]">Información del Negocio</CardTitle>
              <Badge variant="outline" className={cn(
                "gap-1 font-mono text-xs",
                isOwner ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}>
                <ShieldCheck className="h-3 w-3" /> {role.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="text-[#bbcabf] text-xs font-mono">
              Configuración general de la empresa visible en los recibos y reportes.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 relative">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-xs font-mono text-[#dae2fd]">Nombre del Negocio</Label>
              <Input
                id="businessName"
                value={localBusinessName}
                onChange={(e) => handleUpdateBusinessName(e.target.value)}
                placeholder="Ej. LOTERIA LA FORTUNA"
                disabled={!isOwner}
                className={!isOwner ? "bg-muted opacity-80" : "bg-[#0b1326] border-[#3c4a42] text-[#dae2fd] font-mono focus:border-[#10b981] transition-all"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-xs font-mono text-[#dae2fd]">Símbolo de Moneda</Label>
              <Input
                id="currency"
                value={settings.currency || ''}
                onChange={(e) => updateSettings({ currency: e.target.value })}
                placeholder="Ej. C$"
                disabled={!isOwner}
                className="bg-[#0b1326] border-[#3c4a42] text-[#dae2fd] font-mono focus:border-[#10b981] transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketMessage" className="text-xs font-mono text-[#dae2fd]">Mensaje de Pie de Recibo</Label>
              <Input
                id="ticketMessage"
                value={settings.ticketMessage || ''}
                onChange={(e) => updateSettings({ ticketMessage: e.target.value })}
                placeholder="¡Gracias por su compra!"
                className="bg-[#0b1326] border-[#3c4a42] text-[#dae2fd] font-mono focus:border-[#10b981] transition-all"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-[#3c4a42]/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#86948a] font-mono">Apariencia del Sistema</Label>
                {mounted && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 opacity-50 uppercase font-mono">
                    Actual: {theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#0b1326] rounded-xl border border-[#3c4a42]">
                <Button 
                  variant="ghost"
                  size="sm" 
                  className={cn(
                    "gap-2 h-10 rounded-lg transition-all font-mono", 
                    mounted && theme === 'light' ? "bg-white text-black shadow-lg" : "text-[#bbcabf] hover:text-[#dae2fd]"
                  )}
                  onClick={() => handleThemeChange('light')}
                >
                  <Sun className="h-4 w-4" /> <span className="text-xs">Claro</span>
                </Button>
                <Button 
                  variant="ghost"
                  size="sm" 
                  className={cn(
                    "gap-2 h-10 rounded-lg transition-all font-mono", 
                    mounted && theme === 'dark' ? "bg-[#10b981] text-[#003824] font-bold" : "text-[#bbcabf] hover:text-[#dae2fd]"
                  )}
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon className="h-4 w-4" /> <span className="text-xs">Oscuro</span>
                </Button>
                <Button 
                  variant="ghost"
                  size="sm" 
                  className={cn(
                    "gap-2 h-10 rounded-lg transition-all font-mono", 
                    mounted && theme === 'system' ? "bg-[#171f33] text-[#dae2fd] border border-[#3c4a42]" : "text-[#bbcabf] hover:text-[#dae2fd]"
                  )}
                  onClick={() => handleThemeChange('system')}
                >
                  <Monitor className="h-4 w-4" /> <span className="text-xs">Auto</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#3c4a42]/40">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#86948a] font-mono">Ancho del Papel Térmico</Label>
              <Select 
                value={settings.ticketWidth || '58mm'} 
                onValueChange={(v) => updateSettings({ ticketWidth: v })}
              >
                <SelectTrigger className="w-full h-9 bg-[#0b1326] border-[#3c4a42] text-[#dae2fd] font-mono focus:border-[#10b981] transition-all">
                  <SelectValue placeholder="Seleccionar ancho" />
                </SelectTrigger>
                <SelectContent className="bg-[#131b2e] border-[#3c4a42] text-[#dae2fd] font-mono">
                  <SelectItem value="58mm">58mm (Estándar PT-210 Portátil)</SelectItem>
                  <SelectItem value="80mm">80mm (Estándar Punto de Venta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* TAB 2: EDITOR DE PLANTILLA DEL TICKET */
        <div className="space-y-6">
          <Card className="bg-[#131b2e] border border-[#3c4a42]/50 shadow-2xl overflow-hidden relative">
            <CardHeader className="pb-3 relative border-b border-[#3c4a42]/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-mono text-[#dae2fd] text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-[#4cd7f6]" />
                    Estructura y Diseño del Ticket
                  </CardTitle>
                  <CardDescription className="text-xs font-mono text-[#bbcabf] mt-1">
                    Edita el texto del recibo. La vista previa a la derecha muestra exactamente cómo se imprimirá.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                    className="bg-[#10b981] text-[#003824] hover:bg-[#10b981]/90 font-mono text-xs font-bold h-9 px-4 active:scale-95 transition-all shadow-md"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Diseño'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetTemplate}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 border-red-500/30 font-mono text-xs h-9 px-3"
                  >
                    Restablecer
                  </Button>
                  <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 h-9 font-mono text-xs bg-[#171f33] border-[#3c4a42] text-[#dae2fd] hover:text-white">
                        <Eye className="h-3.5 w-3.5 text-[#4cd7f6]" /> Pantalla Completa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="p-4 bg-[#060e20] border-[#3c4a42] shadow-2xl rounded-2xl max-w-sm">
                      <div className="text-center font-mono text-xs text-[#bbcabf] mb-2 font-bold">
                        VISTA PREVIA DEL RECIBO (PT-210)
                      </div>
                      <div className="w-full max-w-[270px] mx-auto shadow-2xl relative filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]">
                        <div className="w-full h-2.5 thermal-rip-top -mb-[1px]" />
                        <div className="bg-white p-4 font-mono text-[12px] text-black">
                          <TicketBodyView 
                            template={localTemplate}
                            ticket={MOCK_PREVIEW_TICKET}
                            settings={settings}
                          />
                        </div>
                        <div className="w-full h-2.5 thermal-rip-bottom -mt-[1px]" />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* COLUMNA 1: EDITOR DE TEXTO Y VARIABLES (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Selector de Variables para Insertar */}
                  <div className="bg-[#0b1326] p-3 rounded-xl border border-[#3c4a42] space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#86948a]">
                        Datos del Recibo
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['ticketNumber', 'date', 'gameName', 'scheduleName', 'terminalName', 'vendorName', 'client'].map(v => (
                          <Button 
                            key={v} 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[11px] px-2 font-mono bg-[#171f33] border-[#3c4a42] text-[#dae2fd] hover:bg-[#4cd7f6]/20 hover:border-[#4cd7f6]/40 hover:text-[#4cd7f6] transition-all"
                            onClick={() => insertVariable(v)}
                          >
                            {`{{${v}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#86948a]">
                        Jugadas y Totales
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['number', 'amount', 'prize', 'total', 'currency'].map(v => (
                          <Button 
                            key={v} 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[11px] px-2 font-mono bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all"
                            onClick={() => insertVariable(v)}
                          >
                            {`{{${v}}}`}
                          </Button>
                        ))}
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-[11px] px-2 font-mono bg-[#4cd7f6]/10 border-[#4cd7f6]/30 text-[#4cd7f6] hover:bg-[#4cd7f6]/20 transition-all"
                          onClick={() => insertVariable('[QR]')}
                        >
                          [QR]
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Area de Texto para editar la plantilla */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-[#dae2fd]">
                        Editor de Plantilla
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleBold}
                          className="h-6 text-[11px] px-2 font-mono text-[#f59e0b] hover:bg-[#f59e0b]/15 hover:text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg font-bold flex items-center gap-1"
                          title="Poner o quitar negrita (**) al campo o texto seleccionado"
                        >
                          <Bold className="h-3 w-3" /> ** Negrita **
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={alignColumnsCenter}
                          className="h-6 text-[11px] px-2 font-mono text-[#10b981] hover:bg-[#10b981]/15 hover:text-[#10b981] border border-[#10b981]/30 rounded-lg font-bold"
                          title="Alinea y centra los números de Apuesta, Monto y Premio"
                        >
                          Centrar Columnas
                        </Button>
                        <span className="text-[10px] font-normal text-[#86948a]">
                          {localTemplate.length} caracteres
                        </span>
                      </div>
                    </div>
                    <Textarea
                      id="ticketTemplate"
                      value={localTemplate}
                      onChange={(e) => setLocalTemplate(e.target.value)}
                      className="font-mono text-xs min-h-[380px] bg-[#0b1326] text-[#dae2fd] border-[#3c4a42] focus-visible:ring-[#4cd7f6] focus-visible:ring-1 selection:bg-[#10b981]/30 leading-relaxed rounded-xl shadow-inner p-3.5"
                      rows={18}
                      spellCheck={false}
                    />
                  </div>

                  {/* Guía Rápida de Formato */}
                  <div className="bg-[#0b1326]/60 p-3 rounded-xl text-[11px] font-mono space-y-1.5 border border-[#3c4a42]/40 text-[#bbcabf]">
                    <p className="font-bold text-[#dae2fd] uppercase flex items-center gap-1.5 text-[10px]">
                      <Info className="h-3 w-3 text-[#4cd7f6]" /> Guía de Formato Térmico
                    </p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
                      <li><code># Texto</code>: Grande / Centrado</li>
                      <li><code>## Texto</code>: Centrado</li>
                      <li><code>**Texto**</code>: Negrita / Ancho</li>
                      <li><code>[QR]</code>: Código QR</li>
                      <li><code>{`{{#items}}...{{/items}}`}</code>: Jugadas</li>
                      <li><code>{`{{#if client}}...{{/if}}`}</code>: Cliente</li>
                    </ul>
                  </div>
                </div>

                {/* COLUMNA 2: VISTA PREVIA EN VIVO EN TIEMPO REAL (5 cols) */}
                <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
                  <div className="bg-[#0b1326] rounded-2xl border border-[#3c4a42] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#3c4a42]/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-[#10b981]" />
                        <h3 className="font-mono text-xs font-bold text-[#dae2fd] uppercase tracking-wider">
                          Vista Previa en Vivo
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-bold">
                        PT-210 (58mm)
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-[#86948a] leading-tight">
                      Se actualiza automáticamente en tiempo real mientras editas.
                    </p>

                    {/* Simulación Realista de Papel Térmico */}
                    <div className="w-full max-w-[270px] mx-auto shadow-2xl relative filter drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)] my-2">
                      <div className="w-full h-2.5 thermal-rip-top -mb-[1px]" />
                      <div className="bg-white px-4 py-3 font-mono text-[12px] text-black min-h-[350px]">
                        <TicketBodyView 
                          template={localTemplate}
                          ticket={MOCK_PREVIEW_TICKET}
                          settings={settings}
                        />
                      </div>
                      <div className="w-full h-2.5 thermal-rip-bottom -mt-[1px]" />
                    </div>

                    <div className="pt-2 flex justify-center">
                      <Button
                        size="sm"
                        onClick={handleSaveTemplate}
                        disabled={isSaving}
                        className="w-full bg-[#10b981] text-[#003824] hover:bg-[#10b981]/90 font-mono text-xs font-bold h-9 shadow-lg"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar y Aplicar al Punto de Venta'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
