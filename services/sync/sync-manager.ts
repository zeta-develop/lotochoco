import { syncGames } from './game-sync';
import { syncResults } from './result-sync';
import { ensureCompanyAccess } from './company-access';
import { supabase } from '@/lib/supabase/client';

export type SyncResult = {
  success: boolean;
  reason?: 'offline' | 'busy' | 'no-session' | 'no-company' | 'error';
  error?: unknown;
};

export class SyncManager {
  private static isSyncing = false;
  private static syncInterval: ReturnType<typeof setInterval> | null = null;

  static async syncAll(): Promise<SyncResult> {
    // Si no hay red, abortamos silenciosamente (Offline First)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[Sync] Dispositivo offline, sincronización pospuesta.');
      return { success: false, reason: 'offline' };
    }

    if (this.isSyncing) {
      console.log('[Sync] Sincronización en progreso, saltando ciclo.');
      return { success: false, reason: 'busy' };
    }

    // Comprobar si hay sesión activa (solo sincronizar si estamos logueados)
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

      // Fase 9: Implementación Gradual (Solo Game y Result)
      await syncGames(companyId);
      await syncResults();

      console.log('[Sync] Ciclo de sincronización completado.');
      return { success: true };
    } catch (error) {
      console.error('[Sync] Error durante la sincronización global:', error);
      // Falla silenciosamente en UI, permite que los componentes sigan usando SQLite
      return { success: false, reason: 'error', error };
    } finally {
      this.isSyncing = false;
    }
  }

  static startBackgroundSync(intervalMs = 60000) {
    if (this.syncInterval) return;

    // Sincronizar al iniciar
    this.syncAll();

    // Configurar ciclo recurrente
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);

    // Si la plataforma soporta eventos de online, suscribirse
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
