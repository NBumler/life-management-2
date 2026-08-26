import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GearItemsService } from '../../api/api/gearItems.service';
import { HealthService } from '../../api/api/health.service';
import { PackingSessionItemsService } from '../../api/api/packingSessionItems.service';
import { PackingSessionsService } from '../../api/api/packingSessions.service';
import { PackingTemplatesService } from '../../api/api/packingTemplates.service';
import { ProfileService } from '../../api/api/profile.service';
import { SyncService } from '../../api/api/sync.service';
import { HealthResponse } from '../../api/model/healthResponse';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { SyncChangeItem } from '../../api/model/syncChangeItem';
import { AuthSessionService } from '../session/auth-session.service';
import { LocalDatabaseService } from '../storage/local-database.service';
import { OfflineQueueService } from './offline-queue.service';
import { OutboxItem } from './outbox-item';
import { SyncEngineService } from './sync-engine.service';

/** Private-method access for internal-mechanism tests (drain, classify, pull, backoff) — see class-level doc for why these aren't public. */
interface SyncEngineInternals {
  classifyAndHandle(item: OutboxItem, error: unknown): Promise<string>;
  buildApplyTasks(change: SyncChangeItem): Promise<Array<{ statement: string; values?: unknown[] }>>;
  buildServerApplyTasks(item: OutboxItem, body: unknown): Array<{ statement: string; values?: unknown[] }>;
  drain(userId: string): Promise<boolean>;
  pull(userId: string): Promise<void>;
  probeAndSync(): Promise<void>;
  probeBackend(): Promise<boolean>;
  scheduleReconnectProbe(): void;
  reconnectTimer: unknown;
}

describe('SyncEngineService', () => {
  let service: SyncEngineService;
  let internal: SyncEngineInternals;
  // HealthService/SyncService's generated methods are overloaded on `observe`, which fights
  // jasmine.SpyObj<...>'s return-type inference for no real benefit in these tests (see
  // auth-session.service.spec.ts for the same issue with AuthService).
  let healthApi: any;
  let profileApi: jasmine.SpyObj<ProfileService>;
  let gearApi: jasmine.SpyObj<GearItemsService>;
  let packingTemplatesApi: jasmine.SpyObj<PackingTemplatesService>;
  let packingSessionsApi: jasmine.SpyObj<PackingSessionsService>;
  let packingSessionItemsApi: jasmine.SpyObj<PackingSessionItemsService>;
  let syncApi: any;
  let authSession: { userId: () => string | null; clear: jasmine.Spy };
  let offlineQueue: jasmine.SpyObj<OfflineQueueService>;
  let db: { query: jasmine.Spy; run: jasmine.Spy; executeTransaction: jasmine.Spy };

  function outboxItem(overrides: Partial<OutboxItem> = {}): OutboxItem {
    return {
      sequence: 1,
      id: 'item-1',
      createdAt: new Date().toISOString(),
      userId: 'user-1',
      method: 'PUT',
      url: '/api/things/entity-x',
      payload: { a: 1 },
      payloadVersion: 1,
      entityType: 'UserProfile',
      targetEntityId: 'entity-x',
      dependsOn: [],
      status: 'PENDING',
      attemptCount: 0,
      lastAttemptAt: null,
      httpStatus: null,
      errorCode: null,
      errorMessage: null,
      errorField: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    healthApi = jasmine.createSpyObj('HealthService', ['getHealth']);
    profileApi = jasmine.createSpyObj('ProfileService', ['getProfile', 'getWeightHistoryEntry']);
    gearApi = jasmine.createSpyObj('GearItemsService', ['getGearItem']);
    packingTemplatesApi = jasmine.createSpyObj('PackingTemplatesService', ['getPackingTemplate']);
    packingSessionsApi = jasmine.createSpyObj('PackingSessionsService', ['getPackingSession']);
    packingSessionItemsApi = jasmine.createSpyObj('PackingSessionItemsService', ['getPackingSessionItem']);
    syncApi = jasmine.createSpyObj('SyncService', ['getSyncChanges']);
    authSession = { userId: () => 'user-1', clear: jasmine.createSpy('clear').and.resolveTo(undefined) };
    offlineQueue = jasmine.createSpyObj('OfflineQueueService', [
      'resetSendingToPending',
      'recomputeBlocked',
      'listRunnable',
      'refreshCounts',
      'markSending',
      'removeItem',
      'scheduleRetry',
      'markError',
      'applyMigration',
    ]);
    db = jasmine.createSpyObj('LocalDatabaseService', ['query', 'run', 'executeTransaction']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HealthService, useValue: healthApi },
        { provide: ProfileService, useValue: profileApi },
        { provide: GearItemsService, useValue: gearApi },
        { provide: PackingTemplatesService, useValue: packingTemplatesApi },
        { provide: PackingSessionsService, useValue: packingSessionsApi },
        { provide: PackingSessionItemsService, useValue: packingSessionItemsApi },
        { provide: SyncService, useValue: syncApi },
        { provide: AuthSessionService, useValue: authSession },
        { provide: OfflineQueueService, useValue: offlineQueue },
        { provide: LocalDatabaseService, useValue: db },
      ],
    });
    service = TestBed.inject(SyncEngineService);
    internal = service as unknown as SyncEngineInternals;
  });

  describe('classifyAndHandle — hibaosztályozás (§6 kötelező tábla)', () => {
    it('status 0 (network/timeout/DNS): stops the drain, does not touch the item', async () => {
      const outcome = await internal.classifyAndHandle(outboxItem(), new HttpErrorResponse({ status: 0 }));
      expect(outcome).toBe('stop-network');
      expect(offlineQueue.markError).not.toHaveBeenCalled();
      expect(offlineQueue.scheduleRetry).not.toHaveBeenCalled();
      expect(offlineQueue.removeItem).not.toHaveBeenCalled();
    });

    it('a non-HttpErrorResponse exception is treated the same as a network error', async () => {
      const outcome = await internal.classifyAndHandle(outboxItem(), new Error('boom'));
      expect(outcome).toBe('stop-network');
    });

    it('401: clears the session and stops the drain (outbox item is left as-is for retry after re-login)', async () => {
      const outcome = await internal.classifyAndHandle(outboxItem(), new HttpErrorResponse({ status: 401 }));
      expect(outcome).toBe('stop-auth');
      expect(authSession.clear).toHaveBeenCalled();
    });

    it('403: marks the item ERROR (jogosultság — kézi rendezés) and continues the drain', async () => {
      const outcome = await internal.classifyAndHandle(
        outboxItem(),
        new HttpErrorResponse({ status: 403, error: { code: 'FORBIDDEN', message: 'nope' } }),
      );
      expect(outcome).toBe('continue');
      expect(offlineQueue.markError).toHaveBeenCalledWith('item-1', 403, 'FORBIDDEN', 'nope', null);
    });

    it('404 on a DELETE: succeeds (idempotent) and applies a local tombstone', async () => {
      db.executeTransaction.and.resolveTo(undefined);
      const item = outboxItem({ method: 'DELETE', entityType: 'WeightHistoryEntry', targetEntityId: 'entity-x' });

      const outcome = await internal.classifyAndHandle(item, new HttpErrorResponse({ status: 404 }));

      expect(outcome).toBe('success');
      expect(db.executeTransaction).toHaveBeenCalled();
      expect(offlineQueue.removeItem).toHaveBeenCalledWith('item-1');
    });

    for (const method of ['PUT', 'POST'] as const) {
      it(`404 on a ${method}: marks the item ERROR (missing target)`, async () => {
        const outcome = await internal.classifyAndHandle(outboxItem({ method }), new HttpErrorResponse({ status: 404 }));
        expect(outcome).toBe('continue');
        expect(offlineQueue.markError).toHaveBeenCalled();
      });
    }

    it('409 ENTITY_DELETED: silently dropped (tombstone wins) — not an ERROR', async () => {
      db.executeTransaction.and.resolveTo(undefined);
      const item = outboxItem({ entityType: 'UserProfile', targetEntityId: 'entity-x' });

      const outcome = await internal.classifyAndHandle(
        item,
        new HttpErrorResponse({ status: 409, error: { code: 'ENTITY_DELETED', message: 'gone' } }),
      );

      expect(outcome).toBe('continue');
      expect(db.executeTransaction).toHaveBeenCalled();
      expect(offlineQueue.removeItem).toHaveBeenCalledWith('item-1');
      expect(offlineQueue.markError).not.toHaveBeenCalled();
    });

    it('409 UNIQUE_VIOLATION: marks the item ERROR for manual resolution, keeping field/message', async () => {
      const outcome = await internal.classifyAndHandle(
        outboxItem(),
        new HttpErrorResponse({ status: 409, error: { code: 'UNIQUE_VIOLATION', message: 'dup', field: 'name' } }),
      );
      expect(outcome).toBe('continue');
      expect(offlineQueue.markError).toHaveBeenCalledWith('item-1', 409, 'UNIQUE_VIOLATION', 'dup', 'name');
    });

    for (const status of [400, 422]) {
      it(`${status}: marks the item ERROR (validation)`, async () => {
        const outcome = await internal.classifyAndHandle(
          outboxItem(),
          new HttpErrorResponse({ status, error: { code: 'VALIDATION_ERROR', message: 'bad' } }),
        );
        expect(outcome).toBe('continue');
        expect(offlineQueue.markError).toHaveBeenCalled();
      });
    }

    for (const status of [408, 429, 500, 503]) {
      it(`${status}: schedules a retry with attemptCount + 1 while under the 5-attempt cap`, async () => {
        const item = outboxItem({ attemptCount: 2 });
        const outcome = await internal.classifyAndHandle(item, new HttpErrorResponse({ status }));
        expect(outcome).toBe('continue');
        expect(offlineQueue.scheduleRetry).toHaveBeenCalledWith('item-1', 3);
        expect(offlineQueue.markError).not.toHaveBeenCalled();
      });
    }

    it('408/429/5xx: gives up after the 5th attempt and marks ERROR instead of retrying again', async () => {
      const item = outboxItem({ attemptCount: 4 }); // classifyAndHandle sees this as the 5th failure
      const outcome = await internal.classifyAndHandle(item, new HttpErrorResponse({ status: 503 }));
      expect(outcome).toBe('continue');
      expect(offlineQueue.scheduleRetry).not.toHaveBeenCalled();
      expect(offlineQueue.markError).toHaveBeenCalled();
    });
  });

  describe('buildApplyTasks (§8 apply-szabályok)', () => {
    it('UserProfile update: writes the server row as authoritative', async () => {
      const change: SyncChangeItem = { entityType: 'UserProfile', id: 'p1', deleted: false, updatedAt: 'now', data: { id: 'p1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO user_profile');
    });

    it('UserProfile tombstone: writes the tombstone AND discards pending non-DELETE writes for it', async () => {
      const change: SyncChangeItem = { entityType: 'UserProfile', id: 'p1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO user_profile');
      expect(tasks[1].statement).toContain('DELETE FROM outbox_item');
      expect(tasks[1].statement).toContain("method != 'DELETE'");
      expect(tasks[1].values).toEqual(['p1']);
    });

    it('WeightHistoryEntry update: writes the server row as authoritative', async () => {
      const change: SyncChangeItem = { entityType: 'WeightHistoryEntry', id: 'w1', deleted: false, updatedAt: 'now', data: { id: 'w1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO weight_history_entry');
    });

    it('WeightHistoryEntry tombstone: writes the tombstone AND discards pending non-DELETE writes — same symmetry as UserProfile', async () => {
      const change: SyncChangeItem = { entityType: 'WeightHistoryEntry', id: 'w1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO weight_history_entry');
      expect(tasks[1].statement).toContain('DELETE FROM outbox_item');
      expect(tasks[1].values).toEqual(['w1']);
    });

    it('GearItem update: writes the server row as authoritative', async () => {
      const change: SyncChangeItem = { entityType: 'GearItem', id: 'g1', deleted: false, updatedAt: 'now', data: { id: 'g1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO gear_item');
    });

    it('GearItem tombstone: writes the tombstone AND discards pending non-DELETE writes — same symmetry as UserProfile', async () => {
      const change: SyncChangeItem = { entityType: 'GearItem', id: 'g1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO gear_item');
      expect(tasks[1].statement).toContain('DELETE FROM outbox_item');
      expect(tasks[1].values).toEqual(['g1']);
    });

    it('PackingTemplate update: writes the server row as authoritative (no items — that is a separate entityType)', async () => {
      const change: SyncChangeItem = { entityType: 'PackingTemplate', id: 't1', deleted: false, updatedAt: 'now', data: { id: 't1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO packing_template');
      expect(tasks[0].statement).not.toContain('packing_template_item');
    });

    it('PackingTemplate tombstone: writes the tombstone AND discards pending non-DELETE writes', async () => {
      const change: SyncChangeItem = { entityType: 'PackingTemplate', id: 't1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO packing_template');
      expect(tasks[0].statement).not.toContain('packing_template_item');
      expect(tasks[1].statement).toContain('DELETE FROM outbox_item');
      expect(tasks[1].values).toEqual(['t1']);
    });

    it('PackingTemplateItem update: writes the server row as authoritative', async () => {
      const change: SyncChangeItem = { entityType: 'PackingTemplateItem', id: 'ti1', deleted: false, updatedAt: 'now', data: { id: 'ti1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO packing_template_item');
    });

    it('PackingTemplateItem tombstone: writes the tombstone AND discards pending non-DELETE writes', async () => {
      const change: SyncChangeItem = { entityType: 'PackingTemplateItem', id: 'ti1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO packing_template_item');
      expect(tasks[1].values).toEqual(['ti1']);
    });

    it('PackingSession update: writes the server row as authoritative (base shape, no items)', async () => {
      const change: SyncChangeItem = { entityType: 'PackingSession', id: 's1', deleted: false, updatedAt: 'now', data: { id: 's1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session');
      expect(tasks[0].statement).not.toContain('packing_session_item');
    });

    it('PackingSession tombstone: writes the tombstone AND discards pending non-DELETE writes', async () => {
      const change: SyncChangeItem = { entityType: 'PackingSession', id: 's1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session');
      expect(tasks[0].statement).not.toContain('packing_session_item');
      expect(tasks[1].values).toEqual(['s1']);
    });

    it('PackingSessionItem update: writes the server row as authoritative', async () => {
      const change: SyncChangeItem = { entityType: 'PackingSessionItem', id: 'si1', deleted: false, updatedAt: 'now', data: { id: 'si1' } };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session_item');
    });

    it('PackingSessionItem tombstone: writes the tombstone AND discards pending non-DELETE writes', async () => {
      const change: SyncChangeItem = { entityType: 'PackingSessionItem', id: 'si1', deleted: true, updatedAt: 'now' };
      const tasks = await internal.buildApplyTasks(change);
      expect(tasks.length).toBe(2);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session_item');
      expect(tasks[1].values).toEqual(['si1']);
    });

    it('unknown entity types produce no local tasks', async () => {
      const change: SyncChangeItem = { entityType: 'SomethingElse', id: 'x', deleted: false, updatedAt: 'now', data: {} };
      expect(await internal.buildApplyTasks(change)).toEqual([]);
    });
  });

  describe('buildServerApplyTasks — nested aggregate PUT response (documentation/Architektúra/Backend.md)', () => {
    it('PackingTemplate: applies the template row AND every item row from the response, live or tombstoned', () => {
      const body: PackingTemplateDetail = {
        id: 't1',
        name: 'Tél',
        notes: null,
        deleted: false,
        items: [
          { id: 'i1', templateId: 't1', gearItemId: 'g1', sortOrder: 0, deleted: false },
          { id: 'i2', templateId: 't1', gearItemId: 'g2', sortOrder: 1, deleted: true },
        ],
      };
      const tasks = internal.buildServerApplyTasks(outboxItem({ entityType: 'PackingTemplate', targetEntityId: 't1' }), body);

      expect(tasks.length).toBe(3);
      expect(tasks[0].statement).toContain('INSERT INTO packing_template');
      expect(tasks[0].statement).not.toContain('packing_template_item');
      expect(tasks.slice(1).every((t) => t.statement.includes('INSERT INTO packing_template_item'))).toBe(true);
    });

    it('PackingSession create response (PackingSessionDetail, has items): applies the session row AND every item row', () => {
      const body: PackingSessionDetail = {
        id: 's1',
        destination: 'Tátra',
        sourceTemplateIds: ['t1'],
        deleted: false,
        items: [
          { id: 'i1', sessionId: 's1', gearItemId: 'g1', status: 'NOT_PACKED', sortOrder: 0, deleted: false },
          { id: 'i2', sessionId: 's1', gearItemId: 'g2', status: 'NOT_PACKED', sortOrder: 1, deleted: false },
        ],
      };
      const tasks = internal.buildServerApplyTasks(outboxItem({ entityType: 'PackingSession', targetEntityId: 's1' }), body);

      expect(tasks.length).toBe(3);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session');
      expect(tasks[0].statement).not.toContain('packing_session_item');
      expect(tasks.slice(1).every((t) => t.statement.includes('INSERT INTO packing_session_item'))).toBe(true);
    });

    it('PackingSession destination-update response (plain PackingSession, no items field): applies only the session row', () => {
      const body = { id: 's1', destination: 'Kőszikla', sourceTemplateIds: [], deleted: false };
      const tasks = internal.buildServerApplyTasks(outboxItem({ entityType: 'PackingSession', targetEntityId: 's1' }), body);

      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session');
      expect(tasks[0].statement).not.toContain('packing_session_item');
    });

    it('PackingSessionItem: applies just the single item row (status tap / reorder are never nested)', () => {
      const body = { id: 'i1', sessionId: 's1', gearItemId: 'g1', status: 'PACKED', sortOrder: 0, deleted: false };
      const tasks = internal.buildServerApplyTasks(outboxItem({ entityType: 'PackingSessionItem', targetEntityId: 'i1' }), body);

      expect(tasks.length).toBe(1);
      expect(tasks[0].statement).toContain('INSERT INTO packing_session_item');
    });

    it('unknown entity types throw (a forgotten dispatch branch must fail loudly, not silently no-op)', () => {
      expect(() => internal.buildServerApplyTasks(outboxItem({ entityType: 'SomethingElse' }), {})).toThrow();
    });
  });

  describe('drain mutex (§6 "egyszerre egy drain fut")', () => {
    it('a second concurrent drain() call is a no-op while the first is still running', async () => {
      offlineQueue.recomputeBlocked.and.resolveTo(undefined);
      offlineQueue.listRunnable.and.resolveTo([]);
      offlineQueue.refreshCounts.and.resolveTo(undefined);

      const p1 = internal.drain('user-1');
      const p2 = internal.drain('user-1');
      const [, r2] = await Promise.all([p1, p2]);

      expect(r2).toBe(false);
      expect(offlineQueue.recomputeBlocked).toHaveBeenCalledTimes(1);
    });

    it('allows a fresh drain() once the previous one has finished', async () => {
      offlineQueue.recomputeBlocked.and.resolveTo(undefined);
      offlineQueue.listRunnable.and.resolveTo([]);
      offlineQueue.refreshCounts.and.resolveTo(undefined);

      await internal.drain('user-1');
      await internal.drain('user-1');

      expect(offlineQueue.recomputeBlocked).toHaveBeenCalledTimes(2);
    });
  });

  describe('pull (§8 lapozás / delta sync)', () => {
    it('follows hasMore across pages, threading the cursor from one page to the next, and stops once hasMore is false', async () => {
      let storedCursor: string | null = null;
      db.query.and.callFake(() => Promise.resolve([{ cursor: storedCursor }]));
      db.executeTransaction.and.callFake((tasks: Array<{ statement: string; values?: unknown[] }>) => {
        const cursorTask = tasks.find((t) => t.statement.includes('sync_state'));
        if (cursorTask) {
          storedCursor = cursorTask.values?.[0] as string;
        }
        return Promise.resolve();
      });
      offlineQueue.refreshCounts.and.resolveTo(undefined);
      syncApi.getSyncChanges.and.callFake((since?: string) => {
        if (since === undefined) {
          return of({ serverTime: 't1', nextCursor: 'cursor-1', hasMore: true, changes: [] });
        }
        if (since === 'cursor-1') {
          return of({ serverTime: 't2', nextCursor: 'cursor-2', hasMore: false, changes: [] });
        }
        throw new Error(`unexpected since value: ${since}`);
      });

      await internal.pull('user-1');

      expect(syncApi.getSyncChanges).toHaveBeenCalledTimes(2);
      expect(storedCursor!).toBe('cursor-2');
    });

    it('410 CURSOR_TOO_OLD: nulls the cursor and retries the page instead of failing the pull (full re-pull)', async () => {
      let storedCursor: string | null = 'stale-cursor';
      db.query.and.callFake(() => Promise.resolve([{ cursor: storedCursor }]));
      db.run.and.callFake((sql: string) => {
        if (sql.includes('cursor = NULL')) {
          storedCursor = null;
        }
        return Promise.resolve({ changes: 1 });
      });
      db.executeTransaction.and.resolveTo(undefined);
      offlineQueue.refreshCounts.and.resolveTo(undefined);

      let callCount = 0;
      syncApi.getSyncChanges.and.callFake((since?: string) => {
        callCount++;
        if (callCount === 1) {
          expect(since).toBe('stale-cursor');
          return throwError(() => new HttpErrorResponse({ status: 410, error: { code: 'CURSOR_TOO_OLD' } }));
        }
        expect(since).toBeUndefined();
        return of({ serverTime: 't', nextCursor: 'fresh-cursor', hasMore: false, changes: [] });
      });

      await internal.pull('user-1');

      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/cursor = NULL/));
      expect(callCount).toBe(2);
    });
  });

  describe('requestDrain vs requestDrainDebounced (§6 trigger list)', () => {
    it('requestDrain() triggers probeAndSync immediately, without any debounce delay', () => {
      spyOn(internal, 'probeAndSync').and.resolveTo(undefined);
      service.requestDrain();
      expect(internal.probeAndSync).toHaveBeenCalledTimes(1);
    });

    it('requestDrainDebounced() coalesces rapid consecutive calls into a single probeAndSync ~1s later', fakeAsync(() => {
      spyOn(internal, 'probeAndSync').and.resolveTo(undefined);

      service.requestDrainDebounced();
      tick(400);
      service.requestDrainDebounced(); // resets the debounce window
      tick(400);
      expect(internal.probeAndSync).not.toHaveBeenCalled();

      tick(600); // 1000ms since the *second* call
      expect(internal.probeAndSync).toHaveBeenCalledTimes(1);
    }));

    it('requestDrainDebounced() called once fires exactly once after ~1s, not more', fakeAsync(() => {
      spyOn(internal, 'probeAndSync').and.resolveTo(undefined);

      service.requestDrainDebounced();
      tick(1000);

      expect(internal.probeAndSync).toHaveBeenCalledTimes(1);
    }));
  });

  describe('reconnect-probe backoff vs item-retry backoff (§6: two distinct mechanisms)', () => {
    // scheduleReconnectProbe() itself never touches the `Network` plugin (only probeAndSync's
    // failure branch does, before calling it) — calling it directly, with a spy on the global
    // setTimeout, exercises the exact delay sequence deterministically and synchronously, without
    // depending on `@capacitor/network`'s web implementation (which Karma's test bundle cannot
    // reliably load: its dynamically-imported chunk 404s in this harness, unrelated to this logic).
    it('follows 15s → 30s → 60s → 300s (clamped), not the offline-queue\'s 2s/8s/30s/2min/10min per-item retry sequence', () => {
      const setTimeoutSpy = spyOn(window, 'setTimeout').and.returnValue(0 as unknown as ReturnType<typeof setTimeout>);
      const delays: number[] = [];

      for (let i = 0; i < 5; i++) {
        internal.reconnectTimer = null; // simulate "the previous reconnect attempt's timer already fired"
        internal.scheduleReconnectProbe();
        delays.push(setTimeoutSpy.calls.mostRecent().args[1] as number);
      }

      expect(delays).toEqual([15000, 30000, 60000, 300000, 300000]);
      expect(delays).not.toContain(2000);
      expect(delays).not.toContain(8000);
      expect(delays).not.toContain(120000);
      expect(delays).not.toContain(600000);
    });

    it('does not reschedule while a reconnect probe is already pending (guards against overlapping timers)', () => {
      const setTimeoutSpy = spyOn(window, 'setTimeout').and.returnValue(0 as unknown as ReturnType<typeof setTimeout>);

      internal.scheduleReconnectProbe();
      internal.scheduleReconnectProbe();
      internal.scheduleReconnectProbe();

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('probeAndSync — connection state', () => {
    it('sets ONLINE when the backend responds', fakeAsync(() => {
      healthApi.getHealth.and.returnValue(of<HealthResponse>({ status: 'UP' }));
      void internal.probeAndSync();
      tick();
      expect(service.connectionState()).toBe('ONLINE');
      discardPeriodicTasks();
    }));
  });
});
