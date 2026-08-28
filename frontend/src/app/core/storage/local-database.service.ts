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

/** documentation/Subfeatures/Háztartási feladatok.md — rooms + recurring room-scoped tasks. */
const SCHEMA_V6_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS household_room (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS household_task (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    energy_level TEXT NOT NULL DEFAULT 'MEDIUM',
    estimated_minutes INTEGER NOT NULL DEFAULT 1,
    interval_days INTEGER NOT NULL DEFAULT 1,
    next_due TEXT NOT NULL,
    last_completed_at TEXT,
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
  `CREATE INDEX IF NOT EXISTS idx_household_task_room_id ON household_task (room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_household_task_next_due ON household_task (next_due)`,
];

/** documentation/Features/Események.md — one row = one series; recurrence is projected client-side. */
const SCHEMA_V7_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS calendar_event (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    all_day INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    frequency TEXT,
    interval INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_event_date ON calendar_event (date)`,
];

/**
 * documentation/Subfeatures/Élelmiszerek.md — shared/global catalog: unlike every earlier table,
 * these rows are not scoped by user (see hu.bumler.lm2.food.FoodEntity on the backend), but that
 * only affects server-side sync scoping; the local SQLite copy has no per-user isolation anyway.
 */
const SCHEMA_V8_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS food (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    store TEXT,
    brand TEXT,
    barcode TEXT,
    note TEXT,
    price_huf INTEGER,
    net_amount REAL,
    net_unit TEXT,
    energy_kcal REAL,
    fat_g REAL,
    fat_saturated_g REAL,
    fat_unsaturated_g REAL,
    fat_trans_g REAL,
    carbs_g REAL,
    carbs_sugars_g REAL,
    carbs_complex_g REAL,
    carbs_fiber_g REAL,
    protein_g REAL,
    salt_g REAL,
    sodium_g REAL,
    chloride_g REAL,
    shelf_room_amount REAL,
    shelf_room_unit TEXT,
    shelf_fridge_amount REAL,
    shelf_fridge_unit TEXT,
    shelf_freezer_amount REAL,
    shelf_freezer_unit TEXT,
    shelf_after_opening_amount REAL,
    shelf_after_opening_unit TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_food_name ON food (name)`,
];

/** documentation/Subfeatures/Élelmiszer tárolás.md — per-user home storage inventory, referencing the (global) food table. */
const SCHEMA_V9_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS stored_food (
    id TEXT PRIMARY KEY,
    food_id TEXT NOT NULL,
    quantity_amount REAL NOT NULL,
    quantity_unit TEXT NOT NULL,
    storage_location TEXT NOT NULL,
    expires_on TEXT NOT NULL,
    opened INTEGER NOT NULL DEFAULT 0,
    opened_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stored_food_food_id ON stored_food (food_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stored_food_expires_on ON stored_food (expires_on)`,
];

/** documentation/Subfeatures/Recept.md — shared/global recipe catalog, mirrors `food` (no user scoping). */
const SCHEMA_V10_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS recipe (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    note TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_name ON recipe (name)`,
  `CREATE TABLE IF NOT EXISTS recipe_ingredient (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    food_id TEXT NOT NULL,
    quantity_amount REAL NOT NULL,
    quantity_unit TEXT NOT NULL,
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
  `CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_recipe_id ON recipe_ingredient (recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_food_id ON recipe_ingredient (food_id)`,
];

/** documentation/Subfeatures/Étkezés.md — per-user meal log; meal_item is a nullable superset covering all three item source types (RECIPE/FOOD/CUSTOM). */
const SCHEMA_V11_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS meal (
    id TEXT PRIMARY KEY,
    eaten_at TEXT NOT NULL,
    time_zone_id TEXT NOT NULL,
    note TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 0,
    _local_only INTEGER NOT NULL DEFAULT 0,
    _sync_error INTEGER NOT NULL DEFAULT 0,
    _needs_refetch INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_meal_eaten_at ON meal (eaten_at)`,
  `CREATE TABLE IF NOT EXISTS meal_item (
    id TEXT PRIMARY KEY,
    meal_id TEXT NOT NULL,
    type TEXT NOT NULL,
    recipe_id TEXT,
    food_id TEXT,
    quantity_amount REAL,
    quantity_unit TEXT,
    display_name TEXT,
    calories_kcal REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    price_huf INTEGER,
    servings REAL NOT NULL,
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
  `CREATE INDEX IF NOT EXISTS idx_meal_item_meal_id ON meal_item (meal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_meal_item_recipe_id ON meal_item (recipe_id)`,
  `CREATE INDEX IF NOT EXISTS idx_meal_item_food_id ON meal_item (food_id)`,
];

/** documentation/Subfeatures/Bevásárlólista írás.md — per-user active shopping list; shopping_list_item is a nullable superset covering both item source types (FOOD/NON_FOOD). `status`/`completed_at` mirror the backend schema but are not yet mutated locally either (see local-rows.ts shoppingListLocalWriteTask). */
const SCHEMA_V12_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS shopping_list (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
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
  `CREATE TABLE IF NOT EXISTS shopping_list_item (
    id TEXT PRIMARY KEY,
    shopping_list_id TEXT NOT NULL,
    type TEXT NOT NULL,
    food_id TEXT,
    name TEXT,
    note TEXT,
    quantity_amount REAL,
    quantity_unit TEXT,
    checked INTEGER NOT NULL DEFAULT 0,
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
  `CREATE INDEX IF NOT EXISTS idx_shopping_list_item_shopping_list_id ON shopping_list_item (shopping_list_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_list_item_food_id ON shopping_list_item (food_id)`,
];

/**
 * Kaja katalógus/statisztika betöltés gyorsítása — `listFoods()`/`listRecipes()` a
 * `WHERE deleted = 0 ORDER BY name` élő listát olvassa; a partial index a tombstone sorokat
 * kihagyva rendezetten szolgálja ki, index-only szkennel. Csak új index, séma-adat nem változik.
 */
const SCHEMA_V13_STATEMENTS: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_food_live_name ON food (name) WHERE deleted = 0`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_live_name ON recipe (name) WHERE deleted = 0`,
];

/**
 * A V13 indexek `name` oszlopa BINARY kollációjú, de `listFoods()`/`listRecipes()` `ORDER BY name
 * COLLATE NOCASE` szerint rendez — egy BINARY index nem tudja kiszolgálni a NOCASE rendezést, így
 * maradt a `USE TEMP B-TREE FOR ORDER BY`. Az indexeket `COLLATE NOCASE` kifejezéssel újraépítjük,
 * hogy a rendezés valóban index-only legyen. Csak index, séma-adat nem változik.
 */
const SCHEMA_V14_STATEMENTS: string[] = [
  `DROP INDEX IF EXISTS idx_food_live_name`,
  `DROP INDEX IF EXISTS idx_recipe_live_name`,
  `CREATE INDEX IF NOT EXISTS idx_food_live_name ON food (name COLLATE NOCASE) WHERE deleted = 0`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_live_name ON recipe (name COLLATE NOCASE) WHERE deleted = 0`,
];

const SCHEMA_VERSION = 14;

/** Registered with the plugin (`addUpgradeStatement`) before every `createConnection`. */
const SCHEMA_UPGRADES: capSQLiteVersionUpgrade[] = [
  { toVersion: 1, statements: SCHEMA_V1_STATEMENTS },
  { toVersion: 2, statements: SCHEMA_V2_STATEMENTS },
  { toVersion: 3, statements: SCHEMA_V3_STATEMENTS },
  { toVersion: 4, statements: SCHEMA_V4_STATEMENTS },
  { toVersion: 5, statements: SCHEMA_V5_STATEMENTS },
  { toVersion: 6, statements: SCHEMA_V6_STATEMENTS },
  { toVersion: 7, statements: SCHEMA_V7_STATEMENTS },
  { toVersion: 8, statements: SCHEMA_V8_STATEMENTS },
  { toVersion: 9, statements: SCHEMA_V9_STATEMENTS },
  { toVersion: 10, statements: SCHEMA_V10_STATEMENTS },
  { toVersion: 11, statements: SCHEMA_V11_STATEMENTS },
  { toVersion: 12, statements: SCHEMA_V12_STATEMENTS },
  { toVersion: 13, statements: SCHEMA_V13_STATEMENTS },
  { toVersion: SCHEMA_VERSION, statements: SCHEMA_V14_STATEMENTS },
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
