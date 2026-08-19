import { OutboxItem } from './outbox-item';
import { MigrationStep, migrateOutboxItem } from './outbox-migrator';

// documentation/Architektúra/Backend-offline first.md §7 "Payload-verziózás (app frissítés)".
// SCHEMA_VERSION is 1 today, so the production registry is empty and no real cross-version
// migration exists yet — these tests exercise the mechanism with synthetic registries passed
// explicitly (the function's `registry` parameter defaults to the real, empty one in production).
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

  it('uses the real (empty) production registry by default, so any stale item today falls through to the error branch', () => {
    const stale = item({ payloadVersion: 0, entityType: 'Thing' });

    const result = migrateOutboxItem(stale, 1);

    expect(result.migrated).toBe(false);
    expect(result.errorMessage).not.toBeNull();
  });
});
