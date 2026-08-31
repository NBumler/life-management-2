import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Crag } from '../../api/model/crag';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { CragRepository, CragSaveInput } from './crag.repository';

function crag(overrides: Partial<Crag> = {}): Crag {
  return { id: 'c1', name: 'Sziklakert', latitude: null, longitude: null, defaultRockType: null, deleted: false, ...overrides };
}

function saveInput(overrides: Partial<CragSaveInput> = {}): CragSaveInput {
  return { name: 'Sziklakert', latitude: null, longitude: null, defaultRockType: null, ...overrides };
}

describe('CragRepository', () => {
  let repository: CragRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listCrags', 'upsertCrag', 'deleteCrag']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(CragRepository);
  });

  it('load(): reads all crags from the storage backend', async () => {
    storage.listCrags.and.resolveTo([crag({ id: 'a' }), crag({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((c) => c.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): keeps the in-memory list name-sorted after an insert', async () => {
    storage.listCrags.and.resolveTo([crag({ id: 'beta', name: 'Béta' })]);
    await repository.load();
    storage.upsertCrag.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ name: 'Alfa' }));

    expect(repository.items().map((c) => c.name)).toEqual(['Alfa', 'Béta']);
  });

  it('save(): creates a new crag with a fresh id, no uniqueness rule (a duplicate name is allowed)', async () => {
    storage.listCrags.and.resolveTo([crag({ id: 'existing', name: 'Sziklakert' })]);
    await repository.load();
    storage.upsertCrag.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ name: 'Sziklakert', latitude: 47.9, longitude: 20.4 }));

    expect(saved.id).not.toBe('existing');
    expect(saved.latitude).toBe(47.9);
    expect(repository.items().length).toBe(2);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listCrags.and.resolveTo([crag({ id: 'a' })]);
    await repository.load();
    storage.deleteCrag.and.resolveTo(crag({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteCrag).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertCrag.and.callFake(async (draft) => draft);
    storage.deleteCrag.and.resolveTo(crag({ deleted: true }));

    await repository.save(saveInput({ id: 'c1' }));
    await repository.remove('c1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertCrag.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 'c1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming Crag (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listCrags.and.resolveTo([crag({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['Crag']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listCrags).toHaveBeenCalledTimes(2);
  });
});
