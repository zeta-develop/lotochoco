import { supabase } from '@/lib/supabase/client';
import { ensureCompanyAccess } from './company-access';
import { SYNC_TABLES, getPendingSyncCount, syncTable, type SyncTableResult } from './sync-config';

export type SyncResult = {
  success: boolean;
  reason?: 'offline' | 'busy' | 'no-session' | 'no-company' | 'error';
  error?: unknown;
  results?: SyncTableResult[];
};

export class SyncManager {
  private static isSyncing = false;
  private static syncInterval: ReturnType<typeof setInterval> | null = null;

  static async syncAll(): Promise<SyncResult> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[Sync] Dispositivo offline, sincronización pospuesta.');
      return { success: false, reason: 'offline' };
    }

    if (this.isSyncing) {
      console.log('[Sync] Sincronización en progreso, saltando ciclo.');
      return { success: false, reason: 'busy' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('[Sync] No hay sesión activa, sincronización omitida.');
      return { success: false, reason: 'no-session' };
    }

    this.isSyncing = true;
    console.log('[Sync] Iniciando ciclo de sincronización global...');

    try {
      const companyId = await ensureCompanyAccess();
      if (!companyId) {
        console.log('[Sync] No se pudo resolver una compañía para el usuario actual.');
        return { success: false, reason: 'no-company' };
      }

      const results: SyncTableResult[] = [];

      for (const config of SYNC_TABLES) {
        const tableResult = await syncTable(config, companyId);
        results.push(tableResult);
      }

      console.log('[Sync] Ciclo de sincronización completado.');
      return { success: true, results };
    } catch (error) {
      console.error('[Sync] Error durante la sincronización global:', error);
      return { success: false, reason: 'error', error };
    } finally {
      this.isSyncing = false;
    }
  }

  static async getPendingCount(): Promise<number> {
    return getPendingSyncCount(SYNC_TABLES);
  }

  static startBackgroundSync(intervalMs = 60000) {
    if (this.syncInterval) return;

    this.syncAll();

    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Sync] Red recuperada, forzando sincronización.');
        this.syncAll();
      });
    }

    console.log(`[Sync] Sincronización en segundo plano iniciada (intervalo: ${intervalMs}ms).`);
  }

  static stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] Sincronización en segundo plano detenida.');
    }
  }
}
