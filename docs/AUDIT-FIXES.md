# Correcciones de la auditoría

Los cambios están subidos a la rama `main` de GitHub. La migración de Supabase se aplicó desde PrestaFacil el 6 de octubre de 2026; ver [DEPLOYMENT-20261006.md](DEPLOYMENT-20261006.md) para validación, conservación de datos y conciliación pendiente.

- **Seguridad y aislamiento:** políticas RLS por empresa, comprobación de pertenencia, cambios de rol protegidos, OAuth PKCE y limpieza de datos locales al cambiar de cuenta.
- **Operaciones financieras:** ventas, anulaciones, premios y caja mediante transacciones RPC, reintentos idempotentes, bloqueo concurrente, importes decimales y multiplicador conservado por jugada.
- **Resultados e informes:** procesamiento completo de las jugadas, resultados únicos por sorteo y fecha, cierre de ventas según hora del servidor e informes calculados en el backend.
- **Aplicación móvil:** dependencias de Capacitor alineadas, impresión sin falsos éxitos, reimpresión identificada, actualización sin retrocesos y recuperación de descargas fallidas.
- **Distribución:** material de firma retirado del árbol de trabajo, configuración mediante secretos, controles de CI y publicaciones en borrador.
- **Interfaz:** selección explícita de empresa y eliminación de indicadores que prometían permisos u operaciones offline inexistentes.

## Validación realizada

- TypeScript y ESLint sin errores.
- 44 tests del cliente aprobados.
- Compilación web estática y sincronización Android aprobadas.
- Compilación Android release aprobada en GitHub Actions con Java 21, SDK 36 y firma nueva; APK 1.8.7 disponible en borrador `v1.8.7-175`.
- Esquema nuevo y migración desde el esquema original comprobados en PostgreSQL local.
- Regresiones financieras, aislamiento por empresa y pruebas concurrentes aprobadas.
- Diferencias sin errores de espacios (`git diff --check`).

## Aplicación y comprobaciones pendientes

1. Seguir [SUPABASE_SETUP.md](../SUPABASE_SETUP.md), revisar los datos históricos y aplicar `supabase/migrations/202610060001_secure_pos.sql` en Supabase. Configurar la zona horaria de cada empresa antes de operar.
2. Seguir [SIGNING-RECOVERY.md](SIGNING-RECOVERY.md) para reemplazar la firma comprometida. Retirar los archivos del árbol de trabajo no elimina las copias del historial Git.
3. Probar OAuth, instalación y la impresora en dispositivos reales. La compilación con Android SDK ya fue verificada en GitHub Actions; la transición desde la firma anterior sigue pendiente de validación en un dispositivo.

La conexión directa de Supabase es IPv6. El primer intento desde GitHub no pudo alcanzarla y no modificó producción. Se completó el respaldo y la migración desde la VPS PrestaFacil, con `America/Managua` y preparación transaccional validada sobre una copia del respaldo real.

No se modificaron automáticamente saldos ni registros financieros históricos.
