import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  birth_date TEXT,
  sex TEXT,
  height_cm REAL,
  current_weight_kg REAL,
  goal TEXT,
  kg_per_week REAL,
  gross_monthly_salary_huf REAL,
  created_at TEXT,
  updated_at TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  _dirty INTEGER NOT NULL DEFAULT 0,
  _local_only INTEGER NOT NULL DEFAULT 0,
  _sync_error INTEGER NOT NULL DEFAULT 0,
  _needs_refetch INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weight_history_entry (
  id TEXT PRIMARY KEY,
  recorded_at TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  _dirty INTEGER NOT NULL DEFAULT 0,
  _local_only INTEGER NOT NULL DEFAULT 0,
  _sync_error INTEGER NOT NULL DEFAULT 0,
  _needs_refetch INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_weight_history_entry_recorded_at ON weight_history_entry (recorded_at DESC);

CREATE TABLE IF NOT EXISTS outbox_item (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  user_id TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  payload TEXT,
  payload_version INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  depends_on TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  http_status INTEGER,
  error_code TEXT,
  error_message TEXT,
  error_field TEXT
);

CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cursor TEXT,
  last_pull_at TEXT,
  last_pull_status TEXT,
  first_pull_completed INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO sync_state (id, first_pull_completed) VALUES (1, 0);
`;

const SCHEMA_VERSION = 1;

export interface SqlTask {
  statement: string;
  values?: unknown[];
}

/**
 * Owns the single native SQLite connection for the current user
 * (documentation/Architektúra/Backend-offline first.md §3: `lm2_<userId>.db`, one file per user).
 * `SqliteStorageBackend` and `core/sync/` share this rather than opening their own connections.
 */
@Injectable({ providedIn: 'root' })
export class LocalDatabaseService {
  private readonly connectionFactory = new SQLiteConnection(CapacitorSQLite);
  private connection: SQLiteDBConnection | null = null;
  private openUserId: string | null = null;

  readonly schemaVersion = SCHEMA_VERSION;

  async open(userId: string): Promise<void> {
    if (this.openUserId === userId && this.connection !== null) {
      return;
    }
    if (this.connection !== null) {
      await this.close();
    }
    const dbName = `lm2_${userId}`;
    const isConn = await this.connectionFactory.isConnection(dbName, false);
    this.connection = isConn.result
      ? await this.connectionFactory.retrieveConnection(dbName, false)
      : await this.connectionFactory.createConnection(dbName, false, 'no-encryption', SCHEMA_VERSION, false);
    await this.connection.open();
    await this.connection.execute(SCHEMA_SQL, true);
    this.openUserId = userId;
  }

  async close(): Promise<void> {
    if (this.connection === null || this.openUserId === null) {
      return;
    }
    await this.connectionFactory.closeConnection(`lm2_${this.openUserId}`, false);
    this.connection = null;
    this.openUserId = null;
  }

  async query<T = Record<string, unknown>>(statement: string, values: unknown[] = []): Promise<T[]> {
    const db = this.requireConnection();
    const result = await db.query(statement, values);
    return (result.values ?? []) as T[];
  }

  async run(statement: string, values: unknown[] = []): Promise<{ changes: number; lastId?: number }> {
    const db = this.requireConnection();
    const result = await db.run(statement, values);
    return { changes: result.changes?.changes ?? 0, lastId: result.changes?.lastId };
  }

  /** documentation/Architektúra/Backend-offline first.md §5: entity row + outbox row in one local transaction. */
  async executeTransaction(tasks: SqlTask[]): Promise<void> {
    const db = this.requireConnection();
    await db.executeTransaction(tasks.map((task) => ({ statement: task.statement, values: task.values as unknown[] | undefined })));
  }

  private requireConnection(): SQLiteDBConnection {
    if (this.connection === null) {
      throw new Error('LocalDatabaseService: no open connection — call open(userId) first');
    }
    return this.connection;
  }
}
