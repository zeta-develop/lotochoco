import { useEffect } from 'react';
import { SyncManager } from '@/services/sync/sync-manager';

export function useSync(intervalMs = 60000) {
  useEffect(() => {
    // Iniciar el sincronizador en segundo plano al montar el hook
    SyncManager.startBackgroundSync(intervalMs);

    // Limpiar al desmontar
    return () => {
      SyncManager.stopBackgroundSync();
    };
  }, [intervalMs]);

  // Exponer método manual si se desea forzar desde UI
  const forceSync = () => SyncManager.syncAll();

  return { forceSync };
}
