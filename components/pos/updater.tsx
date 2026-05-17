"use client";

import { useEffect, useState } from "react";
import { Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdater } from "@/hooks/use-updater";

export function Updater() {
  const { isUpdateAvailable, latestVersion, downloadAndInstallUpdate, currentVersion } = useUpdater();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowNotification(true);
    }
  }, [isUpdateAvailable]);

  if (!showNotification) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-5 fade-in-50">
      <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg border border-primary/20 flex flex-col gap-3 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">¡Nueva versión disponible!</h3>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Versión {latestVersion} lista para instalar (Actual: {currentVersion}).
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full mt-1">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={downloadAndInstallUpdate}
          >
            Actualizar ahora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 hover:bg-primary-foreground/10"
            onClick={() => setShowNotification(false)}
          >
            Más tarde
          </Button>
        </div>
      </div>
    </div>
  );
}
