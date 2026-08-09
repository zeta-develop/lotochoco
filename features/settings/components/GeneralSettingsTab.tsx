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
import { ShieldCheck, Info, Bold, Italic, Eye, FileText, Sun, Moon, Monitor } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

export function GeneralSettingsTab() {
  const { settings, updateSettings } = useSettingsManager()
  const { isOwner, role, company, updateCompanyName } = useCompany()

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
    }, 1000) // 1 segundo de calma
  }

  const { theme, setTheme } = useTheme()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activeEditorTab, setActiveTab] = useState<'info' | 'template'>('info')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Estado local simple y rápido para el editor
  const [localTemplate, setLocalTemplate] = useState(settings.ticketTemplate || '')
  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar solo cuando cargamos por primera vez o cambiamos de pestaña
  useEffect(() => {
    setLocalTemplate(settings.ticketTemplate || '')
  }, [activeEditorTab, settings.ticketTemplate])

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true)
      await updateSettings({ ticketTemplate: localTemplate })
      toast({ title: 'Diseño guardado correctamente' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al guardar diseño' })
    } finally {
      setIsSaving(false)
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('ticketTemplate') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = localTemplate
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)

    const newText = `${before}{{${variable}}}${after}`
    setLocalTemplate(newText)
    
    setTimeout(() => {
      textarea.focus()
      const newPos = start + variable.length + 4
      textarea.setSelectionRange(newPos, newPos)
    }, 10)
  }

  const resetTemplate = async () => {
    if (!confirm('¿Estás seguro de restablecer el diseño? Perderás los cambios actuales.')) return

    const defaultTemplate = `# {{businessName}}\nRECIBO DE VENTA\n--------------------------------\nTICKET: #{{ticketNumber}}\nFECHA: {{date}}\n{{#if client}}CLIENTE: {{client}}{{/if}}\n--------------------------------\nJUEGO      NUM       MONTO\n--------------------------------\n{{#items}}\n{{game}}  {{number}}  {{currency}}{{amount}}  Prem: {{currency}}{{prize}}\n{{/items}}\n--------------------------------\n**TOTAL: {{currency}}{{total}}**\n\n{{ticketMessage}}\n*** CONSERVE ESTE TICKET ***`
    
    setLocalTemplate(defaultTemplate)
    await updateSettings({ ticketTemplate: defaultTemplate })
    toast({ title: 'Plantilla restablecida' })
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    updateSettings({ theme: newTheme })
  }

  const renderTemplatePreview = (template: string) => {
    if (!template) return null

    // Simular valores para la previsualización
    let preview = template
      .replace(/{{businessName}}/g, settings.businessName || 'MI NEGOCIO')
      .replace(/{{ticketNumber}}/g, '2100305')
      .replace(/{{date}}/g, format(new Date(), 'dd-MM-yyyy hh:mm:ss a'))
      .replace(/{{gameName}}/g, 'Diaria')
      .replace(/{{scheduleName}}/g, '9:00 PM')
      .replace(/{{vendorName}}/g, 'Yamileth')
      .replace(/{{terminalName}}/g, '= J081 =')
      .replace(/{{currency}}/g, settings.currency || 'C$')
      .replace(/{{total}}/g, '30')
      .replace(/{{ticketMessage}}/g, settings.ticketMessage || 'Gracias por su compra')
      .replace(/{{#if client}}([\s\S]*?){{\/if}}/g, '* **Cliente:** Anielka')
      .replace(/{{client}}/g, 'Anielka')
    
    // Simular items
    const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/g
    preview = preview.replace(itemsRegex, (match, content) => {
      return content
        .replace(/{{game}}/g, 'Diaria')
        .replace(/{{number}}/g, '08')
        .replace(/{{amount}}/g, '15')
        .replace(/{{prize}}/g, '1200')
        .replace(/{{currency}}/g, settings.currency || 'C$') +
        content
        .replace(/{{game}}/g, 'Diaria')
        .replace(/{{number}}/g, '80')
        .replace(/{{amount}}/g, '15')
        .replace(/{{prize}}/g, '1200')
        .replace(/{{currency}}/g, settings.currency || 'C$')
    })

    return preview.split('\n').map((line, i) => {
      let content = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
      
      let className = "text-[11px] font-mono leading-tight whitespace-pre-wrap min-h-[1em] break-all"
      if (line.trim().startsWith('# ')) {
        className = "text-lg font-bold text-center uppercase mb-1 whitespace-pre-wrap"
        content = content.replace('# ', '')
      } else if (line.trim().startsWith('## ')) {
        className = "text-sm font-bold text-center uppercase mb-1 whitespace-pre-wrap"
        content = content.replace('## ', '')
      }

      return (
        <div key={i} className={className} dangerouslySetInnerHTML={{ __html: content || '&nbsp;' }} />
      )
    })
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex overflow-x-auto no-scrollbar bg-card/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-sm w-full sm:w-fit mx-auto sm:mx-0 whitespace-nowrap">
        <Button 
          variant={activeEditorTab === 'info' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('info')}
          className="rounded-md px-4"
        >
          Información
        </Button>
        <Button 
          variant={activeEditorTab === 'template' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('template')}
          className="rounded-md px-4"
        >
          Diseño del Recibo
        </Button>
      </div>

      {activeEditorTab === 'info' ? (
        <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Información del Negocio</CardTitle>
              <Badge variant="outline" className={cn(
                "gap-1",
                isOwner ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              )}>
                <ShieldCheck className="h-3 w-3" /> {role.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>
              Configuración global de la empresa visible para todos los terminales.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 relative">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del Negocio</Label>
              <Input
                id="businessName"
                value={localBusinessName}
                onChange={(e) => handleUpdateBusinessName(e.target.value)}
                placeholder="Ej. Lotería La Fortuna"
                disabled={!isOwner}
                className={!isOwner ? "bg-muted opacity-80" : "bg-background/50 border-white/10 focus:border-primary/50 transition-all"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                value={settings.currency || ''}
                onChange={(e) => updateSettings({ currency: e.target.value })}
                placeholder="Ej. C$"
                disabled={!isOwner}
                className="bg-background/50 border-white/10 focus:border-primary/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketMessage">Mensaje Global de Pie</Label>
              <Input
                id="ticketMessage"
                value={settings.ticketMessage || ''}
                onChange={(e) => updateSettings({ ticketMessage: e.target.value })}
                placeholder="¡Gracias por su compra!"
                className="bg-background/50 border-white/10 focus:border-primary/50 transition-all"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apariencia del Sistema</Label>
                {mounted && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 opacity-50 uppercase">
                    Actual: {theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-background/30 rounded-xl border border-white/5">
                <Button 
                  variant="ghost"
                  size="sm" 
                  className={cn(
                    "gap-2 h-10 rounded-lg transition-all", 
                    mounted && theme === 'light' ? "bg-white text-black shadow-lg shadow-black/10 scale-105" : "text-muted-foreground opacity-60 hover:opacity-100"
                  )}
                  onClick={() => handleThemeChange('light')}
                >
                  <Sun className="h-4 w-4" /> <span className="text-xs">Claro</span>
                </Button>
                <Button 
                  variant="ghost"
                  size="sm" 
                  className={cn(
                    "gap-2 h-10 rounded-lg transition-all", 
                    mounted && theme === 'dark' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : "text-muted-foreground opacity-60 hover:opacity-100"
                  )}
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon className="h-4 w-4" /> <span className="text-xs">Oscuro</span>
                </Button>
                <Button 
                  variant="ghost"
                  size="sm" 
                  className={cn(
                    "gap-2 h-10 rounded-lg transition-all", 
                    mounted && theme === 'system' ? "bg-muted text-foreground border border-white/10 scale-105" : "text-muted-foreground opacity-60 hover:opacity-100"
                  )}
                  onClick={() => handleThemeChange('system')}
                >
                  <Monitor className="h-4 w-4" /> <span className="text-xs">Auto</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ancho del Papel (Impresora)</Label>
              <Select 
                value={settings.ticketWidth || '58mm'} 
                onValueChange={(v) => updateSettings({ ticketWidth: v })}
              >
                <SelectTrigger className="w-full h-9 bg-background/50 border-white/10 focus:border-primary/50 transition-all">
                  <SelectValue placeholder="Seleccionar ancho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Estándar Portátil)</SelectItem>
                  <SelectItem value="80mm">80mm (Estándar Punto de Venta)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                * Ajusta el ancho real de la impresión y la previsualización.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
          <CardHeader className="pb-4 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Estructura del Recibo</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSaveTemplate}
                  disabled={isSaving || localTemplate === settings.ticketTemplate}
                  className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 h-8"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Diseño'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetTemplate}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-8"
                >
                  Restablecer
                </Button>
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
                      <Eye className="h-4 w-4" /> Ver Ticket Final
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={cn(
                    "p-0 bg-white border-none shadow-2xl rounded-none transition-all duration-300 w-[95vw]",
                    settings.ticketWidth === '80mm' ? "max-w-[380px]" : "max-w-[300px]"
                  )}>
                    <div className="p-6 bg-white text-black font-mono leading-tight">
                      <div className={cn(
                        "border-2 border-black/5 p-4 rounded-sm shadow-inner bg-slate-50/50 mx-auto",
                        settings.ticketWidth === '80mm' ? "w-full max-w-[280px]" : "w-full max-w-[200px]"
                      )}>
                        {renderTemplatePreview(localTemplate || '')}
                      </div>
                    </div>
                  </DialogContent>

                </Dialog>
              </div>
            </div>
            <CardDescription>
              Personaliza cada línea de tu recibo usando variables entre llaves.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">General</label>
                <div className="flex flex-wrap gap-1.5">
                  {['businessName', 'date', 'currency', 'terminalName'].map(v => (
                    <Button 
                      key={v} 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2 font-mono bg-muted/50 border-white/5 hover:bg-primary/20 hover:border-primary/30 transition-all"
                      onClick={() => insertVariable(v)}
                    >
                      {`{{${v}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Venta / Ticket</label>
                <div className="flex flex-wrap gap-1.5">
                  {['ticketNumber', 'gameName', 'scheduleName', 'client', 'vendorName', 'total', 'ticketMessage'].map(v => (
                    <Button 
                      key={v} 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2 font-mono bg-muted/50 border-white/5 hover:bg-primary/20 hover:border-primary/30 transition-all"
                      onClick={() => insertVariable(v)}
                    >
                      {`{{${v}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dentro de {`{{#items}}`}</label>
                <div className="flex flex-wrap gap-1.5">
                  {['game', 'number', 'amount', 'prize'].map(v => (
                    <Button 
                      key={v} 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2 font-mono bg-primary/5 border-primary/10 hover:bg-primary/20 hover:border-primary/30 transition-all"
                      onClick={() => insertVariable(v)}
                    >
                      {`{{${v}}}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Textarea
                id="ticketTemplate"
                value={localTemplate}
                onChange={(e) => setLocalTemplate(e.target.value)}
                className="font-mono text-[13px] min-h-[450px] bg-[#0d1117]/80 backdrop-blur-md text-[#c9d1d9] border-white/10 shadow-inner focus-visible:ring-primary focus-visible:ring-offset-0 selection:bg-primary/30 leading-relaxed rounded-xl"
                rows={18}
                spellCheck={false}
              />
            </div>

            <div className="bg-muted/30 p-3 rounded-lg text-[11px] space-y-1.5 border border-dashed">
              <p className="font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Guía de Formato
              </p>
              <ul className="grid grid-cols-2 gap-x-4 list-disc list-inside opacity-70">
                <li><code># Texto</code>: Grande / Centrado</li>
                <li><code>## Texto</code>: Centrado</li>
                <li><code>**Texto**</code>: Negrita</li>
                <li><code>{`{{#items}}...{{/items}}`}</code>: Jugadas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
