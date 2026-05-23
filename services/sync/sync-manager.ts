import { supabase } from '@/lib/supabase/client';
import { ensureCompanyAccess } from './company-access';
import { recordAppError } from '@/services/error-logger';
import { SYNC_TABLES, getPendingSyncCount, syncTable, type SyncTableResult } from './sync-config';

export type SyncResult = {
  success: boolean;
  reason?: 'offline' | 'busy' | 'no-session' | 'no-company' | 'error';
  error?: unknown;
  results?: SyncTableResult[];
};

export class SyncManager {
  private static isSyncing = false;
  private static syncMutexTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly SYNC_TIMEOUT_MS = 60000; // 1 minuto timeout
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
    if (this.syncMutexTimeout) clearTimeout(this.syncMutexTimeout);
    this.syncMutexTimeout = setTimeout(() => {
      console.warn('[Sync] Timeout alcanzado, forzando liberación del mutex de sincronización.');
      this.isSyncing = false;
      if (this.syncMutexTimeout) clearTimeout(this.syncMutexTimeout);
    }, this.SYNC_TIMEOUT_MS);
    console.log('[Sync] Iniciando ciclo de sincronización global...');

    try {
      const companyId = await ensureCompanyAccess();
      if (!companyId) {
        console.log('[Sync] No se pudo resolver una compañía para el usuario actual.');
        return { success: false, reason: 'no-company' };
      }

      const results: SyncTableResult[] = [];

      for (const config of SYNC_TABLES) {
        try {
          const tableResult = await syncTable(config, companyId);
          results.push(tableResult);
        } catch (tableError) {
          console.error(`[Sync] Error sincronizando tabla ${config.tableName}:`, tableError);
          results.push({
            tableName: config.tableName,
            pulled: 0,
            pushed: 0,
            skipped: 0,
            latestSync: new Date(0),
          });
        }
      }

      console.log('[Sync] Ciclo de sincronización completado.');
      return { success: true, results };
    } catch (error) {
      const normalizedError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: (error as any)?.cause,
        code: (error as any)?.code,
        details: error
      };

      console.error(
        '[SYNC ERROR]',
        JSON.stringify(normalizedError, null, 2)
      );

      await recordAppError(normalizedError, {
        source: 'sync',
        severity: 'error',
        details: JSON.stringify(normalizedError, null, 2)
      });

      return { success: false, reason: 'error', error };
    } finally {
      this.isSyncing = false;
      if (this.syncMutexTimeout) clearTimeout(this.syncMutexTimeout);
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
