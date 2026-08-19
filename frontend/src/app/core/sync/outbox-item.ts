export type OutboxMethod = 'POST' | 'PUT' | 'DELETE';
export type OutboxStatus = 'PENDING' | 'SENDING' | 'BLOCKED' | 'ERROR' | 'SKIPPED';

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
  entityType: string;
  targetEntityId: string;
  dependsOn: string[];
  status: OutboxStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface EnqueueRequest {
  userId: string;
  method: OutboxMethod;
  url: string;
  payload: unknown;
  entityType: string;
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
  };
}

export type { OutboxRow };
