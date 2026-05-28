/**
 * Utilidad de logging segura para producción.
 * Evita fugas de información y reduce el impacto en el rendimiento.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.warn(`[WARN] ${message}`, ...args);
    }
    // Aquí podrías enviar a un servicio de telemetría si fuera necesario
  },
  
  error: (message: string, error?: any, ...args: any[]) => {
    // Los errores siempre se loguean en consola (o un servicio externo) para diagnóstico
    console.error(`[ERROR] ${message}`, error, ...args);
    
    // Si tienes un servicio de reporte de errores (ej. Sentry), lo llamarías aquí
  },
  
  debug: (message: string, ...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
