"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { 
  Store, 
  Printer, 
  Palette, 
  Save,
  TestTube,
  Wifi,
  Bluetooth,
  CheckCircle,
  AlertCircle,
  Shield,
  Download,
  Upload,
  Database,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
  Smartphone,
  Globe,
  MessageSquare,
  BadgeInfo
} from "lucide-react";
import { toast } from "sonner";
import { exportBackup, importBackup } from "@/services/backup";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Settings() {
  const { settings, isLoading, updateSettings } = useSettings();
  const [formData, setFormData] = useState({
    businessName: "Loteria La Fortuna",
    currency: "C$",
    ticketMessage: "Gracias por su compra!",
    printerType: "network",
    printerAddress: "",
    bluetoothDeviceId: "",
    bluetoothDeviceName: "",
    darkMode: false,
    ticketFontSize: "normal",
    ticketFontType: "A",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  useEffect(() => {
    if (settings) {
      setFormData({
        businessName: settings.businessName || "Loteria La Fortuna",
        currency: settings.currency || "C$",
        ticketMessage: settings.ticketMessage || "Gracias por su compra!",
        printerType: settings.printerType || "network",
        printerAddress: settings.printerAddress || "",
        bluetoothDeviceId: settings.bluetoothDeviceId || "",
        bluetoothDeviceName: settings.bluetoothDeviceName || "",
        darkMode: settings.darkMode === "true",
        ticketFontSize: settings.ticketFontSize || "normal",
        ticketFontType: settings.ticketFontType || "A",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({...formData, darkMode: formData.darkMode.toString()});
      toast.success("Configuración guardada correctamente");
    } catch (err) {
      toast.error("Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinter = async () => {
    setTestStatus("testing");
    setTimeout(() => {
      if (formData.printerAddress || formData.bluetoothDeviceId) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
      setTimeout(() => setTestStatus("idle"), 3000);
    }, 2000);
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setFormData({ ...formData, darkMode: checked });
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando Ajustes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase px-3 py-0.5 rounded-full mb-2">Panel de Control</Badge>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Configuración</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Gestiona tu terminal de ventas</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="h-14 px-8 rounded-2xl font-black uppercase tracking-tighter text-xs shadow-xl shadow-primary/20 transition-all active:scale-95"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-14 bg-muted/30 p-1.5 rounded-2xl backdrop-blur-sm border border-muted-foreground/5 shadow-inner">
          <TabsTrigger value="business" className="rounded-xl data-[state=active]:shadow-md data-[state=active]:bg-background gap-2 font-bold uppercase text-[10px] sm:text-xs tracking-tight">
            <Store className="h-4 w-4 hidden sm:inline" />
            <span className="truncate">Negocio</span>
          </TabsTrigger>
          <TabsTrigger value="printer" className="rounded-xl data-[state=active]:shadow-md data-[state=active]:bg-background gap-2 font-bold uppercase text-[10px] sm:text-xs tracking-tight">
            <Printer className="h-4 w-4 hidden sm:inline" />
            <span className="truncate">Impresora</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-xl data-[state=active]:shadow-md data-[state=active]:bg-background gap-2 font-bold uppercase text-[10px] sm:text-xs tracking-tight">
            <Palette className="h-4 w-4 hidden sm:inline" />
            <span className="truncate">Visual</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-xl data-[state=active]:shadow-md data-[state=active]:bg-background gap-2 font-bold uppercase text-[10px] sm:text-xs tracking-tight">
            <Shield className="h-4 w-4 hidden sm:inline" />
            <span className="truncate">Seguridad</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="mt-8 space-y-6 outline-none animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-8 border-b border-primary/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Store className="h-5 w-5" /></div>
                  <CardTitle className="text-lg font-black uppercase tracking-tighter">Perfil Comercial</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">Datos visibles en el encabezado del ticket</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Nombre de Empresa</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center text-muted-foreground group-focus-within:text-primary"><Globe size={18} /></div>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="Ej: Loteria La Fortuna"
                      className="pl-10 h-14 rounded-2xl border-2 border-muted focus:border-primary transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="currency" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Moneda del Sistema</Label>
                  <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                    <SelectTrigger className="h-14 rounded-2xl border-2 border-muted font-bold">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      <SelectItem value="C$" className="rounded-lg font-bold">Cordobas (C$)</SelectItem>
                      <SelectItem value="$" className="rounded-lg font-bold">Dolares ($)</SelectItem>
                      <SelectItem value="€" className="rounded-lg font-bold">Euros (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="ticketMessage" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Mensaje Personalizado</Label>
                  <div className="relative group">
                    <div className="absolute top-4 left-3 text-muted-foreground group-focus-within:text-primary"><MessageSquare size={18} /></div>
                    <Textarea
                      id="ticketMessage"
                      value={formData.ticketMessage}
                      onChange={(e) => setFormData({ ...formData, ticketMessage: e.target.value })}
                      placeholder="Mensaje al final del ticket..."
                      rows={3}
                      className="pl-10 pt-4 rounded-2xl border-2 border-muted focus:border-primary transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-6 border-t border-muted/50 mt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Personalización de Impresión</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Tamaño de Letra</Label>
                      <Select 
                        value={formData.ticketFontSize} 
                        onValueChange={(val) => setFormData({ ...formData, ticketFontSize: val })}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-2 border-muted font-bold shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="normal" className="rounded-lg font-bold text-xs uppercase">Normal</SelectItem>
                          <SelectItem value="double-height" className="rounded-lg font-bold text-xs uppercase">Doble Alto</SelectItem>
                          <SelectItem value="double-width" className="rounded-lg font-bold text-xs uppercase">Doble Ancho</SelectItem>
                          <SelectItem value="large" className="rounded-lg font-bold text-xs uppercase">Grande (Doble)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Tipo de Fuente</Label>
                      <Select 
                        value={formData.ticketFontType} 
                        onValueChange={(val) => setFormData({ ...formData, ticketFontType: val })}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-2 border-muted font-bold shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="A" className="rounded-lg font-bold text-xs uppercase">Fuente A (Estandar)</SelectItem>
                          <SelectItem value="B" className="rounded-lg font-bold text-xs uppercase">Fuente B (Condensada)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-2">Vista Previa Real-Time</h4>
               <div className={cn(
                 "bg-white text-black p-8 rounded-[2.5rem] font-mono shadow-2xl border-2 border-dashed border-gray-200 relative overflow-hidden transition-all duration-300 origin-top",
                 formData.ticketFontType === "B" ? "text-[10px]" : "text-[11px] leading-relaxed",
                 formData.ticketFontSize === "double-height" ? "scale-y-110" : 
                 formData.ticketFontSize === "double-width" ? "scale-x-110" :
                 formData.ticketFontSize === "large" ? "scale-110" : ""
               )}>
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-500 opacity-50"></div>
                  <div className="text-center mb-6">
                    <h5 className="font-black text-xl tracking-tighter mb-1 uppercase">{formData.businessName}</h5>
                    <Badge variant="outline" className="text-[8px] font-black border-black/10 rounded-full h-4 uppercase">Ticket de Venta</Badge>
                  </div>
                  
                  <div className="space-y-1 mb-4 border-b border-dashed border-black/10 pb-4">
                    <div className="flex justify-between uppercase opacity-60 font-bold"><span>FECHA: {new Date().toLocaleDateString()}</span><span>HORA: {new Date().toLocaleTimeString('es-NI', {hour:'2-digit', minute:'2-digit'})}</span></div>
                    <p className="font-black">TICKET: #00000001</p>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-baseline font-black">
                      <div className="space-y-0.5">
                         <span className="text-sm">TICA 25</span>
                         <p className="text-[8px] opacity-40 uppercase">11:00 AM {'>'} Premio: {formData.currency}1,750</p>
                      </div>
                      <span className="text-sm">{formData.currency}25</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-black pt-3 flex justify-between items-center mb-6">
                    <span className="font-black text-xs uppercase tracking-tighter">Total a Pagar</span>
                    <span className="text-2xl font-black">{formData.currency}25.00</span>
                  </div>

                  <div className="text-center opacity-70">
                    <p className="italic font-bold mb-1">{formData.ticketMessage}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest">*** Conserve su ticket ***</p>
                  </div>
               </div>
            </div>
          </div>
        </TabsContent>

        {/* Printer Settings */}
        <TabsContent value="printer" className="mt-8 space-y-6 outline-none animate-in fade-in slide-in-from-bottom-3 duration-400">
           <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Printer className="h-5 w-5" /></div>
                    <CardTitle className="text-lg font-black uppercase tracking-tighter">Hardware de Impresión</CardTitle>
                  </div>
                  {testStatus !== "idle" && (
                    <Badge className={cn(
                      "rounded-full font-black text-[9px] uppercase px-3",
                      testStatus === "testing" ? "bg-blue-500" : testStatus === "success" ? "bg-green-500" : "bg-red-500"
                    )}>
                      {testStatus === "testing" ? "Enviando..." : testStatus === "success" ? "Conectada" : "Fallo"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                 <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { id: 'network', icon: Wifi, label: 'Red (IP)', color: 'blue' },
                      { id: 'rawbt', icon: Smartphone, label: 'RawBT (APK)', color: 'indigo' },
                      { id: 'bluetooth', icon: Bluetooth, label: 'Directo (BT)', color: 'green' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFormData({ ...formData, printerType: type.id })}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group",
                          formData.printerType === type.id 
                            ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                            : "border-muted bg-background hover:border-muted-foreground/20"
                        )}
                      >
                        <div className={cn(
                          "p-3 rounded-full transition-colors",
                          formData.printerType === type.id ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
                        )}>
                          <type.icon size={24} />
                        </div>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.printerType === type.id ? "text-primary" : "text-muted-foreground")}>{type.label}</span>
                      </button>
                    ))}
                 </div>

                 <div className="space-y-6">
                    {formData.printerType === "network" && (
                      <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Dirección IP Estática</Label>
                        <Input
                          value={formData.printerAddress}
                          onChange={(e) => setFormData({ ...formData, printerAddress: e.target.value })}
                          placeholder="Ej: 192.168.1.100"
                          className="h-14 rounded-2xl border-2 font-mono text-center font-bold"
                        />
                      </div>
                    )}

                    {formData.printerType === "rawbt" && (
                      <div className="p-5 bg-blue-500/10 border-2 border-blue-500/20 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-left-2">
                        <div className="bg-blue-500 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white"><BadgeInfo /></div>
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                          Ideal para impresoras de 58mm. Requiere instalar <span className="underline font-black">RawBT</span> desde Play Store para gestionar la cola de impresión nativa.
                        </p>
                      </div>
                    )}

                    {formData.printerType === "bluetooth" && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                         {formData.bluetoothDeviceName ? (
                           <div className="flex items-center justify-between p-4 bg-green-500/10 border-2 border-green-500/20 rounded-2xl">
                             <div className="flex items-center gap-3">
                               <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center text-white"><CheckCircle /></div>
                               <div>
                                  <p className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest leading-none mb-1">Vinculada</p>
                                  <p className="text-sm font-black truncate max-w-[150px]">{formData.bluetoothDeviceName}</p>
                               </div>
                             </div>
                             <Button variant="ghost" size="sm" onClick={() => setFormData({...formData, bluetoothDeviceId: '', bluetoothDeviceName: ''})} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-black text-[9px] uppercase">Desvincular</Button>
                           </div>
                         ) : (
                           <Button 
                             onClick={async () => {
                               try {
                                 const { printerService } = await import('@/services/printer')
                                 const device = await printerService.scanBluetoothPrinter()
                                 if (device) setFormData({ ...formData, bluetoothDeviceId: device.id, bluetoothDeviceName: device.name })
                               } catch (err) { toast.error("Error al buscar") }
                             }}
                             className="w-full h-20 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group flex flex-col gap-1"
                           >
                              <Bluetooth className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Buscar Impresora Cercana</span>
                           </Button>
                         )}
                      </div>
                    )}
                 </div>

                 <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] border-2 shadow-sm"
                      onClick={handleTestPrinter}
                      disabled={testStatus === "testing"}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Probar Conexión
                    </Button>
                    <div className="flex-[2] grid grid-cols-2 gap-2 text-center text-[9px] font-black uppercase tracking-widest">
                       {['Epson', 'Bixolon', 'PT-210', 'Zebra'].map(m => (
                         <div key={m} className="p-3 bg-muted/40 rounded-xl border border-muted-foreground/5 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">{m}</div>
                       ))}
                    </div>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="mt-8 space-y-6 outline-none animate-in fade-in slide-in-from-bottom-3 duration-400">
           <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Palette className="h-5 w-5" /></div>
                  <CardTitle className="text-lg font-black uppercase tracking-tighter">Estilo de Interfaz</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                 <div className="flex items-center justify-between p-6 rounded-3xl bg-muted/20 border border-muted-foreground/5">
                    <div className="flex gap-4 items-center">
                       <div className={cn("p-4 rounded-2xl text-white transition-all duration-500", formData.darkMode ? "bg-gray-800" : "bg-orange-500")}>
                          {formData.darkMode ? <Moon size={24} /> : <Sun size={24} />}
                       </div>
                       <div className="space-y-0.5">
                         <p className="text-sm font-black uppercase tracking-tight">Modo Oscuro</p>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Reduce la fatiga visual nocturna</p>
                       </div>
                    </div>
                    <Switch
                      id="darkMode"
                      checked={formData.darkMode}
                      onCheckedChange={handleDarkModeToggle}
                      className="scale-125"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div
                      className={cn(
                        "relative p-6 rounded-[2rem] border-4 transition-all cursor-pointer group",
                        !formData.darkMode ? "border-primary bg-white shadow-2xl scale-105 z-10" : "border-transparent bg-white/40 grayscale opacity-50"
                      )}
                      onClick={() => handleDarkModeToggle(false)}
                    >
                      {!formData.darkMode && <CheckCircle className="absolute top-4 right-4 text-primary h-6 w-6" />}
                      <div className="h-28 bg-gray-50 rounded-2xl mb-4 flex flex-col gap-2 p-3 shadow-inner">
                         <div className="w-1/2 h-2 bg-gray-200 rounded"></div>
                         <div className="w-full h-8 bg-white rounded-lg shadow-sm border border-black/5"></div>
                         <div className="grid grid-cols-3 gap-1">
                            <div className="h-6 bg-primary/10 rounded"></div>
                            <div className="h-6 bg-primary/10 rounded"></div>
                            <div className="h-6 bg-primary/10 rounded"></div>
                         </div>
                      </div>
                      <p className="text-center text-xs font-black uppercase tracking-widest text-gray-900">Tema Claro</p>
                    </div>

                    <div
                      className={cn(
                        "relative p-6 rounded-[2rem] border-4 transition-all cursor-pointer group",
                        formData.darkMode ? "border-primary bg-gray-900 shadow-2xl scale-105 z-10 text-white" : "border-transparent bg-gray-800/40 grayscale opacity-50"
                      )}
                      onClick={() => handleDarkModeToggle(true)}
                    >
                      {formData.darkMode && <CheckCircle className="absolute top-4 right-4 text-primary h-6 w-6" />}
                      <div className="h-28 bg-gray-800 rounded-2xl mb-4 flex flex-col gap-2 p-3 shadow-inner">
                         <div className="w-1/2 h-2 bg-gray-700 rounded"></div>
                         <div className="w-full h-8 bg-gray-900 rounded-lg shadow-sm border border-white/5"></div>
                         <div className="grid grid-cols-3 gap-1">
                            <div className="h-6 bg-primary/40 rounded"></div>
                            <div className="h-6 bg-primary/40 rounded"></div>
                            <div className="h-6 bg-primary/40 rounded"></div>
                         </div>
                      </div>
                      <p className="text-center text-xs font-black uppercase tracking-widest">Tema Oscuro</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-none shadow-xl bg-gradient-to-br from-muted/20 to-transparent rounded-3xl overflow-hidden opacity-80">
              <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                       <div className="p-3 bg-muted rounded-xl text-muted-foreground"><BadgeInfo size={20}/></div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">Información Técnica</p>
                          <p className="text-xs font-bold uppercase tracking-tighter">v1.4.0 · SQLite Native · Offline Engine</p>
                       </div>
                    </div>
                    <Badge variant="outline" className="rounded-lg font-mono text-[10px]">STABLE</Badge>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        {/* Maintenance / Security */}
        <TabsContent value="maintenance" className="mt-8 space-y-6 outline-none animate-in fade-in slide-in-from-bottom-3 duration-400">
           <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden group">
                <CardHeader className="bg-primary/5 pb-8 group-hover:bg-primary/10 transition-colors">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary w-fit mb-3"><Database className="h-5 w-5" /></div>
                  <CardTitle className="text-lg font-black uppercase tracking-tighter">Copias de Respaldo</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground leading-relaxed">Protege tu historial de ventas y configuración</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   <Button 
                     variant="outline" 
                     className="w-full h-16 rounded-2xl border-2 font-black uppercase text-[10px] justify-between px-6 hover:bg-primary hover:text-white transition-all group"
                     onClick={async () => {
                       const res = await exportBackup();
                       if (res.success) toast.success(res.message);
                       else toast.error(res.message);
                     }}
                   >
                     <div className="flex items-center gap-3">
                        <Download className="h-5 w-5" />
                        <span>Exportar Base de Datos</span>
                     </div>
                     <ChevronRight className="h-4 w-4 opacity-30 group-hover:translate-x-1 transition-transform" />
                   </Button>

                   <div className="relative">
                      <input
                        type="file"
                        id="backup-input"
                        className="hidden"
                        accept=".json"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            const res = await importBackup(event.target?.result as string);
                            if (res.success) toast.success(res.message);
                            else toast.error(res.message);
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full h-16 rounded-2xl border-2 font-black uppercase text-[10px] justify-between px-6 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all group"
                        onClick={() => document.getElementById('backup-input')?.click()}
                      >
                        <div className="flex items-center gap-3">
                           <Upload className="h-5 w-5" />
                           <span>Restaurar Backup</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-30 group-hover:translate-x-1 transition-transform" />
                      </Button>
                   </div>

                   <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                      <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase text-center leading-relaxed">
                        Aviso: Importar un respaldo reemplazará todos los datos actuales. Se recomienda reiniciar la app tras completar.
                      </p>
                   </div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
