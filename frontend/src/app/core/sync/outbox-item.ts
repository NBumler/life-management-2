export type OutboxMethod = 'POST' | 'PUT' | 'DELETE';
export type OutboxStatus = 'PENDING' | 'SENDING' | 'BLOCKED' | 'ERROR' | 'SKIPPED';

/**
 * documentation/Architektúra/Backend-offline first.md §4: the closed set of entity types that ever
 * get their own `outbox_item` row. Deliberately **not** `string` — every repository call to
 * `OfflineQueueService.buildEnqueueTasks` must pass one of these literals, and
 * `OutboxEntityRegistryService` (`outbox-entity-registry.ts`) is typed as `Record<OutboxEntityType, ...>`,
 * so adding a new literal here without also adding a matching registry entry is a compile error. This
 * is the mechanism that stops a future feature's outbox entity type from silently falling out of the
 * Szinkronizációs központ's Fix/Skip/Unskip/Drop coverage the way GearCheck's did — see
 * documentation/Features/Szinkronizációs központ.md.
 */
export type OutboxEntityType =
  | 'UserProfile'
  | 'WeightHistoryEntry'
  | 'GearItem'
  | 'PackingTemplate'
  | 'PackingSession'
  | 'PackingSessionItem'
  | 'LifePlan'
  | 'Exercise'
  | 'WorkoutSession'
  | 'HouseholdRoom'
  | 'HouseholdTask'
  | 'CalendarEvent'
  | 'Food'
  | 'StoredFood'
  | 'Recipe'
  | 'Meal'
  | 'ShoppingList'
  // documentation/Subfeatures/Bevásárlás teljesítve.md: the `.../complete` action endpoint. Its own
  // outbox entity type (not 'ShoppingList') so it never coalesces with — or is recovered like — the
  // list's plain CRUD writes, even though it shares the list's targetEntityId.
  | 'ShoppingListComplete';

/** documentation/Architektúra/Backend-offline first.md §4 "Outbox — adatmodell". */
export interface OutboxItem {
  sequence: number;
  id: string;
  createdAt: string;
  userId: string;
  method: OutboxMethod;
  url: string;
  payload: unknown;
  payloadVersion: number;
  /**
   * Deliberately `string`, not `OutboxEntityType` — unlike `EnqueueRequest` (the write path, which
   * only this app version's repositories call), a row read back here could in principle predate an
   * app update that dropped an entity type, and `OutboxMigrator` (§7) is specifically designed to
   * stay generic over whatever string is here rather than assume it's one of the currently-known set.
   */
  entityType: string;
  targetEntityId: string;
  dependsOn: string[];
  status: OutboxStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorField: string | null;
}

export interface EnqueueRequest {
  userId: string;
  method: OutboxMethod;
  url: string;
  payload: unknown;
  entityType: OutboxEntityType;
  targetEntityId: string;
  dependsOn?: string[];
}

interface OutboxRow {
  sequence: number;
  id: string;
  created_at: string;
  user_id: string;
  method: string;
  url: string;
  payload: string | null;
  payload_version: number;
  entity_type: string;
  target_entity_id: string;
  depends_on: string;
  status: string;
  attempt_count: number;
  last_attempt_at: string | null;
  http_status: number | null;
  error_code: string | null;
  error_message: string | null;
  error_field: string | null;
}

export function rowToOutboxItem(row: OutboxRow): OutboxItem {
  return {
    sequence: row.sequence,
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    method: row.method as OutboxMethod,
    url: row.url,
    payload: row.payload === null ? null : (JSON.parse(row.payload) as unknown),
    payloadVersion: row.payload_version,
    entityType: row.entity_type,
    targetEntityId: row.target_entity_id,
    dependsOn: JSON.parse(row.depends_on) as string[],
    status: row.status as OutboxStatus,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    httpStatus: row.http_status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    errorField: row.error_field,
  };
}

export type { OutboxRow };
