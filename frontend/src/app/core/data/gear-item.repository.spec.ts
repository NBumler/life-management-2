import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { GearItem } from '../../api/model/gearItem';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { GearItemNameConflictError, GearItemRepository } from './gear-item.repository';

describe('GearItemRepository', () => {
  let repository: GearItemRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  function item(overrides: Partial<GearItem> = {}): GearItem {
    return { id: 'g1', name: 'Kötél', notes: null, deleted: false, ...overrides };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listGearItems', 'upsertGearItem', 'deleteGearItem']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(GearItemRepository);
  });

  it('load(): reads all items from the storage backend', async () => {
    storage.listGearItems.and.resolveTo([item({ id: 'a', name: 'Alfa' }), item({ id: 'b', name: 'Béta' })]);

    await repository.load();

    expect(repository.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new item with a fresh id when none is given', async () => {
    storage.listGearItems.and.resolveTo([]);
    await repository.load();
    storage.upsertGearItem.and.resolveTo(item({ id: 'new-1', name: 'Bundazsák' }));

    const saved = await repository.save('Bundazsák', null);

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((i) => i.id)).toEqual(['new-1']);
  });

  it('save(): keeps the list sorted by name', async () => {
    storage.listGearItems.and.resolveTo([]);
    await repository.load();
    storage.upsertGearItem.and.resolveTo(item({ id: 'z', name: 'Zsák' }));
    await repository.save('Zsák', null);
    storage.upsertGearItem.and.resolveTo(item({ id: 'a', name: 'Alfa' }));
    await repository.save('Alfa', null);

    expect(repository.items().map((i) => i.id)).toEqual(['a', 'z']);
  });

  it('save(): throws GearItemNameConflictError before writing, when another live item has the same normalized name', async () => {
    storage.listGearItems.and.resolveTo([item({ id: 'existing', name: 'Kötél' })]);
    await repository.load();

    await expectAsync(repository.save('kötél', null)).toBeRejectedWith(jasmine.any(GearItemNameConflictError));
    expect(storage.upsertGearItem).not.toHaveBeenCalled();
  });

  it('save(): allows renaming an item to its own current name', async () => {
    storage.listGearItems.and.resolveTo([item({ id: 'existing', name: 'Kötél' })]);
    await repository.load();
    storage.upsertGearItem.and.resolveTo(item({ id: 'existing', name: 'Kötél', notes: 'frissítve' }));

    const saved = await repository.save('Kötél', 'frissítve', 'existing');

    expect(saved.notes).toBe('frissítve');
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listGearItems.and.resolveTo([item({ id: 'a' })]);
    await repository.load();
    storage.deleteGearItem.and.resolveTo(item({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteGearItem).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listGearItems.and.resolveTo([]);
    await repository.load();
    storage.upsertGearItem.and.resolveTo(item());
    storage.deleteGearItem.and.resolveTo(item({ deleted: true }));

    await repository.save('Kötél', null);
    await repository.remove('g1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listGearItems.and.resolveTo([]);
    await repository.load();
    storage.upsertGearItem.and.resolveTo(item());

    await repository.save('Kötél', null);

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});
