import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { firstValueFrom, timeout } from 'rxjs';

import { HealthService } from '../../api/api/health.service';
import { ProfileService } from '../../api/api/profile.service';
import { SyncService } from '../../api/api/sync.service';
import { ApiError } from '../../api/model/apiError';
import { SyncChangeItem } from '../../api/model/syncChangeItem';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import {
  profileServerApplyTask,
  profileTombstoneTask,
  weightHistoryServerApplyTask,
  weightHistoryTombstoneTask,
} from '../data/local-rows';
import { AuthSessionService } from '../session/auth-session.service';
import { LocalDatabaseService, SqlTask } from '../storage/local-database.service';
import { ConnectionState } from './connection-state';
import { OfflineQueueService } from './offline-queue.service';
import { OutboxItem } from './outbox-item';
import { migrateOutboxItem } from './outbox-migrator';

const HEALTH_PROBE_TIMEOUT_MS = 3000;
const RECONNECT_BACKOFF_MS = [15000, 30000, 60000, 300000];
const MUTATION_DRAIN_DEBOUNCE_MS = 1000;

type DrainOutcome = 'success' | 'continue' | 'stop-network' | 'stop-auth';

/**
 * documentation/Architektúra/Backend-offline first.md §6/§8: drain (outbox replay) then pull
 * (delta sync). Orchestration only — outbox CRUD lives in OfflineQueueService, the generated
 * OpenAPI client is this service's only business consumer (documentation/Architektúra/Frontend.md).
 */
@Injectable({ providedIn: 'root' })
export class SyncEngineService {
  private readonly http = inject(HttpClient);
  private readonly healthApi = inject(HealthService);
  private readonly profileApi = inject(ProfileService);
  private readonly syncApi = inject(SyncService);
  private readonly authSession = inject(AuthSessionService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly db = inject(LocalDatabaseService);

  readonly connectionState = signal<ConnectionState>('UNKNOWN');
  /** For SyncStatusButton's "forgó ikon" state (documentation/Architektúra/Backend-offline first.md §16). */
  readonly draining = signal(false);
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private startedForUserId: string | null = null;
  private drainDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cold start step 6 — never awaited by the caller; nothing here may block first render. */
  async init(): Promise<void> {
    void Network.addListener('networkStatusChange', (status) => {
      if (!status.connected) {
        this.clearReconnectTimer();
        this.connectionState.set('FULL_OFFLINE');
      } else {
        void this.probeAndSync();
      }
    });
    void App.addListener('resume', () => void this.probeAndSync());
    void this.probeAndSync();
  }

  /** Non-blocking, immediate kick — login, manual "Sync now", reconnect, app resume/start. */
  requestDrain(): void {
    void this.probeAndSync();
  }

  /**
   * documentation/Architektúra/Backend-offline first.md §6 trigger list: "minden user-mutáció
   * után (debounce ~1 s)". Repositories call this (not requestDrain()) after writes, so several
   * saves in quick succession — e.g. a profile save that also opens a weight-history row —
   * collapse into a single probe+drain instead of one health-check per write.
   */
  requestDrainDebounced(): void {
    if (this.drainDebounceTimer !== null) {
      clearTimeout(this.drainDebounceTimer);
    }
    this.drainDebounceTimer = setTimeout(() => {
      this.drainDebounceTimer = null;
      void this.probeAndSync();
    }, MUTATION_DRAIN_DEBOUNCE_MS);
  }

  private async probeAndSync(): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      return;
    }
    // documentation/Architektúra/Frontend.md: web is online-only — no outbox, no local store, so
    // there is nothing for drain()/pull() to touch. The connection-state probe below still runs
    // on web too (SyncStatusButton shows it there, minus the pending/error counts).
    const nativeSyncEnabled = Capacitor.isNativePlatform();

    if (nativeSyncEnabled && this.startedForUserId !== userId) {
      this.startedForUserId = userId;
      await this.offlineQueue.resetSendingToPending(userId);
    }

    const reachable = await this.probeBackend();
    const wasOnline = this.connectionState() === 'ONLINE';
    if (!reachable) {
      const online = (await Network.getStatus()).connected;
      this.connectionState.set(online ? 'BACKEND_OFFLINE' : 'FULL_OFFLINE');
      this.scheduleReconnectProbe();
      return;
    }
    this.clearReconnectTimer();
    this.connectionState.set('ONLINE');

    if (!nativeSyncEnabled) {
      return;
    }
    const didDrain = await this.drain(userId);
    if (didDrain || !wasOnline) {
      await this.pull(userId);
    }
    await this.refetchNeeded();
  }

  /** §6 "Kézi beavatkozás" Drop table: `_needs_refetch = 1` rows need a targeted GET, delta pull is not enough. */
  private async refetchNeeded(): Promise<void> {
    const staleProfiles = await this.db.query<{ id: string }>('SELECT id FROM user_profile WHERE _needs_refetch = 1');
    if (staleProfiles.length > 0) {
      try {
        const dto = await firstValueFrom(this.profileApi.getProfile());
        await this.db.executeTransaction([profileServerApplyTask(dto)]);
      } catch {
        // 404 (never saved server-side) or transient failure: leave the flag set, retried next cycle.
      }
    }

    const staleEntries = await this.db.query<{ id: string }>('SELECT id FROM weight_history_entry WHERE _needs_refetch = 1');
    for (const row of staleEntries) {
      try {
        const dto = await firstValueFrom(this.profileApi.getWeightHistoryEntry(row.id));
        await this.db.executeTransaction([weightHistoryServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }
  }

  private async probeBackend(): Promise<boolean> {
    try {
      await firstValueFrom(this.healthApi.getHealth().pipe(timeout(HEALTH_PROBE_TIMEOUT_MS)));
      return true;
    } catch {
      return false;
    }
  }

  private scheduleReconnectProbe(): void {
    if (this.reconnectTimer !== null) {
      return;
    }
    const delay = RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.probeAndSync();
    }, delay);
  }

  private clearReconnectTimer(): void {
    this.reconnectAttempt = 0;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** @returns whether at least one item was successfully sent (callers use this to decide whether a pull is owed). */
  private async drain(userId: string): Promise<boolean> {
    if (this.draining()) {
      return false;
    }
    this.draining.set(true);
    let ranAny = false;
    try {
      await this.offlineQueue.recomputeBlocked(userId);
      const runnable = await this.offlineQueue.listRunnable(userId);
      for (const item of runnable) {
        const outcome = await this.migrateThenExecute(item);
        if (outcome === 'success') {
          ranAny = true;
        }
        if (outcome === 'stop-network' || outcome === 'stop-auth') {
          break;
        }
      }
    } finally {
      this.draining.set(false);
    }
    await this.offlineQueue.refreshCounts(userId);
    return ranAny;
  }

  /**
   * documentation/Architektúra/Backend-offline first.md §7: before an item is drained, walk any
   * outdated `payloadVersion` through the `OutboxMigrator` step chain. A missing step is not a
   * network/auth condition, so it does not stop the drain loop — it only fails this one item.
   */
  private async migrateThenExecute(item: OutboxItem): Promise<DrainOutcome> {
    const migration = migrateOutboxItem(item);
    if (migration.errorMessage !== null) {
      await this.offlineQueue.markError(item.id, null, 'PAYLOAD_MIGRATION_FAILED', migration.errorMessage);
      return 'continue';
    }
    if (!migration.migrated) {
      return this.executeOutboxItem(item);
    }
    await this.offlineQueue.applyMigration(item.id, migration.payload, migration.url, migration.payloadVersion);
    return this.executeOutboxItem({ ...item, payload: migration.payload, url: migration.url, payloadVersion: migration.payloadVersion });
  }

  private async executeOutboxItem(item: OutboxItem): Promise<DrainOutcome> {
    await this.offlineQueue.markSending(item.id);
    try {
      const body = await firstValueFrom(
        this.http.request(item.method, item.url, {
          body: item.method === 'DELETE' ? undefined : item.payload,
          headers: { 'Idempotency-Key': item.id },
        }),
      );
      await this.db.executeTransaction([this.buildServerApplyTask(item, body)]);
      await this.offlineQueue.removeItem(item.id);
      return 'success';
    } catch (error) {
      return this.classifyAndHandle(item, error);
    }
  }

  private async classifyAndHandle(item: OutboxItem, error: unknown): Promise<DrainOutcome> {
    if (!(error instanceof HttpErrorResponse) || error.status === 0) {
      return 'stop-network';
    }
    if (error.status === 401) {
      await this.authSession.clear();
      return 'stop-auth';
    }

    const apiError = error.error as ApiError | undefined;

    if (error.status === 404 && item.method === 'DELETE') {
      await this.applyTombstone(item);
      await this.offlineQueue.removeItem(item.id);
      return 'success';
    }
    if (error.status === 409 && apiError?.code === 'ENTITY_DELETED') {
      await this.applyTombstone(item);
      await this.offlineQueue.removeItem(item.id);
      return 'continue';
    }
    if (error.status === 408 || error.status === 429 || error.status >= 500) {
      const attemptCount = item.attemptCount + 1;
      if (attemptCount < 5) {
        await this.offlineQueue.scheduleRetry(item.id, attemptCount);
        return 'continue';
      }
    }

    await this.offlineQueue.markError(item.id, error.status, apiError?.code ?? null, apiError?.message ?? error.message, apiError?.field ?? null);
    return 'continue';
  }

  private buildServerApplyTask(item: OutboxItem, body: unknown): SqlTask {
    if (item.entityType === 'UserProfile') {
      return profileServerApplyTask(body as UserProfile);
    }
    if (item.entityType === 'WeightHistoryEntry') {
      return weightHistoryServerApplyTask(body as WeightHistoryEntry);
    }
    throw new Error(`SyncEngine: no local writer for entityType "${item.entityType}"`);
  }

  private async applyTombstone(item: OutboxItem): Promise<void> {
    const now = new Date().toISOString();
    if (item.entityType === 'UserProfile') {
      await this.db.executeTransaction([profileTombstoneTask(item.targetEntityId, now)]);
    } else if (item.entityType === 'WeightHistoryEntry') {
      await this.db.executeTransaction([weightHistoryTombstoneTask(item.targetEntityId, null, now)]);
    }
  }

  /** documentation/Architektúra/Backend-offline first.md §8: cursor-paged delta pull. */
  private async pull(userId: string): Promise<void> {
    let hasMore = true;
    while (hasMore) {
      const stateRows = await this.db.query<{ cursor: string | null }>('SELECT cursor FROM sync_state WHERE id = 1');
      const since = stateRows[0]?.cursor ?? undefined;

      const response = await firstValueFrom(this.syncApi.getSyncChanges(since)).catch(async (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 410) {
          await this.db.run('UPDATE sync_state SET cursor = NULL WHERE id = 1');
          return null;
        }
        throw error;
      });
      if (response === null) {
        continue;
      }

      const tasks: SqlTask[] = [];
      for (const change of response.changes) {
        tasks.push(...this.buildApplyTasks(change));
      }
      tasks.push({
        statement: 'UPDATE sync_state SET cursor = ?, last_pull_at = ?, last_pull_status = ?, first_pull_completed = 1 WHERE id = 1',
        values: [response.nextCursor, response.serverTime, 'OK'],
      });
      await this.db.executeTransaction(tasks);
      hasMore = response.hasMore;
    }
    await this.offlineQueue.refreshCounts(userId);
  }

  private buildApplyTasks(change: SyncChangeItem): SqlTask[] {
    if (change.entityType === 'UserProfile') {
      if (!change.deleted) {
        return [profileServerApplyTask(change.data as UserProfile)];
      }
      return [profileTombstoneTask(change.id, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WeightHistoryEntry') {
      if (!change.deleted) {
        return [weightHistoryServerApplyTask(change.data as WeightHistoryEntry)];
      }
      return [weightHistoryTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    return [];
  }
}

/**
 * Backend-offline first.md §8 apply rule "`_dirty = 1` + `deleted = true` → a tombstone győz…
 * a `PENDING` `PUT`-ok eldobandók (nincs resurrect)": drops any not-yet-sent write for an entity
 * that the server reports as deleted, for every synced entity type — not just the ones that
 * happen to expose a delete UI today.
 */
function discardPendingWritesTask(targetEntityId: string): SqlTask {
  return {
    statement: "DELETE FROM outbox_item WHERE target_entity_id = ? AND method != 'DELETE' AND status IN ('PENDING','BLOCKED')",
    values: [targetEntityId],
  };
}
