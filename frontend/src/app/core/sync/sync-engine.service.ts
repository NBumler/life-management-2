import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { firstValueFrom, timeout } from 'rxjs';

import { EventsService } from '../../api/api/events.service';
import { FoodsService } from '../../api/api/foods.service';
import { GearItemsService } from '../../api/api/gearItems.service';
import { HealthService } from '../../api/api/health.service';
import { HouseholdRoomsService } from '../../api/api/householdRooms.service';
import { HouseholdTasksService } from '../../api/api/householdTasks.service';
import { LifePlansService } from '../../api/api/lifePlans.service';
import { PackingSessionItemsService } from '../../api/api/packingSessionItems.service';
import { PackingSessionsService } from '../../api/api/packingSessions.service';
import { PackingTemplatesService } from '../../api/api/packingTemplates.service';
import { ProfileService } from '../../api/api/profile.service';
import { SyncService } from '../../api/api/sync.service';
import { ApiError } from '../../api/model/apiError';
import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { PackingTemplateItem } from '../../api/model/packingTemplateItem';
import { SyncChangeItem } from '../../api/model/syncChangeItem';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import {
  calendarEventServerApplyTask,
  calendarEventTombstoneTask,
  foodServerApplyTask,
  foodTombstoneTask,
  gearItemServerApplyTask,
  gearItemTombstoneTask,
  householdRoomServerApplyTask,
  householdRoomTombstoneTask,
  householdTaskServerApplyTask,
  householdTaskTombstoneTask,
  lifePlanServerApplyTask,
  lifePlanTombstoneTask,
  packingSessionItemServerApplyTask,
  packingSessionItemTombstoneTask,
  packingSessionServerApplyTask,
  packingSessionTombstoneTask,
  packingTemplateItemServerApplyTask,
  packingTemplateItemTombstoneTask,
  packingTemplateServerApplyTask,
  packingTemplateTombstoneTask,
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
  private readonly gearApi = inject(GearItemsService);
  private readonly packingTemplatesApi = inject(PackingTemplatesService);
  private readonly packingSessionsApi = inject(PackingSessionsService);
  private readonly packingSessionItemsApi = inject(PackingSessionItemsService);
  private readonly lifePlansApi = inject(LifePlansService);
  private readonly householdRoomsApi = inject(HouseholdRoomsService);
  private readonly householdTasksApi = inject(HouseholdTasksService);
  private readonly eventsApi = inject(EventsService);
  private readonly foodsApi = inject(FoodsService);
  private readonly syncApi = inject(SyncService);
  private readonly authSession = inject(AuthSessionService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly db = inject(LocalDatabaseService);

  readonly connectionState = signal<ConnectionState>('UNKNOWN');
  /** For SyncStatusButton's "forgó ikon" state (documentation/Architektúra/Backend-offline first.md §16). */
  readonly draining = signal(false);
  /**
   * documentation/Features/Szinkronizációs központ.md fejléc: "utolsó sikeres szinkronizálás ideje".
   * Backed by `sync_state.last_pull_at` (server clock, `serverTime`) — loaded at `init()` so it
   * survives across app restarts, then refreshed after every completed `pull()`.
   */
  readonly lastSuccessfulSyncAt = signal<string | null>(null);
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private startedForUserId: string | null = null;
  private drainDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cold start step 6 — never awaited by the caller; nothing here may block first render. */
  async init(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const rows = await this.db.query<{ last_pull_at: string | null }>('SELECT last_pull_at FROM sync_state WHERE id = 1');
      this.lastSuccessfulSyncAt.set(rows[0]?.last_pull_at ?? null);
    }
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

    const staleGearItems = await this.db.query<{ id: string }>('SELECT id FROM gear_item WHERE _needs_refetch = 1');
    for (const row of staleGearItems) {
      try {
        const dto = await firstValueFrom(this.gearApi.getGearItem(row.id));
        await this.db.executeTransaction([gearItemServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleTemplates = await this.db.query<{ id: string }>('SELECT id FROM packing_template WHERE _needs_refetch = 1');
    for (const row of staleTemplates) {
      try {
        const dto = await firstValueFrom(this.packingTemplatesApi.getPackingTemplate(row.id));
        await this.db.executeTransaction(this.packingTemplateApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleSessions = await this.db.query<{ id: string }>('SELECT id FROM packing_session WHERE _needs_refetch = 1');
    for (const row of staleSessions) {
      try {
        const dto = await firstValueFrom(this.packingSessionsApi.getPackingSession(row.id));
        await this.db.executeTransaction(this.packingSessionApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleSessionItems = await this.db.query<{ id: string }>('SELECT id FROM packing_session_item WHERE _needs_refetch = 1');
    for (const row of staleSessionItems) {
      try {
        const dto = await firstValueFrom(this.packingSessionItemsApi.getPackingSessionItem(row.id));
        await this.db.executeTransaction([packingSessionItemServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleLifePlans = await this.db.query<{ id: string }>('SELECT id FROM life_plan WHERE _needs_refetch = 1');
    for (const row of staleLifePlans) {
      try {
        const dto = await firstValueFrom(this.lifePlansApi.getLifePlan(row.id));
        await this.db.executeTransaction([lifePlanServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleRooms = await this.db.query<{ id: string }>('SELECT id FROM household_room WHERE _needs_refetch = 1');
    for (const row of staleRooms) {
      try {
        const dto = await firstValueFrom(this.householdRoomsApi.getHouseholdRoom(row.id));
        await this.db.executeTransaction([householdRoomServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleTasks = await this.db.query<{ id: string }>('SELECT id FROM household_task WHERE _needs_refetch = 1');
    for (const row of staleTasks) {
      try {
        const dto = await firstValueFrom(this.householdTasksApi.getHouseholdTask(row.id));
        await this.db.executeTransaction([householdTaskServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleEvents = await this.db.query<{ id: string }>('SELECT id FROM calendar_event WHERE _needs_refetch = 1');
    for (const row of staleEvents) {
      try {
        const dto = await firstValueFrom(this.eventsApi.getEvent(row.id));
        await this.db.executeTransaction([calendarEventServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleFoods = await this.db.query<{ id: string }>('SELECT id FROM food WHERE _needs_refetch = 1');
    for (const row of staleFoods) {
      try {
        const dto = await firstValueFrom(this.foodsApi.getFood(row.id));
        await this.db.executeTransaction([foodServerApplyTask(dto)]);
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
      await this.db.executeTransaction(this.buildServerApplyTasks(item, body));
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

  private buildServerApplyTasks(item: OutboxItem, body: unknown): SqlTask[] {
    if (item.entityType === 'UserProfile') {
      return [profileServerApplyTask(body as UserProfile)];
    }
    if (item.entityType === 'WeightHistoryEntry') {
      return [weightHistoryServerApplyTask(body as WeightHistoryEntry)];
    }
    if (item.entityType === 'GearItem') {
      return [gearItemServerApplyTask(body as GearItem)];
    }
    if (item.entityType === 'PackingTemplate') {
      return this.packingTemplateApplyTasks(body as PackingTemplateDetail);
    }
    if (item.entityType === 'PackingSession') {
      return this.packingSessionApplyTasks(body as PackingSession | PackingSessionDetail);
    }
    if (item.entityType === 'PackingSessionItem') {
      return [packingSessionItemServerApplyTask(body as PackingSessionItem)];
    }
    if (item.entityType === 'LifePlan') {
      return [lifePlanServerApplyTask(body as LifePlan)];
    }
    if (item.entityType === 'HouseholdRoom') {
      return [householdRoomServerApplyTask(body as HouseholdRoom)];
    }
    if (item.entityType === 'HouseholdTask') {
      return [householdTaskServerApplyTask(body as HouseholdTask)];
    }
    if (item.entityType === 'CalendarEvent') {
      return [calendarEventServerApplyTask(body as CalendarEvent)];
    }
    if (item.entityType === 'Food') {
      return [foodServerApplyTask(body as Food)];
    }
    throw new Error(`SyncEngine: no local writer for entityType "${item.entityType}"`);
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every item row
   * (live or tombstoned — PackingTemplateDetail.yaml), which this applies as authoritative so each
   * one's local `_dirty`/`_local_only` flags clear too — items never get their own outbox entry, so
   * nothing else would ever clear them (§8's `_dirty=1` apply rule otherwise keeps the pending value
   * forever). The subsequent mandatory post-drain pull (§6 point 9) still independently confirms
   * every row and catches anything this device didn't know about (e.g. a concurrent cascade).
   */
  private packingTemplateApplyTasks(dto: PackingTemplateDetail): SqlTask[] {
    return [packingTemplateServerApplyTask(dto), ...dto.items.map((item: PackingTemplateItem) => packingTemplateItemServerApplyTask(item))];
  }

  /**
   * documentation/Subfeatures/Pakolás.md: unlike PackingTemplate, `PackingSession` covers two
   * different outbox response shapes under the same entityType — the nested "Indítás" create
   * (`PackingSessionDetail`, with `items`) and the plain destination-only update (`PackingSession`,
   * no `items`) — so the item rows are only applied when the response actually carries them.
   */
  private packingSessionApplyTasks(dto: PackingSession | PackingSessionDetail): SqlTask[] {
    const tasks: SqlTask[] = [packingSessionServerApplyTask(dto)];
    if ('items' in dto) {
      tasks.push(...dto.items.map((item: PackingSessionItem) => packingSessionItemServerApplyTask(item)));
    }
    return tasks;
  }

  private async applyTombstone(item: OutboxItem): Promise<void> {
    const now = new Date().toISOString();
    if (item.entityType === 'UserProfile') {
      await this.db.executeTransaction([profileTombstoneTask(item.targetEntityId, now)]);
    } else if (item.entityType === 'WeightHistoryEntry') {
      await this.db.executeTransaction([weightHistoryTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'GearItem') {
      await this.db.executeTransaction([gearItemTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'PackingTemplate') {
      // documentation/Subfeatures/Sablonok.md: template delete cascades to its own items locally too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM packing_template_item WHERE template_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        packingTemplateTombstoneTask(item.targetEntityId, null, now),
        ...itemRows.map((row) => packingTemplateItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'PackingSession') {
      // documentation/Subfeatures/Pakolás.md: "Lezárás" cascades to the session's own items locally too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM packing_session_item WHERE session_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        packingSessionTombstoneTask(item.targetEntityId, null, now),
        ...itemRows.map((row) => packingSessionItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'PackingSessionItem') {
      await this.db.executeTransaction([packingSessionItemTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'LifePlan') {
      await this.db.executeTransaction([lifePlanTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'HouseholdRoom') {
      // documentation/Subfeatures/Háztartási feladatok.md: room delete cascades to its own tasks locally too.
      const taskRows = await this.db.query<{ id: string }>('SELECT id FROM household_task WHERE room_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        householdRoomTombstoneTask(item.targetEntityId, null, now),
        ...taskRows.map((row) => householdTaskTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'HouseholdTask') {
      await this.db.executeTransaction([householdTaskTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'CalendarEvent') {
      await this.db.executeTransaction([calendarEventTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Food') {
      await this.db.executeTransaction([foodTombstoneTask(item.targetEntityId, null, now)]);
    }
  }

  /** documentation/Architektúra/Backend-offline first.md §8: cursor-paged delta pull. */
  private async pull(userId: string): Promise<void> {
    let hasMore = true;
    let syncedAt: string | null = null;
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
      syncedAt = response.serverTime;
      hasMore = response.hasMore;
    }
    if (syncedAt !== null) {
      this.lastSuccessfulSyncAt.set(syncedAt);
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
    if (change.entityType === 'GearItem') {
      if (!change.deleted) {
        return [gearItemServerApplyTask(change.data as GearItem)];
      }
      return [gearItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingTemplate') {
      if (!change.deleted) {
        return [packingTemplateServerApplyTask(change.data as PackingTemplate)];
      }
      return [packingTemplateTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingTemplateItem') {
      if (!change.deleted) {
        return [packingTemplateItemServerApplyTask(change.data as PackingTemplateItem)];
      }
      return [packingTemplateItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingSession') {
      if (!change.deleted) {
        return [packingSessionServerApplyTask(change.data as PackingSession)];
      }
      return [packingSessionTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingSessionItem') {
      if (!change.deleted) {
        return [packingSessionItemServerApplyTask(change.data as PackingSessionItem)];
      }
      return [packingSessionItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'LifePlan') {
      if (!change.deleted) {
        return [lifePlanServerApplyTask(change.data as LifePlan)];
      }
      return [lifePlanTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'HouseholdRoom') {
      if (!change.deleted) {
        return [householdRoomServerApplyTask(change.data as HouseholdRoom)];
      }
      return [householdRoomTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'HouseholdTask') {
      if (!change.deleted) {
        return [householdTaskServerApplyTask(change.data as HouseholdTask)];
      }
      return [householdTaskTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'CalendarEvent') {
      if (!change.deleted) {
        return [calendarEventServerApplyTask(change.data as CalendarEvent)];
      }
      return [calendarEventTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Food') {
      if (!change.deleted) {
        return [foodServerApplyTask(change.data as Food)];
      }
      return [foodTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
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
