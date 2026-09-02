import { Injectable, inject, signal } from '@angular/core';

import { LocalDatabaseService, SqlTask } from '../storage/local-database.service';
import { EnqueueRequest, OutboxItem, OutboxMethod, OutboxRow, rowToOutboxItem } from './outbox-item';
import { uuidV4 } from './uuid';

/**
 * v2 (backlog/063): the `db` quantity unit was renamed to `cs` everywhere. Every pending payload
 * that still carries `netUnit: 'db'` / `quantityUnit: 'db'` is rewritten to `'cs'` before drain —
 * see `outbox-migrator.ts`. All other entity types get an identity step at `:1` so a stale pending
 * write of any kind survives the version bump instead of going to ERROR.
 */
export const OUTBOX_PAYLOAD_SCHEMA_VERSION = 2;

/** documentation/Architektúra/Backend-offline first.md §6 "Tétel-újrapróbálkozási backoff" (jitter omitted — not load-bearing for correctness). */
const RETRY_BACKOFF_MS = [2000, 8000, 30000, 120000, 600000];

export interface EnqueueResult {
  outboxTasks: SqlTask[];
  /** true only for a never-synced draft's create+delete cancelling out (§5 "Outbox-összevonás"): the caller must hard-remove the local entity row instead of soft-deleting it. */
  hardRemoveLocalEntity: boolean;
}

/**
 * documentation/Architektúra/Backend-offline first.md §6: the outbox_item table's sole owner.
 * `SyncEngine` (drain) and the write path (via repositories) both go through this service;
 * neither writes to outbox_item directly.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly db = inject(LocalDatabaseService);

  readonly pendingCount = signal(0);
  readonly errorCount = signal(0);
  /**
   * documentation/Features/Szinkronizációs központ.md: "a lista... élőben látszanak, külön frissítés
   * nélkül" — the sync center reads this signal directly instead of re-querying on a poll timer.
   * Hydrated by `listAll()`, then kept in sync by every mutating method below (all of which the drain
   * loop and the sync center's manual actions already go through).
   */
  readonly items = signal<OutboxItem[]>([]);

  async refreshCounts(userId: string): Promise<void> {
    const rows = await this.db.query<{ status: string; c: number }>(
      `SELECT status, COUNT(*) as c FROM outbox_item WHERE user_id = ? GROUP BY status`,
      [userId],
    );
    let pending = 0;
    let error = 0;
    for (const row of rows) {
      if (row.status === 'ERROR') {
        error += row.c;
      } else if (row.status !== 'SKIPPED') {
        pending += row.c;
      }
    }
    this.pendingCount.set(pending);
    this.errorCount.set(error);
  }

  /** Pure planning step — does not execute. The caller merges these tasks with its own entity-row task(s) into one atomic transaction (§5). */
  async buildEnqueueTasks(request: EnqueueRequest): Promise<EnqueueResult> {
    const rows = await this.db.query<OutboxRow>(
      `SELECT * FROM outbox_item WHERE target_entity_id = ? AND status = 'PENDING' ORDER BY sequence`,
      [request.targetEntityId],
    );
    const existing = rows.map(rowToOutboxItem);

    if (existing.some((item) => item.method === 'DELETE')) {
      throw new Error(`Entity ${request.targetEntityId} has a pending delete and cannot be edited further`);
    }

    // Coalescing candidates must be the SAME logical operation: an action endpoint like ShoppingList's
    // `/complete` shares the list's targetEntityId but has its own entityType, so it must neither fold
    // into the list's create POST nor be folded into by a later list PUT — each stays its own row,
    // FIFO-ordered, blocked behind the other only via recomputeBlocked's same-targetEntityId rule.
    const sameType = existing.filter((item) => item.entityType === request.entityType);
    const existingPost = sameType.find((item) => item.method === 'POST');
    const existingPut = sameType.find((item) => item.method === 'PUT');

    if (request.method === 'DELETE') {
      if (existingPost) {
        return {
          outboxTasks: existing.map((item) => deleteOutboxRowTask(item.id)),
          hardRemoveLocalEntity: true,
        };
      }
      const tasks = existing.filter((item) => item.method === 'PUT').map((item) => deleteOutboxRowTask(item.id));
      tasks.push(this.insertTask(request, 'DELETE'));
      return { outboxTasks: tasks, hardRemoveLocalEntity: false };
    }

    // PUT coalesces into an existing PENDING POST or PUT for the same entity; POST (repeat create,
    // e.g. a natural-key upsert saved again) coalesces into an existing PENDING POST the same way.
    const coalesceTarget = request.method === 'PUT' ? (existingPost ?? existingPut) : existingPost;
    if (coalesceTarget) {
      return {
        outboxTasks: [updatePayloadTask(coalesceTarget.id, request.payload)],
        hardRemoveLocalEntity: false,
      };
    }

    return { outboxTasks: [this.insertTask(request, request.method)], hardRemoveLocalEntity: false };
  }

  /** §6 "BLOCKED státuszok újraszámolása" — must run at the start of every drain. */
  async recomputeBlocked(userId: string): Promise<void> {
    const [activeRows, errorRows] = await Promise.all([
      this.db.query<OutboxRow>(`SELECT * FROM outbox_item WHERE user_id = ? AND status IN ('PENDING','BLOCKED') ORDER BY sequence`, [userId]),
      this.db.query<OutboxRow>(`SELECT * FROM outbox_item WHERE user_id = ? AND status = 'ERROR' ORDER BY sequence`, [userId]),
    ]);
    const errors = errorRows.map(rowToOutboxItem);

    for (const row of activeRows) {
      const item = rowToOutboxItem(row);
      const isBlocked = errors.some(
        (error) =>
          error.sequence < item.sequence &&
          (error.targetEntityId === item.targetEntityId || item.dependsOn.includes(error.targetEntityId)),
      );
      if (isBlocked && item.status !== 'BLOCKED') {
        await this.db.run(`UPDATE outbox_item SET status = 'BLOCKED' WHERE id = ?`, [item.id]);
        this.patchItem(item.id, { status: 'BLOCKED' });
      } else if (!isBlocked && item.status === 'BLOCKED') {
        await this.db.run(`UPDATE outbox_item SET status = 'PENDING' WHERE id = ?`, [item.id]);
        this.patchItem(item.id, { status: 'PENDING' });
      }
    }
  }

  /** PENDING items whose retry backoff has elapsed, in FIFO (`sequence`) order. */
  async listRunnable(userId: string): Promise<OutboxItem[]> {
    const rows = await this.db.query<OutboxRow>(`SELECT * FROM outbox_item WHERE user_id = ? AND status = 'PENDING' ORDER BY sequence`, [userId]);
    const now = Date.now();
    return rows
      .map(rowToOutboxItem)
      .filter((item) => item.lastAttemptAt === null || now - Date.parse(item.lastAttemptAt) >= backoffFor(item.attemptCount));
  }

  async listAll(userId: string): Promise<OutboxItem[]> {
    const rows = await this.db.query<OutboxRow>(`SELECT * FROM outbox_item WHERE user_id = ? ORDER BY sequence`, [userId]);
    const items = rows.map(rowToOutboxItem);
    this.items.set(items);
    return items;
  }

  /** App-start crash recovery (§4 "SENDING... App-crash / kill után induláskor visszaállítjuk PENDING-re"). */
  async resetSendingToPending(userId: string): Promise<void> {
    await this.db.run(`UPDATE outbox_item SET status = 'PENDING' WHERE user_id = ? AND status = 'SENDING'`, [userId]);
    this.items.update((list) => list.map((item) => (item.userId === userId && item.status === 'SENDING' ? { ...item, status: 'PENDING' } : item)));
  }

  /** Persists an `OutboxMigrator` step-chain result (§7) before the item is drained. */
  async applyMigration(id: string, payload: unknown, url: string, payloadVersion: number): Promise<void> {
    await this.db.run(`UPDATE outbox_item SET payload = ?, url = ?, payload_version = ? WHERE id = ?`, [
      JSON.stringify(payload),
      url,
      payloadVersion,
      id,
    ]);
    this.patchItem(id, { payload, url, payloadVersion });
  }

  async markSending(id: string): Promise<void> {
    const lastAttemptAt = new Date().toISOString();
    await this.db.run(`UPDATE outbox_item SET status = 'SENDING', last_attempt_at = ? WHERE id = ?`, [lastAttemptAt, id]);
    this.patchItem(id, { status: 'SENDING', lastAttemptAt });
  }

  /** Also used for the silent-drop-on-409-ENTITY_DELETED case — both simply remove the item. */
  async removeItem(id: string): Promise<void> {
    await this.db.run(`DELETE FROM outbox_item WHERE id = ?`, [id]);
    this.removeItems([id]);
  }

  async scheduleRetry(id: string, attemptCount: number): Promise<void> {
    await this.db.run(`UPDATE outbox_item SET status = 'PENDING', attempt_count = ? WHERE id = ?`, [attemptCount, id]);
    this.patchItem(id, { status: 'PENDING', attemptCount });
  }

  async markError(
    id: string,
    httpStatus: number | null,
    errorCode: string | null,
    errorMessage: string | null,
    errorField: string | null = null,
  ): Promise<void> {
    await this.db.run(`UPDATE outbox_item SET status = 'ERROR', http_status = ?, error_code = ?, error_message = ?, error_field = ? WHERE id = ?`, [
      httpStatus,
      errorCode,
      errorMessage,
      errorField,
      id,
    ]);
    this.patchItem(id, { status: 'ERROR', httpStatus, errorCode, errorMessage, errorField });
  }

  // ---- Manual intervention (§6 "Kézi beavatkozás") — UI entry point: Szinkronizációs központ ----

  /** `entityTask` must write the corrected value onto the local entity row, in the same transaction. */
  async fix(item: OutboxItem, newPayload: unknown, entityTask: SqlTask): Promise<void> {
    await this.db.executeTransaction([
      entityTask,
      {
        statement: `UPDATE outbox_item SET payload = ?, status = 'PENDING', attempt_count = 0, last_attempt_at = NULL,
          http_status = NULL, error_code = NULL, error_message = NULL, error_field = NULL WHERE id = ?`,
        values: [JSON.stringify(newPayload), item.id],
      },
    ]);
    this.patchItem(item.id, {
      payload: newPayload,
      status: 'PENDING',
      attemptCount: 0,
      lastAttemptAt: null,
      httpStatus: null,
      errorCode: null,
      errorMessage: null,
      errorField: null,
    });
  }

  async skip(id: string): Promise<void> {
    await this.db.run(`UPDATE outbox_item SET status = 'SKIPPED' WHERE id = ?`, [id]);
    this.patchItem(id, { status: 'SKIPPED' });
  }

  /** `currentPayload` must come from the live local entity row, not the payload captured at skip time (§6 "Unskip"). */
  async unskip(item: OutboxItem, currentPayload: unknown): Promise<void> {
    const newerRows = await this.db.query<OutboxRow>(
      `SELECT id FROM outbox_item WHERE target_entity_id = ? AND sequence > ? AND status IN ('PENDING','BLOCKED')`,
      [item.targetEntityId, item.sequence],
    );
    if (newerRows.length > 0) {
      await this.removeItem(item.id);
      return;
    }
    const payload = item.method === 'DELETE' ? null : currentPayload;
    await this.db.run(`UPDATE outbox_item SET payload = ?, status = 'PENDING' WHERE id = ?`, [payload === null ? null : JSON.stringify(payload), item.id]);
    this.patchItem(item.id, { payload, status: 'PENDING' });
  }

  /**
   * `entityTask` restores the local entity row per §6's Drop table (hard remove for a never-synced
   * POST, `_needs_refetch = 1` for a PUT/DELETE on an already-synced row — entity-specific, so the
   * caller builds it). Cascades to outbox items depending on a dropped POST's entity, per §6
   * "Cascade drop"; their own local entity rows are left for the caller to handle if it cares —
   * there is no dependency chain yet among the entities this phase covers.
   */
  async drop(item: OutboxItem, entityTask: SqlTask | SqlTask[]): Promise<OutboxItem[]> {
    const dependents = item.method === 'POST' ? await this.findDependents(item.targetEntityId) : [];
    const entityTasks = Array.isArray(entityTask) ? entityTask : [entityTask];
    const tasks: SqlTask[] = [...entityTasks, deleteOutboxRowTask(item.id), ...dependents.map((dep) => deleteOutboxRowTask(dep.id))];
    await this.db.executeTransaction(tasks);
    this.removeItems([item.id, ...dependents.map((dep) => dep.id)]);
    return dependents;
  }

  async findDependents(targetEntityId: string): Promise<OutboxItem[]> {
    const rows = await this.db.query<OutboxRow>(`SELECT * FROM outbox_item`, []);
    return rows.map(rowToOutboxItem).filter((item) => item.dependsOn.includes(targetEntityId));
  }

  private patchItem(id: string, patch: Partial<OutboxItem>): void {
    this.items.update((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  private removeItems(ids: string[]): void {
    this.items.update((list) => list.filter((item) => !ids.includes(item.id)));
  }

  private insertTask(request: EnqueueRequest, method: OutboxMethod): SqlTask {
    return {
      statement: `INSERT INTO outbox_item
        (id, created_at, user_id, method, url, payload, payload_version, entity_type, target_entity_id, depends_on, status, attempt_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)`,
      values: [
        uuidV4(),
        new Date().toISOString(),
        request.userId,
        method,
        request.url,
        method === 'DELETE' ? null : JSON.stringify(request.payload),
        OUTBOX_PAYLOAD_SCHEMA_VERSION,
        request.entityType,
        request.targetEntityId,
        JSON.stringify(request.dependsOn ?? []),
      ],
    };
  }
}

/** Exported for direct unit testing of the documented backoff sequence — not used outside this file otherwise. */
export function backoffFor(attemptCount: number): number {
  // Backend-offline first.md §6: "Tétel-újrapróbálkozási backoff: 2s → 8s → 30s → 2min → 10min".
  // attemptCount is the number of attempts already made (1 after the first failure), so the wait
  // before the next attempt is indexed by attemptCount - 1, not attemptCount — otherwise the
  // first retry waits 8s (the second entry) instead of the specified 2s.
  return RETRY_BACKOFF_MS[Math.min(Math.max(attemptCount - 1, 0), RETRY_BACKOFF_MS.length - 1)];
}

function deleteOutboxRowTask(id: string): SqlTask {
  return { statement: 'DELETE FROM outbox_item WHERE id = ?', values: [id] };
}

function updatePayloadTask(id: string, payload: unknown): SqlTask {
  return { statement: 'UPDATE outbox_item SET payload = ? WHERE id = ?', values: [JSON.stringify(payload), id] };
}
