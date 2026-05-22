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

      const isActiveNum = Number(remote.is_active) ? 1 : 0;

      if (existingRows.length > 0) {
        // Update local
        await execute(
          'UPDATE Game SET name = ?, isActive = ?, digitCount = ?, multiplier = ?, updatedAt = ?, deletedAt = ?, isDirty = 0 WHERE id = ?',
          [remote.name, isActiveNum, remote.digit_count, remote.multiplier, remote.updated_at, remote.deleted_at, remote.id]
        );
      } else {
        // Insert local
        await execute(
          'INSERT INTO Game (id, name, isActive, digitCount, multiplier, createdAt, updatedAt, deletedAt, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [remote.id, remote.name, isActiveNum, remote.digit_count, remote.multiplier, remote.created_at, remote.updated_at, remote.deleted_at]
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
      const payload = dirtyLocalGames.map(g => ({
        id: g.id,
        name: g.name,
        is_active: Boolean(g.isActive) ? 1 : 0,
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

  // ==========================================
  // SINCRONIZACIÓN DE DRAW SCHEDULES
  // ==========================================
  console.log('[Sync] Iniciando sincronización de DrawSchedules...');
  const syncStateSched = await query('SELECT lastSync FROM SyncState WHERE tableName = ?', ['DrawSchedule']);
  const lastSyncSchedStr = syncStateSched.length > 0 ? syncStateSched[0].lastSync : '1970-01-01T00:00:00.000Z';
  const lastSyncSchedDate = new Date(lastSyncSchedStr);

  // === PULL (Descarga) ===
  const { data: remoteSchedules, error: pullSchedError } = await supabase
    .from('draw_schedules')
    .select('*')
    .gt('updated_at', lastSyncSchedStr)
    .order('updated_at', { ascending: true });

  if (pullSchedError) {
    console.error('[Sync] Error en Pull de DrawSchedules:', pullSchedError);
    throw pullSchedError;
  }

  let latestSchedRemoteSync = lastSyncSchedDate;

  if (remoteSchedules && remoteSchedules.length > 0) {
    console.log(`[Sync] Encontrados ${remoteSchedules.length} horarios modificados remotamente.`);
    for (const remote of remoteSchedules) {
      const existingRows = await query<DrawSchedule>('SELECT * FROM DrawSchedule WHERE id = ?', [remote.id]);

      const isActiveNum = Number(remote.is_active) ? 1 : 0;

      // Solo insertamos si el gameId ya existe localmente (integridad referencial de SQLite)
      const gameExists = await query('SELECT id FROM Game WHERE id = ?', [remote.game_id]);
      if (gameExists.length === 0) {
         console.warn(`[Sync] Saltando DrawSchedule ${remote.id} porque no existe el Game local ${remote.game_id}`);
         continue;
      }

      if (existingRows.length > 0) {
        await execute(
          'UPDATE DrawSchedule SET gameId = ?, name = ?, time = ?, isActive = ?, updatedAt = ?, deletedAt = ?, isDirty = 0 WHERE id = ?',
          [remote.game_id, remote.name, remote.time, isActiveNum, remote.updated_at, remote.deleted_at, remote.id]
        );
      } else {
        await execute(
          'INSERT INTO DrawSchedule (id, gameId, name, time, isActive, createdAt, updatedAt, deletedAt, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [remote.id, remote.game_id, remote.name, remote.time, isActiveNum, remote.created_at, remote.updated_at, remote.deleted_at]
        );
      }

      const remoteUpdatedAt = new Date(remote.updated_at);
      if (remoteUpdatedAt > latestSchedRemoteSync) {
        latestSchedRemoteSync = remoteUpdatedAt;
      }
    }
  }

  // === PUSH (Subida) ===
  const dirtyLocalSchedules = await query<DrawSchedule & { deletedAt?: Date | null }>('SELECT * FROM DrawSchedule WHERE isDirty = 1');

  if (dirtyLocalSchedules.length > 0) {
    console.log(`[Sync] Subiendo ${dirtyLocalSchedules.length} horarios modificados localmente.`);

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const payload = dirtyLocalSchedules.map(s => ({
        id: s.id,
        game_id: s.gameId,
        name: s.name,
        time: s.time,
        is_active: Boolean(s.isActive) ? 1 : 0,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        deleted_at: s.deletedAt
      }));

      const { error: pushError } = await supabase.from('draw_schedules').upsert(payload);

      if (pushError) {
        console.error('[Sync] Error en Push de DrawSchedules:', pushError);
      } else {
        const ids = dirtyLocalSchedules.map(s => `'${s.id}'`).join(',');
        await execute(`UPDATE DrawSchedule SET isDirty = 0 WHERE id IN (${ids})`);
      }
    }
  }

  // Actualizar Watermark si hubo pull
  if (remoteSchedules && remoteSchedules.length > 0) {
    await execute(
      'INSERT INTO SyncState (tableName, lastSync) VALUES (?, ?) ON CONFLICT(tableName) DO UPDATE SET lastSync = ?',
      ['DrawSchedule', latestSchedRemoteSync.toISOString(), latestSchedRemoteSync.toISOString()]
    );
  }
}
