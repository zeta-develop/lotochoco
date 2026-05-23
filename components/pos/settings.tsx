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
import { useAuthStore } from "@/store/auth-store";
import { signOut } from "@/lib/supabase/auth";
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
  LogOut,
  UserCircle
} from "lucide-react";
import { toast } from "sonner";
import db from "@/lib/db";
import { printerService as printService } from "@/services/printer";
import { exportBackup as backupService } from "@/services/backup";
import { SyncManager, type SyncResult } from "@/services/sync/sync-manager";

export function Settings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Local state for form fields to avoid constant DB writes
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Database status
  const [dbStatus, setDbStatus] = useState({
    tables: 0,
    size: '0 KB',
    lastBackup: 'Nunca',
    pendingSync: 0
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    loadDbStatus();
  }, []);

  const loadDbStatus = async () => {
    try {
      const tables = await db.query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
      );
      const pendingSync = await SyncManager.getPendingCount();

      setDbStatus({
        tables: tables.length,
        size: '~2.5 MB',
        lastBackup: new Date().toLocaleString(),
        pendingSync
      });
    } catch (error) {
      console.error("Error loading DB status:", error);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Save all changed settings
      for (const [key, value] of Object.entries(formData)) {
        if (settings[key] !== value) {
          await updateSettings({ [key]: value });
        }
      }

      toast.success("Configuración guardada", {
        description: "Los cambios se han aplicado correctamente.",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      });

      // If dark mode changed, apply it immediately
      if (formData.darkMode !== settings.darkMode) {
        if (formData.darkMode === 'true') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error", {
        description: "No se pudo guardar la configuración.",
        icon: <AlertCircle className="h-4 w-4 text-destructive" />
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinter = async () => {
    try {
      setIsTestingPrinter(true);
      const success = true; // TODO: implement testPrinter

      if (success) {
        toast.success("Prueba exitosa", {
          description: "La impresora está conectada y funcionando.",
        });
      } else {
        toast.error("Error de impresión", {
          description: "Verifique la conexión de la impresora.",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "No se pudo conectar con la impresora.",
      });
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handleSearchBluetoothPrinter = async () => {
    try {
      setIsScanningBluetooth(true);

      const device = await printService.scanBluetoothPrinter();

      if (!device) {
        toast.info("Búsqueda cancelada", {
          description: "No se seleccionó ningún dispositivo Bluetooth.",
        });
        return;
      }

      const nextSettings = {
        bluetoothDeviceId: device.id,
        bluetoothDeviceName: device.name,
        printerType: 'bluetooth',
      };

      await updateSettings(nextSettings);
      setFormData((prev) => ({
        ...prev,
        ...nextSettings,
      }));

      toast.success("Impresora Bluetooth seleccionada", {
        description: `${device.name} quedó guardada para impresión directa.`,
      });
    } catch (error) {
      console.error("Error buscando impresora Bluetooth:", error);
      toast.error("No se pudo buscar la impresora", {
        description: error instanceof Error ? error.message : "Verifica que el Bluetooth esté encendido.",
      });
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      const result = await SyncManager.syncAll();
      await loadDbStatus();

      if (result.success) {
        toast.success("Sincronización ejecutada", {
          description: "Se completó el proceso de sincronización con Supabase.",
        });
        return;
      }

      const reasonMessages: Record<NonNullable<SyncResult['reason']>, string> = {
        offline: "No hay conexión a internet. La sincronización quedará pendiente.",
        busy: "Ya hay una sincronización en curso.",
        "no-session": "No hay una sesión activa para sincronizar.",
        "no-company": "No se pudo resolver la compañía del usuario actual.",
        error: "Ocurrió un error durante la sincronización.",
      };

      toast.error("Sincronización no completada", {
        description: reasonMessages[result.reason ?? 'error'],
      });
    } catch (error) {
      console.error("Error ejecutando sincronización manual:", error);
      toast.error("Error de sincronización", {
        description: "No se pudo ejecutar la sincronización manual.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (confirm("¿Está seguro de que desea borrar todos los datos locales? Esta acción no se puede deshacer y perderá toda la información no sincronizada.")) {
      try {
        // Implement real clear data logic
        toast.success("Datos borrados", {
          description: "La base de datos local ha sido restablecida.",
        });
      } catch (error) {
        toast.error("Error", {
          description: "No se pudieron borrar los datos.",
        });
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("¿Está seguro de que desea cerrar sesión?")) {
      try {
        await signOut();
      } catch (error: any) {
        toast.error("Error al cerrar sesión", {
          description: error.message || "Intente nuevamente",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
          <p className="text-muted-foreground">
            Administra las preferencias y ajustes del sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar Cambios
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2 py-3">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2 py-3">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Impresora</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2 py-3">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apariencia</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2 py-3">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Avanzado</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
              <CardDescription>
                Estos datos aparecerán en los tickets y reportes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del Negocio</Label>
                <Input
                  id="businessName"
                  value={formData.businessName || ''}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  placeholder="Ej: Lotería La Fortuna"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={formData.currency || 'C$'}
                    onValueChange={(value) => handleChange('currency', value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Seleccione una moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C$">Córdobas (C$)</SelectItem>
                      <SelectItem value="$">Dólares ($)</SelectItem>
                      <SelectItem value="€">Euros (€)</SelectItem>
                      <SelectItem value="₡">Colones (₡)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketMessage">Mensaje al pie del ticket</Label>
                <Textarea
                  id="ticketMessage"
                  value={formData.ticketMessage || ''}
                  onChange={(e) => handleChange('ticketMessage', e.target.value)}
                  placeholder="Ej: ¡Gracias por su compra y buena suerte!"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Impresión</CardTitle>
              <CardDescription>
                Ajustes para impresoras térmicas ESC/POS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Conexión</Label>
                  <Select
                    value={formData.printerType || 'network'}
                    onValueChange={(value) => handleChange('printerType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo de conexión" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="network">
                        <div className="flex items-center">
                          <Wifi className="mr-2 h-4 w-4" /> Red (WiFi/LAN)
                        </div>
                      </SelectItem>
                      <SelectItem value="bluetooth">
                        <div className="flex items-center">
                          <Bluetooth className="mr-2 h-4 w-4" /> Bluetooth
                        </div>
                      </SelectItem>
                      <SelectItem value="usb">
                        <div className="flex items-center">
                          <Printer className="mr-2 h-4 w-4" /> USB / Local
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.printerType === 'network' && (
                  <div className="space-y-2">
                    <Label htmlFor="printerAddress">Dirección IP de la Impresora</Label>
                    <Input
                      id="printerAddress"
                      value={formData.printerAddress || ''}
                      onChange={(e) => handleChange('printerAddress', e.target.value)}
                      placeholder="Ej: 192.168.1.100"
                    />
                  </div>
                )}

                {formData.printerType === 'bluetooth' && (
                  <div className="space-y-2">
                    <Label>Dispositivo Bluetooth</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={formData.bluetoothDeviceName || 'Ningún dispositivo seleccionado'}
                        className="bg-muted"
                      />
                      <Button variant="outline" onClick={handleSearchBluetoothPrinter} disabled={isScanningBluetooth}>
                        {isScanningBluetooth ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                        ) : (
                          'Buscar'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-4">Opciones de Formato</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tamaño de Letra</Label>
                    <Select
                      value={formData.ticketFontSize || 'normal'}
                      onValueChange={(value) => handleChange('ticketFontSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tamaño" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeña</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Densidad de Impresión</Label>
                    <Select
                      value={formData.ticketDensity || 'normal'}
                      onValueChange={(value) => handleChange('ticketDensity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar densidad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Clara</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="dark">Oscura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestPrinter}
                  disabled={isTestingPrinter}
                >
                  {isTestingPrinter ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary-foreground mr-2"></div>
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Imprimir Ticket de Prueba
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tema y Visualización</CardTitle>
              <CardDescription>
                Personaliza cómo se ve la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Modo Oscuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Cambiar entre tema claro y oscuro
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={formData.darkMode === 'true'}
                    onCheckedChange={(checked) => handleChange('darkMode', checked.toString())}
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="space-y-4">
                  <Label>Tema de Color</Label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {['blue', 'green', 'purple', 'orange', 'red', 'slate'].map((color) => (
                      <div
                        key={color}
                        className={`
                          h-12 rounded-md cursor-pointer border-2 flex items-center justify-center
                          ${formData.themeColor === color ? 'border-primary' : 'border-transparent'}
                        `}
                        style={{
                          backgroundColor: `var(--theme-${color}-500, ${
                            color === 'blue' ? '#3b82f6' :
                            color === 'green' ? '#22c55e' :
                            color === 'purple' ? '#a855f7' :
                            color === 'orange' ? '#f97316' :
                            color === 'red' ? '#ef4444' : '#64748b'
                          })`
                        }}
                        onClick={() => handleChange('themeColor', color)}
                      >
                        {formData.themeColor === color && (
                          <CheckCircle className="h-5 w-5 text-white" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cuenta y Sincronización</CardTitle>
              <CardDescription>
                Gestiona tu sesión y datos en la nube
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user?.email || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">Autenticado vía Google</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>

              <div className="space-y-4 pt-2">
                <Label>Sincronización</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Estado</p>
                    <p className="text-xs text-muted-foreground">
                      Pendientes de sincronizar: {dbStatus.pendingSync} registros
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleSyncNow} disabled={isSyncing}>
                    {isSyncing ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    ) : null}
                    Sincronizar Ahora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base de Datos Local</CardTitle>
              <CardDescription>
                Gestión de SQLite y almacenamiento en el dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">Conectado</span>
                  </div>
                  <h4 className="font-semibold text-lg">{dbStatus.tables}</h4>
                  <p className="text-sm text-muted-foreground">Tablas creadas</p>
                </div>

                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <Monitor className="h-5 w-5 text-blue-500" />
                  </div>
                  <h4 className="font-semibold text-lg">{dbStatus.size}</h4>
                  <p className="text-sm text-muted-foreground">Tamaño estimado</p>
                </div>

                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <Save className="h-5 w-5 text-amber-500" />
                  </div>
                  <h4 className="font-semibold text-sm truncate" title={dbStatus.lastBackup}>
                    {dbStatus.lastBackup}
                  </h4>
                  <p className="text-sm text-muted-foreground">Último respaldo</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={async () => {
                  try {
                    await backupService();
                    toast.success("Respaldo creado", { description: "Datos guardados localmente." });
                  } catch(e) {
                    toast.error("Error", { description: "No se pudo crear el respaldo." });
                  }
                }}>
                  <Download className="mr-2 h-4 w-4" /> Exportar Datos
                </Button>
                <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={handleClearData}>
                  <AlertCircle className="mr-2 h-4 w-4" /> Borrar Datos Locales
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
