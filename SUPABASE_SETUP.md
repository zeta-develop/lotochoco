# Configuración de Supabase

La interfaz se empaqueta localmente en Android, pero las operaciones requieren conexión a Supabase. El carrito persiste una solicitud pendiente para recuperar la misma venta después de un fallo de red; no hay una cola de ventas sin conexión.

## Instalación nueva

Ejecutar `supabase_schema.sql` una sola vez en una base nueva. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` al compilar. La clave pública no sustituye las políticas de acceso.

## Actualización de una instalación existente

1. Hacer una copia de seguridad y probar la restauración en staging.
2. Revisar las membresías existentes: el esquema anterior permitía asignarse empresas y roles arbitrarios. El nuevo esquema no revoca automáticamente membresías históricas.
3. Revisar datos heredados con `supabase/preflight.sql`. Resolver importes nulos/no finitos, empresas nulas, relaciones entre empresas, folios repetidos, varias cajas abiertas y resultados repetidos antes de migrar. No eliminar ventas o premios para hacer pasar las restricciones: conciliarlos con los registros de negocio.
4. Establecer la zona horaria IANA de cada empresa antes de migrar los resultados. La columna nueva usa UTC por defecto. En instalaciones de Nicaragua, por ejemplo, el operador autorizado puede preparar `time_zone='America/Managua'`. La app usa esta zona en servidor para relacionar tickets y sorteos; no depende de la zona enviada por un teléfono.
5. Ejecutar **una sola vez** `supabase/migrations/202610060001_secure_pos.sql` desde el SQL Editor o la herramienta de migraciones. Incluye una transacción: cualquier inconsistencia aborta todos los cambios. No volver a ejecutar el esquema completo sobre producción.
6. Revisar las políticas RLS reales y las funciones expuestas, y probar la aplicación en staging con owner, admin, manager y user. Una vez verificado, distribuir el cliente actualizado. El cliente anterior deja de poder escribir directamente en las tablas financieras.

Preparación opcional de zona para una base existente (antes del paso 5):

```sql
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC';
-- Sustituir por la empresa y zona verificadas; ejecutar como operador autorizado.
UPDATE public.companies SET time_zone = 'America/Managua' WHERE id = '<company-uuid>'::uuid;
```

No cambiar la zona de una empresa con resultados históricos sin planificar la recalculación de sus días de sorteo y verificar las restricciones de unicidad.

## Permisos y empresas

- Cada usuario ve únicamente empresas de las que ya es miembro. La app exige seleccionar empresa si tiene más de una.
- Crear una empresa registra al creador como propietario mediante un trigger seguro.
- Altas de usuarios en empresas existentes se realizan por un operador de confianza en Supabase. No se permite autoincorporación desde el cliente.
- Owner/admin administran juegos y configuración. Los roles se cambian mediante `pos_set_member_role`; solo owner puede asignar o modificar admin y no se cambia owner ni el rol propio mediante esa RPC.
- Owner/admin/manager procesan resultados, pagan premios y anulan tickets. Los miembros pueden vender y operar caja mediante las RPC autorizadas.
- La lectura de datos operativos es compartida dentro de la empresa. No se promete aislamiento por vendedor ni se ofrecen concesiones de acceso que no se apliquen en servidor.
- Las tablas financieras y de auditoría no admiten escrituras directas desde el cliente. Las RPC comprueban identidad y empresa, fijan `search_path` y utilizan un bloqueo por empresa para serializar operaciones contables.

Las funciones y permisos siguen las recomendaciones de [Supabase para funciones de base de datos](https://supabase.com/docs/guides/database/functions). Las operaciones contables usan [bloqueos transaccionales de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).

## Datos anteriores a la migración

No se inventa la caja original de tickets históricos. Sus campos `cash_session_id`, `request_id` y `request_payload` nuevos quedan nulos. Una anulación de esos tickets se rechaza hasta que un operador concilie y asocie la caja original correcta. Los importes se convierten a decimal fijo de dos posiciones; guardar copia previa para conciliar diferencias de redondeo.

Las jugadas nuevas conservan el multiplicador vigente al vender; en jugadas históricas sin snapshot se utiliza el juego existente, por lo que conviene conciliar premios antes de cambiar multiplicadores. La venta se cierra al llegar la hora configurada de sorteo, según la zona de la empresa.

Tampoco se reparan automáticamente saldos históricos incorrectos o premios duplicados. Primero se verifican y concilian con caja real. Las restricciones nuevas evitan repetir esos defectos en operaciones futuras.

## Pruebas locales

Usar una base **desechable**, nunca producción. `tests/sql/bootstrap.sql` crea fixtures de Supabase Auth para PostgreSQL local; no se ejecuta en un proyecto Supabase real.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/bootstrap.sql -f supabase_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/financial-regressions.sql
python3 scripts/test-sql-concurrency.py
```

La última prueba necesita `DATABASE_URL` exportada. Comprueba reintentos, folios, importes concurrentes, anulación, resultados y pagos. La suite SQL también valida aislamiento, roles, rollback por un fallo contable y bloqueo de resultados duplicados.

## Migración desde GitHub Actions

El workflow manual `Supabase migration with encrypted backup` utiliza `SUPABASE_DB_URL` del entorno `LotoChoco`. Ejecutar primero en modo `preflight`: genera un respaldo de los esquemas public/auth y los resultados de revisión, cifrados con `SUPABASE_BACKUP_PASSWORD`. El artefacto caduca a los 30 días: descargarlo y conservarlo en almacenamiento protegido. La contraseña tiene respaldo local en `/root/lotochoco-replacement-signing/backup-password`. Revisar y probar el respaldo antes del modo `apply`; no aplicar la migración repetidamente. La zona horaria y las membresías históricas necesitan verificación previa. El workflow no las cambia automáticamente.
