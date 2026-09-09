import { OUTBOX_PAYLOAD_SCHEMA_VERSION } from './offline-queue.service';
import { OutboxItem } from './outbox-item';
import {
  ALL_ENTITY_TYPES_EXHAUSTIVE,
  MigrationStep,
  expectedMigrationKeys,
  migrateOutboxItem,
  registeredMigrationKeys,
  rewriteDbUnitToCs,
  stripClimbingSessionFailurePoint,
} from './outbox-migrator';

// documentation/Architektúra/Backend-offline first.md §7 "Payload-verziózás (app frissítés)".
// The mechanism tests use synthetic registries passed explicitly; the production-registry tests at
// the bottom pin the real v1 → v2 (`db` → `cs`) step, registered for every OutboxEntityType.
describe('migrateOutboxItem', () => {
  function item(overrides: Partial<OutboxItem>): OutboxItem {
    return {
      sequence: 1,
      id: 'item-1',
      createdAt: new Date().toISOString(),
      userId: 'user-1',
      method: 'PUT',
      url: '/api/things/entity-x',
      payload: { a: 1 },
      payloadVersion: 1,
      entityType: 'Thing',
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

  it('is a no-op when the item is already at the target version', () => {
    const it1 = item({ payloadVersion: 1 });

    const result = migrateOutboxItem(it1, 1, new Map());

    expect(result.migrated).toBe(false);
    expect(result.payload).toBe(it1.payload);
    expect(result.url).toBe(it1.url);
    expect(result.payloadVersion).toBe(1);
    expect(result.errorMessage).toBeNull();
  });

  it('applies a single registered step and advances payloadVersion by one', () => {
    const stale = item({ payloadVersion: 1, payload: { legacyField: 'x' }, url: '/api/legacy/entity-x', entityType: 'Thing' });
    const step: MigrationStep = (payload, url) => ({
      payload: { ...(payload as { legacyField: string }), newField: (payload as { legacyField: string }).legacyField },
      url: url.replace('/legacy/', '/things/'),
    });
    const registry = new Map<string, MigrationStep>([['Thing:1', step]]);

    const result = migrateOutboxItem(stale, 2, registry);

    expect(result.migrated).toBe(true);
    expect(result.errorMessage).toBeNull();
    expect(result.payloadVersion).toBe(2);
    expect(result.url).toBe('/api/things/entity-x');
    expect(result.payload).toEqual({ legacyField: 'x', newField: 'x' });
  });

  it('walks a multi-step chain (v1 → v2 → v3), calling each step once with the previous step output', () => {
    const stale = item({ payloadVersion: 1, payload: { hops: [] as string[] }, entityType: 'Thing' });
    const stepV1: MigrationStep = (payload) => ({
      payload: { hops: [...(payload as { hops: string[] }).hops, 'v1->v2'] },
      url: '/api/things/entity-x',
    });
    const stepV2: MigrationStep = (payload) => ({
      payload: { hops: [...(payload as { hops: string[] }).hops, 'v2->v3'] },
      url: '/api/things/entity-x',
    });
    const registry = new Map<string, MigrationStep>([
      ['Thing:1', stepV1],
      ['Thing:2', stepV2],
    ]);

    const result = migrateOutboxItem(stale, 3, registry);

    expect(result.migrated).toBe(true);
    expect(result.payloadVersion).toBe(3);
    expect(result.payload).toEqual({ hops: ['v1->v2', 'v2->v3'] });
  });

  it('produces a clear, entity-and-version-specific error when a required step is not registered, and leaves the payload/url/version untouched', () => {
    const stale = item({ payloadVersion: 1, entityType: 'HouseholdTask', payload: { title: 'kept' }, url: '/api/household-tasks/entity-x' });

    const result = migrateOutboxItem(stale, 2, new Map());

    expect(result.migrated).toBe(false);
    expect(result.errorMessage).not.toBeNull();
    expect(result.errorMessage).toContain('HouseholdTask');
    expect(result.errorMessage).toContain('v1');
    expect(result.errorMessage).toContain('v2');
    expect(result.payload).toEqual({ title: 'kept' });
    expect(result.url).toBe('/api/household-tasks/entity-x');
    expect(result.payloadVersion).toBe(1);
  });

  it('fails at the first missing step of a chain rather than silently skipping ahead', () => {
    const stale = item({ payloadVersion: 1, entityType: 'Thing' });
    const stepV1: MigrationStep = (payload, url) => ({ payload, url });
    // Only v1->v2 is registered; v2->v3 is missing.
    const registry = new Map<string, MigrationStep>([['Thing:1', stepV1]]);

    const result = migrateOutboxItem(stale, 3, registry);

    expect(result.migrated).toBe(false);
    expect(result.errorMessage).toContain('Thing');
    // Failure is reported against the item's *original* version, not the intermediate v2 it reached internally.
    expect(result.payloadVersion).toBe(1);
  });

  it('an entity type with no registered step still falls through to the error branch (default registry)', () => {
    const stale = item({ payloadVersion: 0, entityType: 'Thing' });

    const result = migrateOutboxItem(stale, 1);

    expect(result.migrated).toBe(false);
    expect(result.errorMessage).not.toBeNull();
  });

  describe('production registry — v1 → v2 (backlog/063, db → cs)', () => {
    it('rewrites a stale Food payload netUnit "db" to "cs" and bumps payloadVersion', () => {
      const stale = item({
        payloadVersion: 1,
        entityType: 'Food',
        url: '/api/foods/entity-x',
        payload: { id: 'entity-x', name: 'Túró Rudi', netAmount: 6, netUnit: 'db' },
      });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      expect(result.migrated).toBe(true);
      expect(result.errorMessage).toBeNull();
      expect(result.payloadVersion).toBe(OUTBOX_PAYLOAD_SCHEMA_VERSION);
      expect((result.payload as { netUnit: string }).netUnit).toBe('cs');
    });

    it('rewrites nested quantityUnit "db" in a Recipe / Meal / ShoppingList tree, leaving other units alone', () => {
      const stale = item({
        payloadVersion: 1,
        entityType: 'Recipe',
        url: '/api/recipes/r1',
        payload: {
          id: 'r1',
          ingredients: [
            { id: 'i1', quantityAmount: 2, quantityUnit: 'db' },
            { id: 'i2', quantityAmount: 100, quantityUnit: 'g' },
          ],
        },
      });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      const ingredients = (result.payload as { ingredients: { quantityUnit: string }[] }).ingredients;
      expect(ingredients[0].quantityUnit).toBe('cs');
      expect(ingredients[1].quantityUnit).toBe('g');
    });

    it('is a content no-op (but still advances the version) for a payload with no db unit', () => {
      const stale = item({ payloadVersion: 1, entityType: 'GearItem', payload: { id: 'g1', name: 'Sátor' } });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      expect(result.migrated).toBe(true);
      expect(result.payload).toEqual({ id: 'g1', name: 'Sátor' });
      expect(result.payloadVersion).toBe(OUTBOX_PAYLOAD_SCHEMA_VERSION);
    });

    it('handles a null payload (DELETE item)', () => {
      expect(rewriteDbUnitToCs(null, '/api/foods/x')).toEqual({ payload: null, url: '/api/foods/x' });
    });
  });

  it('C-1: ALL_ENTITY_TYPES is exhaustive vs OutboxEntityType (compile-time guard, asserted here too)', () => {
    // The real enforcement is the type of ALL_ENTITY_TYPES_EXHAUSTIVE — a missing union member makes
    // outbox-migrator.ts fail to compile. This just pins the runtime value so the symbol stays used.
    expect(ALL_ENTITY_TYPES_EXHAUSTIVE).toBe(true);
  });

  // backlog/080 guard B: bumping OUTBOX_PAYLOAD_SCHEMA_VERSION without registering a step for every
  // (entityType, version) pair must fail here rather than on a user's phone. `buildMigrations()`
  // already throws at module load for a missing whole-version entry; this pins per-key completeness.
  it('the production registry holds a step for every entity type at every version below the target', () => {
    const registered = new Set(registeredMigrationKeys());
    const missing = expectedMigrationKeys().filter((key) => !registered.has(key));

    expect(missing).toEqual([]);
    expect(registered.size).toBe(expectedMigrationKeys().length);
  });

  describe('stripClimbingSessionFailurePoint (v2 → v3, backlog/080 / #77)', () => {
    it('folds a non-blank failurePoint into an existing notes value and drops the key', () => {
      const { payload } = stripClimbingSessionFailurePoint(
        { id: 's1', attempts: [{ id: 'a1', notes: 'kifutottam az erőből', failurePoint: 'a kulcsmozdulatnál' }] },
        '/api/climbing/sessions/s1',
      );

      const attempt = (payload as { attempts: Record<string, unknown>[] }).attempts[0];
      expect(attempt['failurePoint']).toBeUndefined();
      expect(attempt['notes']).toBe('kifutottam az erőből\na kulcsmozdulatnál');
    });

    it('uses failurePoint as notes when notes is empty / missing', () => {
      const { payload } = stripClimbingSessionFailurePoint(
        { attempts: [{ id: 'a1', failurePoint: '  a lábam lecsúszott  ' }, { id: 'a2', notes: '', failurePoint: 'x' }] },
        '/url',
      );
      const attempts = (payload as { attempts: Record<string, unknown>[] }).attempts;
      expect(attempts[0]['notes']).toBe('a lábam lecsúszott');
      expect(attempts[0]['failurePoint']).toBeUndefined();
      expect(attempts[1]['notes']).toBe('x');
    });

    it('just drops a blank / non-string failurePoint, leaving notes untouched', () => {
      const { payload } = stripClimbingSessionFailurePoint(
        { attempts: [{ id: 'a1', notes: 'megvolt', failurePoint: '   ' }, { id: 'a2', notes: null, failurePoint: null }] },
        '/url',
      );
      const attempts = (payload as { attempts: Record<string, unknown>[] }).attempts;
      expect(attempts[0]).toEqual({ id: 'a1', notes: 'megvolt' });
      expect(attempts[1]).toEqual({ id: 'a2', notes: null });
    });

    it('passes through a null payload (DELETE) and a payload with no attempts array', () => {
      expect(stripClimbingSessionFailurePoint(null, '/url')).toEqual({ payload: null, url: '/url' });
      expect(stripClimbingSessionFailurePoint({ id: 's1' }, '/url')).toEqual({ payload: { id: 's1' }, url: '/url' });
    });
  });

  describe('production registry — v2 → v3 (backlog/080, ClimbingSession.failurePoint)', () => {
    it('strips failurePoint from a stale ClimbingSession write walked v1 → v3', () => {
      const stale = item({
        payloadVersion: 1,
        entityType: 'ClimbingSession',
        url: '/api/climbing/sessions/s1',
        payload: { id: 's1', attempts: [{ id: 'a1', notes: 'ok', failurePoint: 'a tetőnél' }] },
      });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      expect(result.migrated).toBe(true);
      expect(result.errorMessage).toBeNull();
      expect(result.payloadVersion).toBe(OUTBOX_PAYLOAD_SCHEMA_VERSION);
      const attempt = (result.payload as { attempts: Record<string, unknown>[] }).attempts[0];
      expect(attempt['failurePoint']).toBeUndefined();
      expect(attempt['notes']).toBe('ok\na tetőnél');
    });

    it('is a content no-op for every non-ClimbingSession entity at the v2 → v3 step', () => {
      const stale = item({
        payloadVersion: 2,
        entityType: 'Food',
        url: '/api/foods/f1',
        payload: { id: 'f1', name: 'Alma', netUnit: 'g' },
      });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      expect(result.migrated).toBe(true);
      expect(result.payload).toEqual({ id: 'f1', name: 'Alma', netUnit: 'g' });
      expect(result.payloadVersion).toBe(OUTBOX_PAYLOAD_SCHEMA_VERSION);
    });
  });

  describe('production registry — v3 → v4 (backlog/099, ShoppingList.saveToStorage)', () => {
    it('defaults saveToStorage to true on a stale ShoppingList write walked v1 → v4', () => {
      const stale = item({
        payloadVersion: 1,
        entityType: 'ShoppingList',
        url: '/api/shopping-lists/l1',
        payload: { id: 'l1', name: 'Heti', items: [], deleted: false },
      });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      expect(result.migrated).toBe(true);
      expect(result.errorMessage).toBeNull();
      expect(result.payloadVersion).toBe(OUTBOX_PAYLOAD_SCHEMA_VERSION);
      expect((result.payload as Record<string, unknown>)['saveToStorage']).toBe(true);
    });

    it('leaves an explicit saveToStorage untouched', () => {
      const stale = item({
        payloadVersion: 3,
        entityType: 'ShoppingList',
        url: '/api/shopping-lists/l1',
        payload: { id: 'l1', saveToStorage: false, items: [], deleted: false },
      });

      const result = migrateOutboxItem(stale, OUTBOX_PAYLOAD_SCHEMA_VERSION);

      expect((result.payload as Record<string, unknown>)['saveToStorage']).toBe(false);
    });

    it('is a content no-op for a non-ShoppingList entity and for a DELETE (null payload)', () => {
      const other = item({ payloadVersion: 3, entityType: 'Food', url: '/api/foods/f1', payload: { id: 'f1', name: 'Alma' } });
      expect(migrateOutboxItem(other, OUTBOX_PAYLOAD_SCHEMA_VERSION).payload).toEqual({ id: 'f1', name: 'Alma' });

      const del = item({ payloadVersion: 3, entityType: 'ShoppingList', url: '/api/shopping-lists/l1', payload: null });
      expect(migrateOutboxItem(del, OUTBOX_PAYLOAD_SCHEMA_VERSION).payload).toBeNull();
    });
  });
});
