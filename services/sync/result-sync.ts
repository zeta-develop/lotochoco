import { supabase } from '@/lib/supabase/client';
import { query, execute } from '@/lib/db';
import type { Result } from '@/lib/types';
import { dbEvents } from '@/lib/events';

export async function syncResults() {
  console.log('[Sync] Iniciando sincronización de Results...');

  const syncStateRows = await query('SELECT lastSync FROM SyncState WHERE tableName = ?', ['Result']);
  const lastSyncStr = syncStateRows.length > 0 ? syncStateRows[0].lastSync : '1970-01-01T00:00:00.000Z';
  const lastSyncDate = new Date(lastSyncStr);

  // === PULL (Descarga) ===
  const { data: remoteResults, error: pullError } = await supabase
    .from('results')
    .select('*')
    .gt('updated_at', lastSyncStr)
    .order('updated_at', { ascending: true });

  if (pullError) {
    console.error('[Sync] Error en Pull de Results:', pullError);
    throw pullError;
  }

  let latestRemoteSync = lastSyncDate;

  if (remoteResults && remoteResults.length > 0) {
    console.log(`[Sync] Encontrados ${remoteResults.length} resultados modificados remotamente.`);
    for (const remote of remoteResults) {
      const existingRows = await query<Result>('SELECT * FROM "Result" WHERE id = ?', [remote.id]);

      if (existingRows.length > 0) {
        // Update local
        await execute(
          'UPDATE "Result" SET gameId = ?, scheduleId = ?, winningNumber = ?, drawDate = ?, isProcessed = ?, updatedAt = ?, deletedAt = ?, isDirty = 0 WHERE id = ?',
          [remote.game_id, remote.schedule_id, remote.winning_number, remote.draw_date, remote.is_processed, remote.updated_at, remote.deleted_at, remote.id]
        );
      } else {
        // Insert local
        await execute(
          'INSERT INTO "Result" (id, gameId, scheduleId, winningNumber, drawDate, isProcessed, createdAt, updatedAt, deletedAt, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [remote.id, remote.game_id, remote.schedule_id, remote.winning_number, remote.draw_date, remote.is_processed, remote.created_at, remote.updated_at, remote.deleted_at]
        );
      }

      const remoteUpdatedAt = new Date(remote.updated_at);
      if (remoteUpdatedAt > latestRemoteSync) {
        latestRemoteSync = remoteUpdatedAt;
      }
    }
    dbEvents.emit('results:changed');
  }

  // === PUSH (Subida) ===
  const dirtyLocalResults = await query<Result & { deletedAt?: Date | null }>('SELECT * FROM "Result" WHERE isDirty = 1');

  if (dirtyLocalResults.length > 0) {
    console.log(`[Sync] Subiendo ${dirtyLocalResults.length} resultados modificados localmente.`);

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const payload = dirtyLocalResults.map(r => ({
        id: r.id,
        game_id: r.gameId,
        schedule_id: r.scheduleId,
        winning_number: r.winningNumber,
        draw_date: r.drawDate,
        is_processed: r.isProcessed,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deleted_at: r.deletedAt
      }));

      const { error: pushError } = await supabase.from('results').upsert(payload);

      if (pushError) {
        console.error('[Sync] Error en Push de Results:', pushError);
      } else {
        const ids = dirtyLocalResults.map(r => `'${r.id}'`).join(',');
        await execute(`UPDATE "Result" SET isDirty = 0 WHERE id IN (${ids})`);
      }
    }
  }

  if (remoteResults && remoteResults.length > 0) {
    await execute(
      'INSERT INTO SyncState (tableName, lastSync) VALUES (?, ?) ON CONFLICT(tableName) DO UPDATE SET lastSync = ?',
      ['Result', latestRemoteSync.toISOString(), latestRemoteSync.toISOString()]
    );
  }
}
