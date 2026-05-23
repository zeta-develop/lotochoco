import { supabase } from '@/lib/supabase/client';
import { query, execute } from '@/lib/db';
import type { Result } from '@/lib/types';
import { dbEvents } from '@/lib/events';
import { recordAppError } from '@/services/error-logger';

export async function syncResults() {
  console.log('[Sync] Iniciando sincronización de Results...');

  const syncStateRows = await query<{ lastSync: string }>('SELECT lastSync FROM SyncState WHERE tableName = ?', ['Result']);
  const row = syncStateRows?.[0];
  const lastSyncStr = row?.lastSync ?? '1970-01-01T00:00:00.000Z';
  if (!row) {
    await execute('INSERT OR IGNORE INTO SyncState(tableName, lastSync) VALUES (?, ?)', ['Result', '1970-01-01T00:00:00.000Z']);
  }
  const lastSyncDate = new Date(lastSyncStr);

  // === PULL (Descarga) ===
  const { data: remoteResults, error: pullError } = await supabase
    .from('results')
    .select('*')
    .gt('updated_at', lastSyncStr)
    .order('updated_at', { ascending: true });

  if (pullError) {
    const normalizedError = { message: pullError instanceof Error ? pullError.message : String(pullError), stack: pullError instanceof Error ? pullError.stack : undefined, cause: (pullError as any)?.cause, code: (pullError as any)?.code, details: pullError };
    console.error('[SYNC ERROR]', JSON.stringify(normalizedError, null, 2));
    await recordAppError(normalizedError, { source: 'sync', severity: 'error', details: JSON.stringify(normalizedError, null, 2) });
    throw pullError;
  }

  let latestRemoteSync = lastSyncDate;

  if (remoteResults && remoteResults.length > 0) {
    console.log(`[Sync] Encontrados ${remoteResults.length} resultados modificados remotamente.`);
    for (const remote of remoteResults) {
      const existingRows = await query<Result>('SELECT * FROM "Result" WHERE id = ?', [remote.id]);

      const isProcessedNum = Number(remote.is_processed) ? 1 : 0;

      // Solo insertamos si el gameId y scheduleId ya existen localmente (integridad referencial de SQLite)
      const gameExists = await query('SELECT id FROM Game WHERE id = ?', [remote.game_id]);
      if (gameExists.length === 0) {
         console.warn(`[Sync] Saltando Result ${remote.id} porque no existe el Game local ${remote.game_id}`);
         continue;
      }

      if (remote.schedule_id) {
        const scheduleExists = await query('SELECT id FROM DrawSchedule WHERE id = ?', [remote.schedule_id]);
        if (scheduleExists.length === 0) {
           console.warn(`[Sync] Saltando Result ${remote.id} porque no existe el DrawSchedule local ${remote.schedule_id}`);
           continue;
        }
      }

      if (existingRows.length > 0) {
        // Update local
        await execute(
          'UPDATE "Result" SET gameId = ?, scheduleId = ?, winningNumber = ?, drawDate = ?, isProcessed = ?, updatedAt = ?, deletedAt = ?, isDirty = 0 WHERE id = ?',
          [remote.game_id, remote.schedule_id, remote.winning_number, remote.draw_date, isProcessedNum, remote.updated_at, remote.deleted_at, remote.id]
        );
      } else {
        // Insert local
        await execute(
          'INSERT INTO "Result" (id, gameId, scheduleId, winningNumber, drawDate, isProcessed, createdAt, updatedAt, deletedAt, isDirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [remote.id, remote.game_id, remote.schedule_id, remote.winning_number, remote.draw_date, isProcessedNum, remote.created_at, remote.updated_at, remote.deleted_at]
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
        is_processed: Boolean(r.isProcessed) ? 1 : 0,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deleted_at: r.deletedAt
      }));

      const { error: pushError } = await supabase.from('results').upsert(payload);

      if (pushError) {
        const normalizedError = { message: pushError instanceof Error ? pushError.message : String(pushError), stack: pushError instanceof Error ? pushError.stack : undefined, cause: (pushError as any)?.cause, code: (pushError as any)?.code, details: pushError };
        console.error('[SYNC ERROR]', JSON.stringify(normalizedError, null, 2));
        await recordAppError(normalizedError, { source: 'sync', severity: 'error', details: JSON.stringify(normalizedError, null, 2) });
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
