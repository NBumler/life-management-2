import { TestBed } from '@angular/core/testing';

import { GearItem } from '../../api/model/gearItem';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { GearItemRepository } from '../data/gear-item.repository';
import { LocalDatabaseService } from '../storage/local-database.service';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { OutboxItem } from './outbox-item';
import { OutboxEntityDescriptor, OutboxEntityFixContext, OutboxEntityRegistryService, OutboxEntityType, buildOutboxDropTasks } from './outbox-entity-registry';

// documentation/Features/Szinkronizációs központ.md: this registry is the single place that must be
// kept in lockstep with the outbox's closed entity-type set — every branch below exists specifically
// because the pre-existing sync.page.ts only ever knew UserProfile/WeightHistoryEntry and silently
// mishandled every GearCheck entity type until this registry replaced its hand-rolled if/else chains.
describe('OutboxEntityRegistryService', () => {
  let registry: OutboxEntityRegistryService;
  let storage: jasmine.SpyObj<StorageBackend>;
  let db: jasmine.SpyObj<Pick<LocalDatabaseService, 'query'>>;

  function ctx(overrides: Partial<OutboxEntityFixContext> = {}): OutboxEntityFixContext {
    return { db: db as unknown as LocalDatabaseService, storage, targetEntityId: 'entity-x', method: 'PUT', ...overrides };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['getPackingTemplateDetail', 'getPackingSessionDetail']);
    const gearSyncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>> = jasmine.createSpyObj('SyncEngineService', [
      'requestDrainDebounced',
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: gearSyncEngine },
      ],
    });
    registry = TestBed.inject(OutboxEntityRegistryService);
    db = jasmine.createSpyObj('LocalDatabaseService', ['query']);
  });

  const allTypes: OutboxEntityType[] = ['UserProfile', 'WeightHistoryEntry', 'GearItem', 'PackingTemplate', 'PackingSession', 'PackingSessionItem'];

  it('has a registered descriptor for every OutboxEntityType (compile-time exhaustiveness is backed by an actual entry)', () => {
    for (const entityType of allTypes) {
      expect(registry.get(entityType)).toBeTruthy();
    }
  });

  it('maps each entity type to its own backing table', () => {
    expect(registry.get('UserProfile').table).toBe('user_profile');
    expect(registry.get('WeightHistoryEntry').table).toBe('weight_history_entry');
    expect(registry.get('GearItem').table).toBe('gear_item');
    expect(registry.get('PackingTemplate').table).toBe('packing_template');
    expect(registry.get('PackingSession').table).toBe('packing_session');
    expect(registry.get('PackingSessionItem').table).toBe('packing_session_item');
  });

  it('PackingTemplate has no Fix support — nested aggregate (template + items, one body)', () => {
    expect(registry.get('PackingTemplate').buildFixWriteTask).toBeNull();
  });

  it('every other entity type has Fix support', () => {
    for (const entityType of allTypes.filter((t) => t !== 'PackingTemplate')) {
      expect(registry.get(entityType).buildFixWriteTask).not.toBeNull();
    }
  });

  describe('currentPayload — flat entities', () => {
    it('GearItem: reads the row from gear_item and maps it through gearItemRowToDto', async () => {
      db.query.and.resolveTo([{ id: 'entity-x', name: 'Kötél', notes: null, created_at: null, updated_at: null, deleted: 0, deleted_at: null }]);

      const payload = (await registry.get('GearItem').currentPayload(ctx())) as GearItem;

      expect(db.query).toHaveBeenCalledWith(jasmine.stringMatching(/FROM gear_item WHERE id = \?/), ['entity-x']);
      expect(payload).toEqual(jasmine.objectContaining({ id: 'entity-x', name: 'Kötél' }));
    });

    it('returns null when the row is missing', async () => {
      db.query.and.resolveTo([]);
      const payload = await registry.get('GearItem').currentPayload(ctx());
      expect(payload).toBeNull();
    });
  });

  describe('currentPayload — PackingTemplate (always the nested detail, POST and PUT alike)', () => {
    it('delegates to storage.getPackingTemplateDetail regardless of method', async () => {
      const detail: PackingTemplateDetail = { id: 'entity-x', name: 'Hegyi túra', notes: null, deleted: false, items: [] };
      storage.getPackingTemplateDetail.and.resolveTo(detail);

      const payload = await registry.get('PackingTemplate').currentPayload(ctx({ method: 'POST' }));

      expect(storage.getPackingTemplateDetail).toHaveBeenCalledWith('entity-x');
      expect(payload).toBe(detail);
    });
  });

  describe('currentPayload — PackingSession (nested only on create)', () => {
    it('POST: delegates to storage.getPackingSessionDetail (the create body embeds the initial items)', async () => {
      const detail: PackingSessionDetail = { id: 'entity-x', destination: 'Tátra', sourceTemplateIds: [], deleted: false, items: [] };
      storage.getPackingSessionDetail.and.resolveTo(detail);

      const payload = await registry.get('PackingSession').currentPayload(ctx({ method: 'POST' }));

      expect(storage.getPackingSessionDetail).toHaveBeenCalledWith('entity-x');
      expect(payload).toBe(detail);
    });

    it('PUT: reads the flat row instead (destination-only update never had items)', async () => {
      db.query.and.resolveTo([
        { id: 'entity-x', destination: 'Tátra', source_template_ids: '[]', created_at: null, updated_at: null, deleted: 0, deleted_at: null },
      ]);

      const payload = await registry.get('PackingSession').currentPayload(ctx({ method: 'PUT' }));

      expect(storage.getPackingSessionDetail).not.toHaveBeenCalled();
      expect(payload).toEqual(jasmine.objectContaining({ id: 'entity-x', destination: 'Tátra' }));
    });
  });

  describe('GearItem nameUniqueness — mirrors GearItemRepository.save()\'s own pre-check', () => {
    it('finds a conflict against another live item with the same normalized name, excluding the item being fixed', async () => {
      const gearItems = TestBed.inject(GearItemRepository);
      gearItems.items.set([
        { id: 'other-1', name: '  Kötél  ', notes: null, deleted: false },
        { id: 'entity-x', name: 'Sisak', notes: null, deleted: false },
      ]);
      gearItems.loaded.set(true);

      const conflict = await registry.get('GearItem').nameUniqueness?.findConflict('kötél', 'entity-x');

      expect(conflict).toBe('other-1');
    });

    it('returns null when no other live item shares the normalized name', async () => {
      const gearItems = TestBed.inject(GearItemRepository);
      gearItems.items.set([{ id: 'entity-x', name: 'Sisak', notes: null, deleted: false }]);
      gearItems.loaded.set(true);

      const conflict = await registry.get('GearItem').nameUniqueness?.findConflict('Overál', 'entity-x');

      expect(conflict).toBeNull();
    });

    it('loads the live list first if it has not been loaded yet this session', async () => {
      const gearItems = TestBed.inject(GearItemRepository);
      expect(gearItems.loaded()).toBe(false);
      spyOn(gearItems, 'load').and.callFake(async () => {
        gearItems.items.set([{ id: 'other-1', name: 'Kötél', notes: null, deleted: false }]);
        gearItems.loaded.set(true);
      });

      const conflict = await registry.get('GearItem').nameUniqueness?.findConflict('kötél', 'entity-x');

      expect(gearItems.load).toHaveBeenCalled();
      expect(conflict).toBe('other-1');
    });
  });

  it('no other entity type has a nameUniqueness check', () => {
    for (const entityType of allTypes.filter((t) => t !== 'GearItem')) {
      expect(registry.get(entityType).nameUniqueness).toBeNull();
    }
  });
});

describe('buildOutboxDropTasks', () => {
  const gearDescriptor: OutboxEntityDescriptor = { table: 'gear_item', currentPayload: async () => null, buildFixWriteTask: null, nameUniqueness: null };
  const item = (patch: Partial<OutboxItem>): OutboxItem => ({ method: 'POST', entityType: 'GearItem', targetEntityId: 'entity-x', payload: null, ...patch }) as OutboxItem;

  it('POST: hard-removes the local row (never synced, nothing to restore)', () => {
    expect(buildOutboxDropTasks(gearDescriptor, item({ method: 'POST' }))).toEqual([{ statement: 'DELETE FROM gear_item WHERE id = ?', values: ['entity-x'] }]);
  });

  it('PUT/DELETE: flags the row for a server refetch instead of deleting it', () => {
    const [task] = buildOutboxDropTasks(gearDescriptor, item({ method: 'PUT' }));
    expect(task.statement).toContain('UPDATE gear_item SET _needs_refetch = 1, _dirty = 0');
    expect(task.values).toEqual(['entity-x']);
  });

  it('ShoppingListComplete: refetches the archived list and drops the completion’s local-only side effects', () => {
    // The ShoppingListComplete branch keys on item.entityType and never touches descriptor.table.
    const tasks = buildOutboxDropTasks(gearDescriptor, item({
      method: 'POST',
      entityType: 'ShoppingListComplete',
      targetEntityId: 'list-1',
      payload: { checkedFoodEntries: [{ storageEntryIds: ['sf-1', 'sf-2'] }], newActiveList: { id: 'list-2', items: [{ id: 'sli-1' }] } },
    }));
    expect(tasks[0]).toEqual({ statement: 'UPDATE shopping_list SET _needs_refetch = 1, _dirty = 0 WHERE id = ?', values: ['list-1'] });
    expect(tasks).toContain(jasmine.objectContaining({ statement: 'DELETE FROM stored_food WHERE id = ? AND _local_only = 1', values: ['sf-2'] }));
    expect(tasks).toContain(jasmine.objectContaining({ statement: 'DELETE FROM shopping_list_item WHERE id = ? AND _local_only = 1', values: ['sli-1'] }));
    expect(tasks).toContain(jasmine.objectContaining({ statement: 'DELETE FROM shopping_list WHERE id = ? AND _local_only = 1', values: ['list-2'] }));
  });
});
