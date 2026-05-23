import { execute, query } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';

type Row = Record<string, any>;

export type SyncTableConfig = {
  tableName: string;
  localTable: string;
  remoteTable: string;
  localTimestampColumn: string;
  remoteTimestampColumn: string;
  conflictTarget: string;
  localColumns: string[];
  rowKey: (row: Row) => string;
  canApplyRemoteRow?: (row: Row) => Promise<boolean>;
  toRemote: (row: Row, companyId: string) => Row;
  toLocalValues: (row: Row) => any[];
};

export type SyncTableResult = {
  tableName: string;
  pulled: number;
  pushed: number;
  skipped: number;
  latestSync: Date;
};

const DEFAULT_SYNC_DATE = '1970-01-01T00:00:00.000Z';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function buildUpsertSql(tableName: string, columns: string[], conflictTarget: string): string {
  const quotedColumns = columns.map(quoteIdentifier).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => column !== conflictTarget)
    .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
    .join(', ');

  return `INSERT INTO ${quoteIdentifier(tableName)} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT(${quoteIdentifier(conflictTarget)}) DO UPDATE SET ${updates}`;
}

async function getLastSync(tableName: string): Promise<Date> {
  const rows = await query<{ lastSync: string }>('SELECT lastSync FROM SyncState WHERE tableName = ?', [tableName]);
  const row = rows?.[0];
  const lastSync = row?.lastSync ?? DEFAULT_SYNC_DATE;

  // Garantizar inicialización
  if (!row) {
    await execute('INSERT OR IGNORE INTO SyncState(tableName, lastSync) VALUES (?, ?)', [tableName, DEFAULT_SYNC_DATE]);
  }

  return new Date(lastSync);
}

async function setLastSync(tableName: string, lastSync: Date): Promise<void> {
  await execute(
    'INSERT INTO SyncState (tableName, lastSync) VALUES (?, ?) ON CONFLICT(tableName) DO UPDATE SET lastSync = ?',
    [tableName, lastSync.toISOString(), lastSync.toISOString()]
  );
}

function toDate(value: any): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_SYNC_DATE) : date;
}

function maxDate(current: Date, candidate: Date): Date {
  return candidate > current ? candidate : current;
}

async function fetchChangedLocalRows(config: SyncTableConfig, sinceIso: string): Promise<Row[]> {
  return query<Row>(
    `SELECT * FROM ${quoteIdentifier(config.localTable)} WHERE ${quoteIdentifier(config.localTimestampColumn)} > ? ORDER BY ${quoteIdentifier(config.localTimestampColumn)} ASC`,
    [sinceIso]
  );
}

async function fetchChangedRemoteRows(config: SyncTableConfig, sinceIso: string, retries = 3): Promise<Row[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase
        .from(config.remoteTable)
        .select('*')
        .gt(config.remoteTimestampColumn, sinceIso)
        .order(config.remoteTimestampColumn, { ascending: true });

      if (error) throw error;
      return (data ?? []) as Row[];
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
  return [];
}

export async function getPendingSyncCount(configs: SyncTableConfig[]): Promise<number> {
  let total = 0;

  for (const config of configs) {
    const lastSync = await getLastSync(config.tableName);
    const rows = await fetchChangedLocalRows(config, lastSync.toISOString());
    total += rows.length;
  }

  return total;
}

export async function syncTable(config: SyncTableConfig, companyId: string): Promise<SyncTableResult> {
  const lastSync = await getLastSync(config.tableName);
  const lastSyncIso = lastSync.toISOString();
  const latestSync = { value: lastSync };
  const remoteTimestampByKey = new Map<string, Date>();
  const localUpsertSql = buildUpsertSql(config.localTable, config.localColumns, config.conflictTarget);

  const remoteRows = await fetchChangedRemoteRows(config, lastSyncIso);


  try {
    await execute('BEGIN TRANSACTION');
    for (const remoteRow of remoteRows) {
    const remoteTimestamp = toDate(remoteRow[config.remoteTimestampColumn]);
    remoteTimestampByKey.set(config.rowKey(remoteRow), remoteTimestamp);
    latestSync.value = maxDate(latestSync.value, remoteTimestamp);

    if (config.canApplyRemoteRow) {
      const canApply = await config.canApplyRemoteRow(remoteRow);
      if (!canApply) {
        continue;
      }
    }

    const localValues = config.toLocalValues(remoteRow);
    await execute(localUpsertSql, localValues);
    }
    await execute('COMMIT');
  } catch (e) {
    await execute('ROLLBACK');
    throw e;
  }

  const localRows = await fetchChangedLocalRows(config, lastSyncIso);
  const rowsToPush: Row[] = [];

  for (const localRow of localRows) {
    const localTimestamp = toDate(localRow[config.localTimestampColumn]);
    const remoteTimestamp = remoteTimestampByKey.get(config.rowKey(localRow));

    if (remoteTimestamp && remoteTimestamp > localTimestamp) {
      continue;
    }

    rowsToPush.push(localRow);
  }

  if (rowsToPush.length > 0) {
    const payloads = rowsToPush.map((row) => {
      const payload = config.toRemote(row, companyId);
      latestSync.value = maxDate(latestSync.value, toDate(row[config.localTimestampColumn]));
      return payload;
    });

    let error = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await supabase.from(config.remoteTable).upsert(payloads, { onConflict: config.conflictTarget });
      error = result.error;
      if (!error) break;
      if (attempt < 3) await new Promise(res => setTimeout(res, 1000 * attempt));
    }

    if (error) {
      throw error;
    }
  }

  await setLastSync(config.tableName, latestSync.value);

  return {
    tableName: config.tableName,
    pulled: remoteRows.length,
    pushed: rowsToPush.length,
    skipped: remoteRows.length - rowsToPush.length,
    latestSync: latestSync.value,
  };
}

async function existsLocal(tableName: string, id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`SELECT id FROM ${quoteIdentifier(tableName)} WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0;
}

const gameConfig: SyncTableConfig = {
  tableName: 'Game',
  localTable: 'Game',
  remoteTable: 'games',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'id',
  localColumns: ['id', 'name', 'isActive', 'digitCount', 'multiplier', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    name: row.name,
    is_active: Number(row.isActive) ? 1 : 0,
    digit_count: row.digitCount,
    multiplier: row.multiplier,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.name,
    Number(row.is_active) ? 1 : 0,
    row.digit_count,
    row.multiplier,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const drawScheduleConfig: SyncTableConfig = {
  tableName: 'DrawSchedule',
  localTable: 'DrawSchedule',
  remoteTable: 'draw_schedules',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'id',
  localColumns: ['id', 'gameId', 'name', 'time', 'isActive', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  canApplyRemoteRow: async (row) => existsLocal('Game', row.game_id),
  toRemote: (row, companyId) => ({
    id: row.id,
    game_id: row.gameId,
    name: row.name,
    time: row.time,
    is_active: Number(row.isActive) ? 1 : 0,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.game_id,
    row.name,
    row.time,
    Number(row.is_active) ? 1 : 0,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const ticketConfig: SyncTableConfig = {
  tableName: 'Ticket',
  localTable: 'Ticket',
  remoteTable: 'tickets',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'id',
  localColumns: ['id', 'ticketNumber', 'client', 'totalAmount', 'status', 'cancelReason', 'cancelledAt', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    ticket_number: row.ticketNumber,
    client: row.client,
    total_amount: row.totalAmount,
    status: row.status,
    cancel_reason: row.cancelReason,
    cancelled_at: row.cancelledAt ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.ticket_number,
    row.client ?? null,
    row.total_amount,
    row.status,
    row.cancel_reason ?? null,
    row.cancelled_at ?? null,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const ticketItemConfig: SyncTableConfig = {
  tableName: 'TicketItem',
  localTable: 'TicketItem',
  remoteTable: 'ticket_items',
  localTimestampColumn: 'createdAt',
  remoteTimestampColumn: 'created_at',
  conflictTarget: 'id',
  localColumns: ['id', 'ticketId', 'gameId', 'number', 'amount', 'schedule', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  canApplyRemoteRow: async (row) => {
    const ticketExists = await existsLocal('Ticket', row.ticket_id);
    const gameExists = await existsLocal('Game', row.game_id);
    return ticketExists && gameExists;
  },
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    ticket_id: row.ticketId,
    game_id: row.gameId,
    number: row.number,
    amount: row.amount,
    schedule: row.schedule,
    created_at: row.createdAt,
    updated_at: row.createdAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.ticket_id,
    row.game_id,
    row.number,
    row.amount,
    row.schedule,
    row.created_at,
    row.updated_at ?? row.created_at,
    0,
    row.deleted_at ?? null,
  ],
};

const resultConfig: SyncTableConfig = {
  tableName: 'Result',
  localTable: 'Result',
  remoteTable: 'results',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'id',
  localColumns: ['id', 'gameId', 'scheduleId', 'winningNumber', 'drawDate', 'isProcessed', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  canApplyRemoteRow: async (row) => {
    const gameExists = await existsLocal('Game', row.game_id);
    if (!gameExists) {
      return false;
    }

    if (!row.schedule_id) {
      return true;
    }

    return await existsLocal('DrawSchedule', row.schedule_id);
  },
  toRemote: (row, companyId) => ({
    id: row.id,
    game_id: row.gameId,
    schedule_id: row.scheduleId,
    winning_number: row.winningNumber,
    draw_date: row.drawDate,
    is_processed: Number(row.isProcessed) ? 1 : 0,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.game_id,
    row.schedule_id,
    row.winning_number,
    row.draw_date,
    Number(row.is_processed) ? 1 : 0,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const winnerConfig: SyncTableConfig = {
  tableName: 'Winner',
  localTable: 'Winner',
  remoteTable: 'winners',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'id',
  localColumns: ['id', 'ticketId', 'resultId', 'prizeAmount', 'isPaid', 'paidAt', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  canApplyRemoteRow: async (row) => {
    const ticketExists = await existsLocal('Ticket', row.ticket_id);
    const resultExists = await existsLocal('Result', row.result_id);
    return ticketExists && resultExists;
  },
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    ticket_id: row.ticketId,
    result_id: row.resultId,
    prize_amount: row.prizeAmount,
    is_paid: Number(row.isPaid) ? 1 : 0,
    paid_at: row.paidAt ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.ticket_id,
    row.result_id,
    row.prize_amount,
    Number(row.is_paid) ? 1 : 0,
    row.paid_at ?? null,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const cashSessionConfig: SyncTableConfig = {
  tableName: 'CashSession',
  localTable: 'CashSession',
  remoteTable: 'cash_sessions',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'id',
  localColumns: ['id', 'openingAmount', 'closingAmount', 'salesTotal', 'prizesTotal', 'status', 'openedAt', 'closedAt', 'notes', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    opening_amount: row.openingAmount,
    closing_amount: row.closingAmount ?? null,
    sales_total: row.salesTotal,
    prizes_total: row.prizesTotal,
    status: row.status,
    opened_at: row.openedAt,
    closed_at: row.closedAt ?? null,
    notes: row.notes ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.opening_amount,
    row.closing_amount ?? null,
    row.sales_total,
    row.prizes_total,
    row.status,
    row.opened_at,
    row.closed_at ?? null,
    row.notes ?? null,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const cashMovementConfig: SyncTableConfig = {
  tableName: 'CashMovement',
  localTable: 'CashMovement',
  remoteTable: 'cash_movements',
  localTimestampColumn: 'createdAt',
  remoteTimestampColumn: 'created_at',
  conflictTarget: 'id',
  localColumns: ['id', 'cashSessionId', 'type', 'amount', 'description', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  canApplyRemoteRow: async (row) => existsLocal('CashSession', row.cash_session_id),
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    cash_session_id: row.cashSessionId,
    type: row.type,
    amount: row.amount,
    description: row.description,
    created_at: row.createdAt,
    updated_at: row.createdAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.cash_session_id,
    row.type,
    row.amount,
    row.description,
    row.created_at,
    row.updated_at ?? row.created_at,
    0,
    row.deleted_at ?? null,
  ],
};

const settingConfig: SyncTableConfig = {
  tableName: 'Setting',
  localTable: 'Setting',
  remoteTable: 'settings',
  localTimestampColumn: 'updatedAt',
  remoteTimestampColumn: 'updated_at',
  conflictTarget: 'key',
  localColumns: ['id', 'key', 'value', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.key,
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    key: row.key,
    value: row.value,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.key,
    row.value,
    row.created_at,
    row.updated_at,
    0,
    row.deleted_at ?? null,
  ],
};

const cancellationLogConfig: SyncTableConfig = {
  tableName: 'CancellationLog',
  localTable: 'CancellationLog',
  remoteTable: 'cancellation_logs',
  localTimestampColumn: 'createdAt',
  remoteTimestampColumn: 'created_at',
  conflictTarget: 'id',
  localColumns: ['id', 'ticketId', 'ticketNumber', 'totalAmount', 'reason', 'itemsJson', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  canApplyRemoteRow: async (row) => existsLocal('Ticket', row.ticket_id),
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    ticket_id: row.ticketId,
    ticket_number: row.ticketNumber,
    total_amount: row.totalAmount,
    reason: row.reason,
    items_json: row.itemsJson,
    created_at: row.createdAt,
    updated_at: row.createdAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.ticket_id,
    row.ticket_number,
    row.total_amount,
    row.reason,
    row.items_json,
    row.created_at,
    row.updated_at ?? row.created_at,
    0,
    row.deleted_at ?? null,
  ],
};

const appErrorLogConfig: SyncTableConfig = {
  tableName: 'AppErrorLog',
  localTable: 'AppErrorLog',
  remoteTable: 'app_error_logs',
  localTimestampColumn: 'createdAt',
  remoteTimestampColumn: 'created_at',
  conflictTarget: 'id',
  localColumns: ['id', 'severity', 'source', 'message', 'stack', 'details', 'url', 'userAgent', 'platform', 'createdAt', 'updatedAt', 'isDirty', 'deletedAt'],
  rowKey: (row) => row.id,
  toRemote: (row, companyId) => ({
    id: row.id,
    company_id: companyId,
    severity: row.severity,
    source: row.source,
    message: row.message,
    stack: row.stack ?? null,
    details: row.details ?? null,
    url: row.url ?? null,
    user_agent: row.userAgent ?? null,
    platform: row.platform ?? null,
    created_at: row.createdAt,
    updated_at: row.createdAt,
    deleted_at: row.deletedAt ?? null,
  }),
  toLocalValues: (row) => [
    row.id,
    row.severity,
    row.source,
    row.message,
    row.stack ?? null,
    row.details ?? null,
    row.url ?? null,
    row.user_agent ?? null,
    row.platform ?? null,
    row.created_at,
    row.updated_at ?? row.created_at,
    0,
    row.deleted_at ?? null,
  ],
};

export const SYNC_TABLES: SyncTableConfig[] = [
  gameConfig,
  drawScheduleConfig,
  ticketConfig,
  ticketItemConfig,
  resultConfig,
  winnerConfig,
  cashSessionConfig,
  cashMovementConfig,
  settingConfig,
  cancellationLogConfig,
  appErrorLogConfig,
];
