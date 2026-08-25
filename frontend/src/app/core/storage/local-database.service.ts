import { Injectable } from '@angular/core';
import { CapacitorSQLite, capSQLiteVersionUpgrade, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

/**
 * documentation/Architektúra/Backend-offline first.md §3: "a plugin beépített, verziózott
 * upgrade-mechanizmusa" — each array entry is one `CREATE`/`ALTER`/... statement (not a
 * semicolon-joined blob), run in order by the native side when it upgrades a DB to `toVersion`.
 * This is the full schema as of `SCHEMA_VERSION = 1`; a future breaking schema change adds a new
 * entry with the next `toVersion` and only the delta statements — it must NOT edit this one, or a
 * device that already upgraded to v1 would never see the v2 delta (the plugin only replays steps
 * between the DB's current stored version and the requested version).
 */
const SCHEMA_V1_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS user_profile (
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
  )`,
  `CREATE TABLE IF NOT EXISTS weight_history_entry (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_weight_history_entry_recorded_at ON weight_history_entry (recorded_at DESC)`,
  `CREATE TABLE IF NOT EXISTS outbox_item (
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
  )`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cursor TEXT,
    last_pull_at TEXT,
    last_pull_status TEXT,
    first_pull_completed INTEGER NOT NULL DEFAULT 0
  )`,
  `INSERT OR IGNORE INTO sync_state (id, first_pull_completed) VALUES (1, 0)`,
];

/**
 * documentation/Subfeatures/Eszközök.md, GearCheck's first table. A new version entry (not an edit
 * of SCHEMA_V1_STATEMENTS) per the class doc above — a device already on v1 only replays the delta
 * between its current version and this one.
 */
const SCHEMA_V2_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS gear_item (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gear_item_name ON gear_item (name)`,
];

/** documentation/Subfeatures/Sablonok.md — named GearItem lists. */
const SCHEMA_V3_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS packing_template (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_packing_template_name ON packing_template (name)`,
  `CREATE TABLE IF NOT EXISTS packing_template_item (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    gear_item_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_packing_template_item_template_id ON packing_template_item (template_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_packing_template_item_gear_item_id ON packing_template_item (gear_item_id)`,
];

/** documentation/Subfeatures/Pakolás.md — active packing sessions started from one or more templates. */
const SCHEMA_V4_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS packing_session (
    id TEXT PRIMARY KEY,
    destination TEXT,
    source_template_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS packing_session_item (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    gear_item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NOT_PACKED',
    sort_order INTEGER NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_packing_session_item_session_id ON packing_session_item (session_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_packing_session_item_gear_item_id ON packing_session_item (gear_item_id)`,
];

/** documentation/Subfeatures/Élet tervek.md — Tennivalók's first table. */
const SCHEMA_V5_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS life_plan (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    target_date TEXT,
    completed_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
];

const SCHEMA_VERSION = 5;

/** Registered with the plugin (`addUpgradeStatement`) before every `createConnection`. */
const SCHEMA_UPGRADES: capSQLiteVersionUpgrade[] = [
  { toVersion: 1, statements: SCHEMA_V1_STATEMENTS },
  { toVersion: 2, statements: SCHEMA_V2_STATEMENTS },
  { toVersion: 3, statements: SCHEMA_V3_STATEMENTS },
  { toVersion: 4, statements: SCHEMA_V4_STATEMENTS },
  { toVersion: SCHEMA_VERSION, statements: SCHEMA_V5_STATEMENTS },
];

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
  /**
   * Serializes `executeTransaction` calls on the single shared connection. The underlying
   * `@capacitor-community/sqlite` `executeTransaction` is BEGIN…run…COMMIT spread across several
   * awaited native-bridge round trips with no reentrancy guard — two concurrent callers (e.g. a
   * `Promise.all` of several repository writes, as packing-session reorder does) race each other's
   * BEGIN/COMMIT and one fails with "cannot start a transaction within a transaction", silently
   * dropping that caller's write. Chaining onto this tail forces write transactions to run one at a
   * time regardless of how many callers overlap.
   */
  private writeQueue: Promise<unknown> = Promise.resolve();

  readonly schemaVersion = SCHEMA_VERSION;

  async open(userId: string): Promise<void> {
    if (this.openUserId === userId && this.connection !== null) {
      return;
    }
    if (this.connection !== null) {
      await this.close();
    }
    const dbName = `lm2_${userId}`;
    // Must run before createConnection every time (not just on first-ever open): the plugin keeps
    // the registered upgrade steps in memory per JS context, not persisted with the DB file, so a
    // fresh app process needs them registered again even for a DB that is already at SCHEMA_VERSION.
    await this.connectionFactory.addUpgradeStatement(dbName, SCHEMA_UPGRADES);
    const isConn = await this.connectionFactory.isConnection(dbName, false);
    this.connection = isConn.result
      ? await this.connectionFactory.retrieveConnection(dbName, false)
      : await this.connectionFactory.createConnection(dbName, false, 'no-encryption', SCHEMA_VERSION, false);
    await this.connection.open();
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

  /**
   * documentation/Architektúra/Backend-offline first.md §5: entity row + outbox row in one local
   * transaction. Queued behind any in-flight transaction — see `writeQueue` — so concurrent callers
   * never overlap their BEGIN/COMMIT on the shared connection.
   */
  executeTransaction(tasks: SqlTask[]): Promise<void> {
    const runTransaction = async (): Promise<void> => {
      const db = this.requireConnection();
      await db.executeTransaction(tasks.map((task) => ({ statement: task.statement, values: task.values as unknown[] | undefined })));
    };
    const result = this.writeQueue.then(runTransaction);
    // Keep the tail alive even if this write rejects, so the failure doesn't wedge later callers,
    // while still propagating the rejection to this call's own caller via `result`.
    this.writeQueue = result.catch(() => undefined);
    return result;
  }

  private requireConnection(): SQLiteDBConnection {
    if (this.connection === null) {
      throw new Error('LocalDatabaseService: no open connection — call open(userId) first');
    }
    return this.connection;
  }
}
