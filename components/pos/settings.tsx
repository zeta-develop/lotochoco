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
import { printerService as printService } from "@/services/printer";
import { exportBackup as backupService } from "@/services/backup";

export function Settings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);

  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: String(value) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinter = async () => {
    setIsTestingPrinter(true);
    try {
      const type = formData.printerType || "network";
      const address = formData.printerAddress || "";

      if (type === "network" && !address) {
        toast.error("Dirección IP requerida", {
          description: "Ingresa la IP de la impresora de red.",
        });
        return;
      }

      const success = await printService.testPrinter(type as any, address);

      if (success) {
        toast.success("Prueba enviada", {
          description: "La impresora debería imprimir un ticket de prueba en unos segundos.",
        });
      } else {
        throw new Error("No se pudo conectar a la impresora.");
      }
    } catch (error) {
      console.error("Error probando impresora:", error);
      toast.error("Error de impresión", {
        description: error instanceof Error ? error.message : "Verifica la configuración.",
      });
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handleScanBluetooth = async () => {
    setIsScanningBluetooth(true);
    try {
      toast.info("Escaneando dispositivos...", {
        description: "Asegúrate de que la impresora esté encendida y emparejada con tu dispositivo Android.",
      });

      await new Promise(r => setTimeout(r, 2000));

      toast.success("Búsqueda completada", {
        description: "En versiones futuras, aquí aparecerá la lista de dispositivos encontrados.",
      });
    } catch (error) {
      console.error("Error escaneando Bluetooth:", error);
      toast.error("Error de Bluetooth", {
        description: error instanceof Error ? error.message : "Verifica que el Bluetooth esté encendido.",
      });
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 w-full h-auto gap-2 p-1 bg-transparent">
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Store className="h-4 w-4 mr-2 hidden sm:block" />
            General
          </TabsTrigger>
          <TabsTrigger value="printer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Printer className="h-4 w-4 mr-2 hidden sm:block" />
            Impresora
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserCircle className="h-4 w-4 mr-2 hidden sm:block" />
            Cuenta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
              <CardDescription>
                Estos datos aparecerán en los tickets y reportes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del Negocio</Label>
                <Input
                  id="businessName"
                  value={formData.businessName || ""}
                  onChange={(e) => handleChange("businessName", e.target.value)}
                  placeholder="Ej. Lotería La Fortuna"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketMessage">Mensaje en Ticket (Pie de página)</Label>
                <Textarea
                  id="ticketMessage"
                  value={formData.ticketMessage || ""}
                  onChange={(e) => handleChange("ticketMessage", e.target.value)}
                  placeholder="¡Buena suerte! Gracias por su compra."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printer" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Impresión</CardTitle>
              <CardDescription>
                Conecta tu impresora térmica Bluetooth o de Red.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Conexión</Label>
                <Select
                  value={formData.printerType || "network"}
                  onValueChange={(v) => handleChange("printerType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de impresora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">
                      <div className="flex items-center">
                        <Wifi className="h-4 w-4 mr-2" />
                        Impresora de Red / Wi-Fi
                      </div>
                    </SelectItem>
                    <SelectItem value="bluetooth">
                      <div className="flex items-center">
                        <Bluetooth className="h-4 w-4 mr-2" />
                        Impresora Bluetooth
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" variant="outline" onClick={handleTestPrinter} disabled={isTestingPrinter}>
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingPrinter ? "Imprimiendo..." : "Prueba de Impresión"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tu Cuenta</CardTitle>
              <CardDescription>
                Sesión actual en la nube de Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border rounded-lg bg-card space-y-2">
                 <p><strong>Email:</strong> {user?.email}</p>
                 <Button variant="destructive" onClick={() => signOut()}>
                   <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
