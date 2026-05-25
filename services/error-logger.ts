import { Capacitor } from '@capacitor/core';

export type AppErrorSeverity = 'error' | 'fatal' | 'warning';

export interface AppErrorContext {
  source: string;
  severity?: AppErrorSeverity;
  details?: string;
  url?: string;
  userAgent?: string;
  platform?: string;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || 'Error desconocido',
      stack: error.stack,
    };
  }

  // Manejar errores de Supabase/Postgrest que a menudo vienen como objetos con propiedad message
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    
    // Si ya es un objeto normalizado por nosotros que tiene message
    if (errObj.message && typeof errObj.message === 'string') {
      return {
        message: errObj.message,
        stack: errObj.stack || errObj.details || errObj.hint || undefined
      };
    }
    
    // Si es el objeto de error crudo de Supabase
    if (errObj.code && errObj.message) {
      return {
        message: String(errObj.message),
        stack: `Code: ${errObj.code} | Details: ${errObj.details || 'none'}`
      };
    }
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    const str = JSON.stringify(error);
    return { message: str === '{}' ? String(error) : str };
  } catch {
    return { message: 'Error desconocido (no serializable)' };
  }
}

export async function recordAppError(error: unknown, context: AppErrorContext): Promise<void> {
  try {
    const normalized = normalizeError(error);
    const platform = context.platform ?? (Capacitor.getPlatform?.() ?? (typeof navigator !== 'undefined' ? navigator.platform : 'web'));
    const url = context.url ?? (typeof window !== 'undefined' ? window.location.href : '');
    const userAgent = context.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

    // Importante: Asegurar que todos los valores sean compatibles con SQLite (string, number o null)
    // Evitar undefined a toda costa para prevenir "No value for type"
    const params = [
      createId(),
      String(context.severity ?? 'error'),
      String(context.source || 'unknown'),
      String(normalized.message),
      normalized.stack ? String(normalized.stack) : null,
      context.details ? String(context.details) : null,
      url ? String(url) : null,
      userAgent ? String(userAgent) : null,
      platform ? String(platform) : null,
    ];

    await execute(
      'INSERT INTO "AppErrorLog" (id, severity, source, message, stack, details, url, userAgent, platform, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      params
    );
  } catch (e) {
    // Si falla el log, al menos lo intentamos imprimir una vez más con el logger original
    // pero sin entrar en bucle infinito de errores
    console.warn('[Logger] No se pudo guardar el error en DB:', e);
  }
}
