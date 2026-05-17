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
  Settings as SettingsIcon, 
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
  Database
} from "lucide-react";
import { toast } from "sonner";
import { exportBackup, importBackup } from "@/services/backup";
import { sendErrorReport } from "@/services/report-service";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

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
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({...formData, darkMode: formData.darkMode.toString()});
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinter = async () => {
    setTestStatus("testing");
    // Simular prueba de impresora
    setTimeout(() => {
      if (formData.printerAddress) {
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business" className="gap-2">
            <Store className="h-4 w-4" />
            Negocio
          </TabsTrigger>
          <TabsTrigger value="printer" className="gap-2">
            <Printer className="h-4 w-4" />
            Impresora
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Apariencia
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Shield className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Informacion del Negocio
              </CardTitle>
              <CardDescription>
                Configura los datos que apareceran en los tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del Negocio</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  placeholder="Ej: Loteria La Fortuna"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C$">Cordobas (C$)</SelectItem>
                    <SelectItem value="$">Dolares ($)</SelectItem>
                    <SelectItem value="€">Euros (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketMessage">Mensaje del Ticket</Label>
                <Textarea
                  id="ticketMessage"
                  value={formData.ticketMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, ticketMessage: e.target.value })
                  }
                  placeholder="Mensaje que aparecera al final del ticket"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Este mensaje aparecera al final de cada ticket impreso
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white text-black p-4 rounded-lg font-mono text-sm max-w-xs mx-auto shadow-lg">
                <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                  <p className="font-bold text-lg">{formData.businessName}</p>
                  <p className="text-xs text-gray-500">Ticket de Loteria</p>
                </div>
                <div className="space-y-1 border-b border-dashed border-gray-300 pb-2 mb-2">
                  <p className="text-xs">Fecha: {new Date().toLocaleDateString()}</p>
                  <p className="text-xs">Hora: {new Date().toLocaleTimeString()}</p>
                  <p className="text-xs">Ticket: #000001</p>
                </div>
                <div className="space-y-1 border-b border-dashed border-gray-300 pb-2 mb-2">
                  <div className="flex justify-between text-xs">
                    <span>Quiniela 12:00</span>
                    <span>25</span>
                    <span>{formData.currency}50.00</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Nica 15:00</span>
                    <span>777</span>
                    <span>{formData.currency}100.00</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>{formData.currency}150.00</span>
                </div>
                <div className="text-center mt-3 pt-2 border-t border-dashed border-gray-300">
                  <p className="text-xs text-gray-600">{formData.ticketMessage}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printer" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Configuracion de Impresora
              </CardTitle>
              <CardDescription>
                Configura tu impresora termica ESC/POS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Conexion</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    type="button"
                    variant={formData.printerType === "network" ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setFormData({ ...formData, printerType: "network" })}
                  >
                    <Wifi className="h-6 w-6" />
                    <span>Red (IP)</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.printerType === "rawbt" ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setFormData({ ...formData, printerType: "rawbt" })}
                  >
                    <Bluetooth className="h-6 w-6" />
                    <span>RawBT (Android)</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.printerType === "bluetooth" ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setFormData({ ...formData, printerType: "bluetooth" })}
                  >
                    <Bluetooth className="h-6 w-6" />
                    <span>Web Bluetooth</span>
                  </Button>
                </div>
              </div>

              {formData.printerType === "network" && (
                <div className="space-y-2">
                  <Label htmlFor="printerAddress">Direccion IP de la Impresora</Label>
                  <Input
                    id="printerAddress"
                    value={formData.printerAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, printerAddress: e.target.value })
                    }
                    placeholder="Ej: 192.168.1.100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingresa la direccion IP de tu impresora termica
                  </p>
                </div>
              )}


              {formData.printerType === "rawbt" && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    La conexion RawBT es la opcion mas estable para impresoras PT210 y similares en Android.
                    Requiere que instales la aplicacion gratuita <strong>RawBT</strong> desde la Play Store y la vincules con tu impresora.
                  </p>
                </div>
              )}
              {formData.printerType === "bluetooth" && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Impresion directa por Bluetooth sin necesidad de app externa. Compatible con PT-210 y otras impresoras termicas ESC/POS.
                    </p>
                  </div>
                  
                  {formData.bluetoothDeviceName && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Bluetooth className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Impresora: {formData.bluetoothDeviceName}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestPrinter}
                  disabled={testStatus === "testing"}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testStatus === "testing" ? "Probando..." : "Probar Impresora"}
                </Button>
                {formData.printerType === "bluetooth" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { printerService } = await import('@/services/printer')
                        const device = await printerService.scanBluetoothPrinter()
                        if (device) {
                          setFormData({ 
                            ...formData, 
                            bluetoothDeviceId: device.id,
                            bluetoothDeviceName: device.name 
                          })
                          toast.success(`Impresora "${device.name}" seleccionada`)
                        }
                      } catch (err) {
                        console.error('Error WebBluetooth:', err)
                        toast.error(err instanceof Error ? err.message : 'No se pudo encontrar dispositivo Bluetooth')
                      }
                    }}
                  >
                    <Bluetooth className="h-4 w-4 mr-2" />
                    Buscar Impresora Bluetooth
                  </Button>
                )}
                
                {testStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Conexion exitosa</span>
                  </div>
                )}
                
                {testStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Error de conexion</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impresoras Compatibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold">Epson TM-T20</p>
                  <p className="text-xs text-muted-foreground">USB/Red</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold">Star TSP143</p>
                  <p className="text-xs text-muted-foreground">USB/Red</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold">Bixolon SRP-330</p>
                  <p className="text-xs text-muted-foreground">USB/Red/BT</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold">Generica 58mm</p>
                  <p className="text-xs text-muted-foreground">USB/BT</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Tema de la Aplicacion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="darkMode">Modo Oscuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Activa el tema oscuro para reducir la fatiga visual
                  </p>
                </div>
                <Switch
                  id="darkMode"
                  checked={formData.darkMode}
                  onCheckedChange={handleDarkModeToggle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    !formData.darkMode
                      ? "border-primary bg-white"
                      : "border-muted bg-white/50"
                  }`}
                  onClick={() => handleDarkModeToggle(false)}
                >
                  <div className="h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                    <div className="w-12 h-8 bg-white rounded shadow"></div>
                  </div>
                  <p className="text-center text-sm font-medium text-gray-900">Claro</p>
                </div>
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.darkMode
                      ? "border-primary bg-gray-900"
                      : "border-muted bg-gray-800/50"
                  }`}
                  onClick={() => handleDarkModeToggle(true)}
                >
                  <div className="h-20 bg-gray-800 rounded mb-2 flex items-center justify-center">
                    <div className="w-12 h-8 bg-gray-700 rounded shadow"></div>
                  </div>
                  <p className="text-center text-sm font-medium text-white">Oscuro</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acerca de</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">1.4.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base de Datos</span>
                <span className="font-mono">SQLite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modo</span>
                <span className="font-mono">Offline</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Copias de Seguridad
              </CardTitle>
              <CardDescription>
                Respalda tus datos localmente o restaura una copia anterior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Exportar Datos</p>
                    <p className="text-xs text-muted-foreground">Crea un archivo con toda tu informacion actual</p>
                  </div>
                  <Button variant="outline" onClick={async () => {
                    const res = await exportBackup();
                    if (res.success) toast.success(res.message);
                    else toast.error(res.message);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Importar Datos</p>
                    <p className="text-xs text-muted-foreground">Restaura una copia de seguridad (sobreescribe actual)</p>
                  </div>
                  <div className="flex gap-2">
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
                          const content = event.target?.result as string;
                          const res = await importBackup(content);
                          if (res.success) toast.success(res.message);
                          else toast.error(res.message);
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <Button variant="outline" onClick={() => document.getElementById('backup-input')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Reportar Error</p>
                    <p className="text-xs text-muted-foreground">Envía un problema directamente al desarrollador</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowReportDialog(true)}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reportar
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  <strong>Aviso:</strong> Al importar un respaldo, se borrara toda la informacion actual y se reemplazara por la del archivo. Es recomendable reiniciar la aplicacion despues de importar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Problema</DialogTitle>
            <DialogDescription>
              Describe el error para que podamos solucionarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Resumen corto</Label>
              <Input 
                value={reportTitle} 
                onChange={(e) => setReportTitle(e.target.value)} 
                placeholder="Ej: No conecta la impresora"
              />
            </div>
            <div className="space-y-2">
              <Label>Detalles</Label>
              <Textarea 
                value={reportDetails} 
                onChange={(e) => setReportDetails(e.target.value)} 
                placeholder="Describe qué estabas haciendo cuando ocurrió el error..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancelar</Button>
            <Button 
              onClick={async () => {
                if (!reportTitle || !reportDetails) return toast.error("Completa los campos");
                setIsReporting(true);
                const res = await sendErrorReport(reportTitle, reportDetails);
                setIsReporting(false);
                if (res.success) {
                  toast.success("¡Reporte enviado! Gracias por tu ayuda.");
                  setShowReportDialog(false);
                  setReportTitle("");
                  setReportDetails("");
                } else {
                  toast.error(res.message);
                }
              }}
              disabled={isReporting}
            >
              {isReporting ? "Enviando..." : "Enviar Reporte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
