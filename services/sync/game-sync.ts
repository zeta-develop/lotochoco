import { supabase } from '@/lib/supabase/client';
import { query, execute } from '@/lib/db';
import type { Game, DrawSchedule } from '@/lib/types';
import { dbEvents } from '@/lib/events';

export async function syncGames() {
  console.log('[Sync] Iniciando sincronización de Games...');

  // 1. Obtener el Watermark local para Games
  const syncStateRows = await query('SELECT lastSync FROM SyncState WHERE tableName = ?', ['Game']);
  const lastSyncStr = syncStateRows.length > 0 ? syncStateRows[0].lastSync : '1970-01-01T00:00:00.000Z';
  const lastSyncDate = new Date(lastSyncStr);

  // === PULL (Descarga) ===
  const { data: remoteGames, error: pullError } = await supabase
    .from('games')
    .select('*')
    .gt('updated_at', lastSyncStr)
    .order('updated_at', { ascending: true });

  if (pullError) {
    console.error('[Sync] Error en Pull de Games:', pullError);
    throw pullError;
  }

  let latestRemoteSync = lastSyncDate;

  if (remoteGames && remoteGames.length > 0) {
    console.log(`[Sync] Encontrados ${remoteGames.length} juegos modificados remotamente.`);
    for (const remote of remoteGames) {
      // Intentar actualizar / insertar localmente (Server Wins en caso de conflicto temporal)
      // En un caso real LWW revisaríamos el updatedAt local vs remoto, pero por simplicidad el pull remoto tiene prioridad
      const existingRows = await query<Game>('SELECT * FROM Game WHERE id = ?', [remote.id]);

      if (existingRows.length > 0) {
        // Update local
        await execute(
          'UPDATE Game SET name = ?, isActive = ?, digitCount = ?, multiplier = ?, updatedAt = ?, deletedAt = ?, isDirty = 0 WHERE id = ?',
          [remote.name, remote.is_active, remote.digit_count, remote.multiplier, remote.updated_at, remote.deleted_at, remote.id]
        );
      } else {
        // Insert local
        await execute(
          'INSERT INTO Game (id, name, isActive, digitCount, multiplier, createdAt, updatedAt, deletedAt, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [remote.id, remote.name, remote.is_active, remote.digit_count, remote.multiplier, remote.created_at, remote.updated_at, remote.deleted_at]
        );
      }

      const remoteUpdatedAt = new Date(remote.updated_at);
      if (remoteUpdatedAt > latestRemoteSync) {
        latestRemoteSync = remoteUpdatedAt;
      }
    }
    dbEvents.emit('games:changed');
  }

  // === PUSH (Subida) ===
  const dirtyLocalGames = await query<Game & { deletedAt?: Date | null }>('SELECT * FROM Game WHERE isDirty = 1');

  if (dirtyLocalGames.length > 0) {
    console.log(`[Sync] Subiendo ${dirtyLocalGames.length} juegos modificados localmente.`);

    // Obtenemos la sesión actual de Supabase
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // Necesitamos asegurar que company_id esté presente o el backend se encargue a través del JWT o profile.
      // Para este código asumo que RLS o un trigger en Supabase manejará el `company_id` basado en el `auth.uid()`,
      // o que se debe enviar un company_id explícito. Lo dejaremos genérico.
      const payload = dirtyLocalGames.map(g => ({
        id: g.id,
        name: g.name,
        is_active: g.isActive,
        digit_count: g.digitCount,
        multiplier: g.multiplier,
        created_at: g.createdAt,
        updated_at: g.updatedAt,
        deleted_at: g.deletedAt
      }));

      const { error: pushError } = await supabase.from('games').upsert(payload);

      if (pushError) {
        console.error('[Sync] Error en Push de Games:', pushError);
      } else {
        // Marcar locales como limpios
        const ids = dirtyLocalGames.map(g => `'${g.id}'`).join(',');
        await execute(`UPDATE Game SET isDirty = 0 WHERE id IN (${ids})`);
      }
    }
  }

  // Actualizar Watermark si hubo pull
  if (remoteGames && remoteGames.length > 0) {
    await execute(
      'INSERT INTO SyncState (tableName, lastSync) VALUES (?, ?) ON CONFLICT(tableName) DO UPDATE SET lastSync = ?',
      ['Game', latestRemoteSync.toISOString(), latestRemoteSync.toISOString()]
    );
  }

  // === NOTA: Aquí iría también la sincronización de DrawSchedule ===
  // Para simplificar esta iteración inicial, nos centraremos en el cascarón de Game.
}
