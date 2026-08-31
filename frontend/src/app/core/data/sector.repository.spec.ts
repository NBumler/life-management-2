import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Sector } from '../../api/model/sector';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { SectorRepository, SectorSaveInput } from './sector.repository';

function sector(overrides: Partial<Sector> = {}): Sector {
  return { id: 's1', cragId: 'c1', name: 'Főfal', defaultAspect: null, deleted: false, ...overrides };
}

function saveInput(overrides: Partial<SectorSaveInput> = {}): SectorSaveInput {
  return { cragId: 'c1', name: 'Főfal', defaultAspect: null, ...overrides };
}

describe('SectorRepository', () => {
  let repository: SectorRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listSectors', 'upsertSector', 'deleteSector']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(SectorRepository);
  });

  it('load(): reads all sectors from the storage backend', async () => {
    storage.listSectors.and.resolveTo([sector({ id: 'a' }), sector({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((s) => s.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('forCrag(): returns only the live sectors of that crag, by name', async () => {
    storage.listSectors.and.resolveTo([
      sector({ id: 'b', cragId: 'c1', name: 'Béta' }),
      sector({ id: 'a', cragId: 'c1', name: 'Alfa' }),
      sector({ id: 'dead', cragId: 'c1', deleted: true }),
      sector({ id: 'other', cragId: 'c2' }),
    ]);
    await repository.load();

    expect(repository.forCrag('c1').map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('save(): creates a new sector with a fresh id, no uniqueness rule (a duplicate name is allowed)', async () => {
    storage.listSectors.and.resolveTo([sector({ id: 'existing', cragId: 'c1', name: 'Főfal' })]);
    await repository.load();
    storage.upsertSector.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ cragId: 'c1', name: 'Főfal' }));

    expect(saved.id).not.toBe('existing');
    expect(repository.items().length).toBe(2);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listSectors.and.resolveTo([sector({ id: 'a' })]);
    await repository.load();
    storage.deleteSector.and.resolveTo(sector({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteSector).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertSector.and.callFake(async (draft) => draft);
    storage.deleteSector.and.resolveTo(sector({ deleted: true }));

    await repository.save(saveInput({ id: 's1' }));
    await repository.remove('s1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertSector.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 's1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming Sector (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listSectors.and.resolveTo([sector({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['Sector']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listSectors).toHaveBeenCalledTimes(2);
  });
});
