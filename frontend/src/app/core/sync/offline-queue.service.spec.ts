import { TestBed } from '@angular/core/testing';

import { LocalDatabaseService } from '../storage/local-database.service';
import { OUTBOX_PAYLOAD_SCHEMA_VERSION, OfflineQueueService, backoffFor } from './offline-queue.service';
import { OutboxItem, OutboxRow } from './outbox-item';

// documentation/Architektúra/Backend-offline first.md §6 "Tétel-újrapróbálkozási backoff": 2s → 8s → 30s → 2min → 10min.
describe('backoffFor', () => {
  it('returns the documented retry sequence for attemptCount 1..5', () => {
    expect(backoffFor(1)).toBe(2000);
    expect(backoffFor(2)).toBe(8000);
    expect(backoffFor(3)).toBe(30000);
    expect(backoffFor(4)).toBe(120000);
    expect(backoffFor(5)).toBe(600000);
  });

  it('clamps to the last (10 min) entry once attemptCount exceeds the table', () => {
    expect(backoffFor(6)).toBe(600000);
    expect(backoffFor(100)).toBe(600000);
  });

  it('clamps attemptCount 0 or negative to the first entry instead of indexing out of bounds', () => {
    expect(backoffFor(0)).toBe(2000);
    expect(backoffFor(-1)).toBe(2000);
  });
});

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let db: { query: jasmine.Spy; run: jasmine.Spy; executeTransaction: jasmine.Spy };

  function outboxRow(overrides: Partial<OutboxRow>): OutboxRow {
    return {
      sequence: 1,
      id: 'item-1',
      created_at: new Date().toISOString(),
      user_id: 'user-1',
      method: 'POST',
      url: '/api/things/entity-x',
      payload: '{"a":1}',
      payload_version: OUTBOX_PAYLOAD_SCHEMA_VERSION,
      entity_type: 'Thing',
      target_entity_id: 'entity-x',
      depends_on: '[]',
      status: 'PENDING',
      attempt_count: 0,
      last_attempt_at: null,
      http_status: null,
      error_code: null,
      error_message: null,
      error_field: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    db = jasmine.createSpyObj('LocalDatabaseService', ['query', 'run', 'executeTransaction']);
    TestBed.configureTestingModule({
      providers: [{ provide: LocalDatabaseService, useValue: db }],
    });
    service = TestBed.inject(OfflineQueueService);
  });

  describe('buildEnqueueTasks — outbox-összevonás (§5 coalescing table)', () => {
    it('POST(X) + PUT(X): updates the POST payload, creates no new row', async () => {
      const postRow = outboxRow({ id: 'post-1', method: 'POST', entity_type: 'GearItem' });
      db.query.and.resolveTo([postRow]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'PUT',
        url: '/api/things/entity-x',
        payload: { a: 2 },
        entityType: 'GearItem',
        targetEntityId: 'entity-x',
      });

      expect(result.hardRemoveLocalEntity).toBe(false);
      expect(result.outboxTasks.length).toBe(1);
      expect(result.outboxTasks[0].statement).toContain('UPDATE outbox_item SET payload');
      expect(result.outboxTasks[0].values).toEqual([JSON.stringify({ a: 2 }), 'post-1']);
    });

    it('PUT(X) + PUT(X): overwrites the existing PUT payload in place', async () => {
      const putRow = outboxRow({ id: 'put-1', method: 'PUT', entity_type: 'GearItem' });
      db.query.and.resolveTo([putRow]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'PUT',
        url: '/api/things/entity-x',
        payload: { a: 3 },
        entityType: 'GearItem',
        targetEntityId: 'entity-x',
      });

      expect(result.outboxTasks.length).toBe(1);
      expect(result.outboxTasks[0].statement).toContain('UPDATE outbox_item SET payload');
      expect(result.outboxTasks[0].values).toEqual([JSON.stringify({ a: 3 }), 'put-1']);
    });

    it('POST(X) + DELETE(X): both removed from the outbox; caller must hard-remove the local row (never-synced draft)', async () => {
      const postRow = outboxRow({ id: 'post-1', method: 'POST', entity_type: 'GearItem' });
      db.query.and.resolveTo([postRow]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'DELETE',
        url: '/api/things/entity-x',
        payload: null,
        entityType: 'GearItem',
        targetEntityId: 'entity-x',
      });

      expect(result.hardRemoveLocalEntity).toBe(true);
      expect(result.outboxTasks.length).toBe(1);
      expect(result.outboxTasks[0].statement).toContain('DELETE FROM outbox_item');
      expect(result.outboxTasks[0].values).toEqual(['post-1']);
    });

    it('PUT(X) + DELETE(X): the PENDING PUT is discarded, only the DELETE remains', async () => {
      const putRow = outboxRow({ id: 'put-1', method: 'PUT' });
      db.query.and.resolveTo([putRow]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'DELETE',
        url: '/api/things/entity-x',
        payload: null,
        entityType: 'GearItem',
        targetEntityId: 'entity-x',
      });

      expect(result.hardRemoveLocalEntity).toBe(false);
      expect(result.outboxTasks.length).toBe(2);
      expect(result.outboxTasks[0].statement).toContain('DELETE FROM outbox_item');
      expect(result.outboxTasks[0].values).toEqual(['put-1']);
      expect(result.outboxTasks[1].statement).toContain('INSERT INTO outbox_item');
    });

    it('DELETE(X) + anything: rejects — a pending delete cannot be edited further', async () => {
      const deleteRow = outboxRow({ id: 'del-1', method: 'DELETE' });
      db.query.and.resolveTo([deleteRow]);

      await expectAsync(
        service.buildEnqueueTasks({
          userId: 'user-1',
          method: 'PUT',
          url: '/api/things/entity-x',
          payload: { a: 1 },
          entityType: 'GearItem',
          targetEntityId: 'entity-x',
        }),
      ).toBeRejected();
    });

    it('repeated natural-key upsert (POST again over a PENDING POST): payload updates, no new row', async () => {
      const postRow = outboxRow({ id: 'post-1', method: 'POST', entity_type: 'GearItem' });
      db.query.and.resolveTo([postRow]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'POST',
        url: '/api/things/entity-x',
        payload: { a: 5 },
        entityType: 'GearItem',
        targetEntityId: 'entity-x',
      });

      expect(result.outboxTasks.length).toBe(1);
      expect(result.outboxTasks[0].statement).toContain('UPDATE outbox_item SET payload');
      expect(result.outboxTasks[0].values).toEqual([JSON.stringify({ a: 5 }), 'post-1']);
    });

    it('action endpoint (different entityType, same targetEntityId): never coalesces into the entity’s create POST', async () => {
      // documentation/Subfeatures/Bevásárlás teljesítve.md: a ShoppingListComplete POST shares the
      // list's targetEntityId but must stay its own row — folding it into the pending create POST
      // would send the completion body to the create URL.
      const createPost = outboxRow({ id: 'create-1', method: 'POST', entity_type: 'ShoppingList', url: '/api/shopping-lists', target_entity_id: 'list-1' });
      db.query.and.resolveTo([createPost]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'POST',
        url: '/api/shopping-lists/list-1/complete',
        payload: { checkedFoodEntries: [] },
        entityType: 'ShoppingListComplete',
        targetEntityId: 'list-1',
      });

      expect(result.outboxTasks.length).toBe(1);
      expect(result.outboxTasks[0].statement).toContain('INSERT INTO outbox_item');
    });

    it('no PENDING row for the entity: creates a brand-new item (a SENDING/ERROR/SKIPPED row is never coalesced into — the PENDING-only WHERE clause already excludes it)', async () => {
      db.query.and.resolveTo([]);

      const result = await service.buildEnqueueTasks({
        userId: 'user-1',
        method: 'PUT',
        url: '/api/things/entity-x',
        payload: { a: 9 },
        entityType: 'GearItem',
        targetEntityId: 'entity-x',
      });

      expect(result.hardRemoveLocalEntity).toBe(false);
      expect(result.outboxTasks.length).toBe(1);
      expect(result.outboxTasks[0].statement).toContain('INSERT INTO outbox_item');
    });
  });

  describe('recomputeBlocked (§4 "Függőségi zár")', () => {
    it('blocks PENDING items that target or depend on an earlier ERROR item, and unblocks a BLOCKED item that no longer matches', async () => {
      const errorRow = outboxRow({ id: 'err-1', sequence: 1, status: 'ERROR', target_entity_id: 'entity-x' });
      const blockedByTarget = outboxRow({ id: 'p-2', sequence: 2, status: 'PENDING', target_entity_id: 'entity-x' });
      const blockedByDependsOn = outboxRow({ id: 'p-3', sequence: 3, status: 'PENDING', target_entity_id: 'entity-y', depends_on: '["entity-x"]' });
      const noLongerBlocked = outboxRow({ id: 'p-4', sequence: 4, status: 'BLOCKED', target_entity_id: 'entity-z' });
      const independent = outboxRow({ id: 'p-5', sequence: 5, status: 'PENDING', target_entity_id: 'entity-w' });

      db.query.and.callFake((sql: string) => {
        if (sql.includes("status IN ('PENDING','BLOCKED')")) {
          return Promise.resolve([blockedByTarget, blockedByDependsOn, noLongerBlocked, independent]);
        }
        if (sql.includes("status = 'ERROR'")) {
          return Promise.resolve([errorRow]);
        }
        return Promise.resolve([]);
      });
      db.run.and.resolveTo({ changes: 1 });

      await service.recomputeBlocked('user-1');

      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/status = 'BLOCKED'/), ['p-2']);
      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/status = 'BLOCKED'/), ['p-3']);
      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/status = 'PENDING'/), ['p-4']);
      expect(db.run).not.toHaveBeenCalledWith(jasmine.any(String), ['p-5']);
    });

    it('SKIPPED items never block (they are excluded from the ERROR/active queries entirely)', async () => {
      // A SKIPPED item never appears in the ERROR query, so nothing downstream of it is ever locked by it.
      const skippedAsIfErrorWouldHaveBlocked = outboxRow({ id: 'p-1', sequence: 2, status: 'PENDING', target_entity_id: 'entity-x' });
      db.query.and.callFake((sql: string) => {
        if (sql.includes("status IN ('PENDING','BLOCKED')")) {
          return Promise.resolve([skippedAsIfErrorWouldHaveBlocked]);
        }
        return Promise.resolve([]); // no ERROR rows
      });
      db.run.and.resolveTo({ changes: 1 });

      await service.recomputeBlocked('user-1');

      expect(db.run).not.toHaveBeenCalled();
    });
  });

  describe('listRunnable', () => {
    it('includes items never attempted, and items whose backoff has elapsed; excludes items still within backoff', async () => {
      const now = Date.now();
      const neverAttempted = outboxRow({ id: 'a', sequence: 1, attempt_count: 0, last_attempt_at: null });
      // backoffFor(1) = 2000ms; 3000ms elapsed → runnable.
      const readyAfterBackoff = outboxRow({ id: 'b', sequence: 2, attempt_count: 1, last_attempt_at: new Date(now - 3000).toISOString() });
      // backoffFor(3) = 30000ms; only 1000ms elapsed → still waiting.
      const stillWaiting = outboxRow({ id: 'c', sequence: 3, attempt_count: 3, last_attempt_at: new Date(now - 1000).toISOString() });
      db.query.and.resolveTo([neverAttempted, readyAfterBackoff, stillWaiting]);

      const runnable = await service.listRunnable('user-1');

      expect(runnable.map((item) => item.id)).toEqual(['a', 'b']);
    });
  });

  describe('refreshCounts', () => {
    it('sums PENDING + BLOCKED as pending, counts ERROR separately, and excludes SKIPPED from both', async () => {
      db.query.and.resolveTo([
        { status: 'PENDING', c: 3 },
        { status: 'ERROR', c: 2 },
        { status: 'SKIPPED', c: 5 },
        { status: 'BLOCKED', c: 1 },
      ]);

      await service.refreshCounts('user-1');

      expect(service.pendingCount()).toBe(4);
      expect(service.errorCount()).toBe(2);
    });
  });

  describe('resetSendingToPending', () => {
    it('resets SENDING items back to PENDING for the given user (app-start crash recovery)', async () => {
      db.run.and.resolveTo({ changes: 1 });
      await service.resetSendingToPending('user-1');
      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/SENDING/), ['user-1']);
    });
  });

  describe('fix (§6 kézi beavatkozás)', () => {
    it('writes the corrected entity row and outbox payload atomically, and resets retry/error state', async () => {
      db.executeTransaction.and.resolveTo(undefined);
      const item = { id: 'err-1' } as OutboxItem;
      const entityTask = { statement: 'UPDATE thing SET x = ? WHERE id = ?', values: [1, 'entity-x'] };

      await service.fix(item, { a: 1 }, entityTask);

      expect(db.executeTransaction).toHaveBeenCalled();
      const tasks = db.executeTransaction.calls.mostRecent().args[0];
      expect(tasks[0]).toBe(entityTask);
      expect(tasks[1].statement).toContain("status = 'PENDING'");
      expect(tasks[1].statement).toContain('attempt_count = 0');
      expect(tasks[1].values).toEqual([JSON.stringify({ a: 1 }), 'err-1']);
    });
  });

  describe('skip / unskip (§6)', () => {
    it('skip(): sets status to SKIPPED, leaving the payload untouched', async () => {
      db.run.and.resolveTo({ changes: 1 });
      await service.skip('item-1');
      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/status = 'SKIPPED'/), ['item-1']);
    });

    it('unskip(): re-derives the payload from the current local state and re-queues when nothing newer exists', async () => {
      db.query.and.resolveTo([]);
      db.run.and.resolveTo({ changes: 1 });
      const item = { id: 'skip-1', targetEntityId: 'entity-x', sequence: 5, method: 'PUT' } as OutboxItem;

      await service.unskip(item, { a: 99 });

      expect(db.run).toHaveBeenCalledWith(jasmine.stringMatching(/status = 'PENDING'/), [JSON.stringify({ a: 99 }), 'skip-1']);
    });

    it('unskip(): sends a null payload for a DELETE item (no body)', async () => {
      db.query.and.resolveTo([]);
      db.run.and.resolveTo({ changes: 1 });
      const item = { id: 'skip-2', targetEntityId: 'entity-x', sequence: 5, method: 'DELETE' } as OutboxItem;

      await service.unskip(item, { a: 1 });

      expect(db.run).toHaveBeenCalledWith(jasmine.any(String), [null, 'skip-2']);
    });

    it('unskip(): discards the skipped item instead if a newer PENDING/BLOCKED item exists for the same entity (its PUT already carries the current state)', async () => {
      db.query.and.resolveTo([{ id: 'newer-1' }]);
      db.run.and.resolveTo({ changes: 1 });
      const item = { id: 'skip-3', targetEntityId: 'entity-x', sequence: 5, method: 'PUT' } as OutboxItem;

      await service.unskip(item, { a: 1 });

      expect(db.run).toHaveBeenCalledWith('DELETE FROM outbox_item WHERE id = ?', ['skip-3']);
    });
  });

  describe('drop (§6, cascade drop)', () => {
    it('removes the item and cascades to items that depend on it, when the dropped item is a POST', async () => {
      const dependent = outboxRow({ id: 'child-1', method: 'PUT', depends_on: '["entity-x"]' });
      db.query.and.resolveTo([dependent]);
      db.executeTransaction.and.resolveTo(undefined);
      const item = { id: 'post-1', targetEntityId: 'entity-x', method: 'POST' } as OutboxItem;
      const entityTask = { statement: 'DELETE FROM thing WHERE id = ?', values: ['entity-x'] };

      const dependents = await service.drop(item, entityTask);

      expect(dependents.map((dep) => dep.id)).toEqual(['child-1']);
      const tasks = db.executeTransaction.calls.mostRecent().args[0];
      expect(tasks).toEqual([
        entityTask,
        { statement: 'DELETE FROM outbox_item WHERE id = ?', values: ['post-1'] },
        { statement: 'DELETE FROM outbox_item WHERE id = ?', values: ['child-1'] },
      ]);
    });

    it('does not search for dependents when the dropped item is not a POST', async () => {
      db.executeTransaction.and.resolveTo(undefined);
      const item = { id: 'put-1', targetEntityId: 'entity-x', method: 'PUT' } as OutboxItem;
      const entityTask = { statement: 'UPDATE thing SET x = 1', values: [] };

      const dependents = await service.drop(item, entityTask);

      expect(dependents).toEqual([]);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('findDependents', () => {
    it('returns only items whose dependsOn list includes the given entity id', async () => {
      const match = outboxRow({ id: 'm1', depends_on: '["entity-x"]' });
      const noMatch = outboxRow({ id: 'm2', depends_on: '["entity-y"]' });
      db.query.and.resolveTo([match, noMatch]);

      const result = await service.findDependents('entity-x');

      expect(result.map((item) => item.id)).toEqual(['m1']);
    });
  });

  // documentation/Features/Szinkronizációs központ.md: the sync center reads `items` directly instead
  // of polling — every mutating method must keep it in step with what it just wrote to SQLite.
  describe('items (reactive signal, no separate refresh needed)', () => {
    it('listAll() hydrates the signal', async () => {
      db.query.and.resolveTo([outboxRow({ id: 'a' }), outboxRow({ id: 'b' })]);
      await service.listAll('user-1');
      expect(service.items().map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('markSending() patches status and lastAttemptAt on the matching item only', async () => {
      db.query.and.resolveTo([outboxRow({ id: 'a', status: 'PENDING' }), outboxRow({ id: 'b', status: 'PENDING' })]);
      await service.listAll('user-1');
      db.run.and.resolveTo({ changes: 1 });

      await service.markSending('a');

      const [a, b] = service.items();
      expect(a.status).toBe('SENDING');
      expect(a.lastAttemptAt).not.toBeNull();
      expect(b.status).toBe('PENDING');
    });

    it('removeItem() drops the item from the signal', async () => {
      db.query.and.resolveTo([outboxRow({ id: 'a' }), outboxRow({ id: 'b' })]);
      await service.listAll('user-1');
      db.run.and.resolveTo({ changes: 1 });

      await service.removeItem('a');

      expect(service.items().map((item) => item.id)).toEqual(['b']);
    });

    it('markError() patches status and error fields', async () => {
      db.query.and.resolveTo([outboxRow({ id: 'a' })]);
      await service.listAll('user-1');
      db.run.and.resolveTo({ changes: 1 });

      await service.markError('a', 422, 'UNIQUE_VIOLATION', 'már foglalt', 'name');

      const [a] = service.items();
      expect(a.status).toBe('ERROR');
      expect(a.errorCode).toBe('UNIQUE_VIOLATION');
      expect(a.errorField).toBe('name');
    });

    it('skip() then unskip() round-trip the status in the signal', async () => {
      db.query.and.resolveTo([outboxRow({ id: 'a', method: 'PUT', target_entity_id: 'entity-x', sequence: 1 })]);
      await service.listAll('user-1');
      db.run.and.resolveTo({ changes: 1 });

      await service.skip('a');
      expect(service.items()[0].status).toBe('SKIPPED');

      db.query.and.resolveTo([]); // no newer PENDING/BLOCKED row for entity-x
      const item = service.items()[0];
      await service.unskip(item, { a: 1 });
      expect(service.items()[0].status).toBe('PENDING');
    });

    it('fix() patches payload and clears error state', async () => {
      db.query.and.resolveTo([outboxRow({ id: 'a', status: 'ERROR', error_code: 'UNIQUE_VIOLATION' })]);
      await service.listAll('user-1');
      db.executeTransaction.and.resolveTo(undefined);
      const item = service.items()[0];

      await service.fix(item, { name: 'fixed' }, { statement: 'UPDATE gear_item SET name = ?', values: ['fixed'] });

      const [a] = service.items();
      expect(a.status).toBe('PENDING');
      expect(a.payload).toEqual({ name: 'fixed' });
      expect(a.errorCode).toBeNull();
    });

    it('drop() removes the dropped item and its dependents from the signal', async () => {
      const dependent = outboxRow({ id: 'child-1', method: 'PUT', depends_on: '["entity-x"]' });
      db.query.and.resolveTo([outboxRow({ id: 'post-1', target_entity_id: 'entity-x', method: 'POST' }), dependent]);
      await service.listAll('user-1');
      db.query.and.resolveTo([dependent]); // findDependents query inside drop()
      db.executeTransaction.and.resolveTo(undefined);
      const item = service.items().find((i) => i.id === 'post-1') as OutboxItem;

      await service.drop(item, { statement: 'DELETE FROM gear_item WHERE id = ?', values: ['entity-x'] });

      expect(service.items()).toEqual([]);
    });

    it('recomputeBlocked() patches BLOCKED/PENDING flips in the signal', async () => {
      const errorRow = outboxRow({ id: 'err-1', sequence: 1, status: 'ERROR', target_entity_id: 'entity-x' });
      const toBeBlocked = outboxRow({ id: 'p-2', sequence: 2, status: 'PENDING', target_entity_id: 'entity-x' });
      db.query.and.resolveTo([toBeBlocked]);
      await service.listAll('user-1'); // hydrates with the PENDING row's current shape
      db.query.and.callFake((sql: string) => {
        if (sql.includes("status IN ('PENDING','BLOCKED')")) {
          return Promise.resolve([toBeBlocked]);
        }
        if (sql.includes("status = 'ERROR'")) {
          return Promise.resolve([errorRow]);
        }
        return Promise.resolve([]);
      });
      db.run.and.resolveTo({ changes: 1 });

      await service.recomputeBlocked('user-1');

      const patched = service.items().find((i) => i.id === 'p-2');
      expect(patched?.status).toBe('BLOCKED');
    });
  });
});
