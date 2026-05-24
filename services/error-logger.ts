import { Capacitor } from '@capacitor/core';
import { execute } from '@/lib/db';

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
    if (errObj.message) {
      return {
        message: errObj.message,
        stack: errObj.details || errObj.hint || undefined
      };
    }
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Error desconocido' };
  }
}

export async function recordAppError(error: unknown, context: AppErrorContext): Promise<void> {
  try {
    const normalized = normalizeError(error);
    const platform = context.platform ?? (Capacitor.getPlatform?.() ?? (typeof navigator !== 'undefined' ? navigator.platform : 'web'));
    const url = context.url ?? (typeof window !== 'undefined' ? window.location.href : undefined);
    const userAgent = context.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined);

    await execute(
      'INSERT INTO "AppErrorLog" (id, severity, source, message, stack, details, url, userAgent, platform, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [
        createId(),
        context.severity ?? 'error',
        context.source,
        normalized.message,
        normalized.stack ?? null,
        context.details ?? null,
        url ?? null,
        userAgent ?? null,
        platform ?? null,
      ]
    );
  } catch {
    // No lanzamos desde el logger para evitar bucles de errores.
  }
}
