import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Route } from '../../api/model/route';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { RouteRepository, RouteSaveInput } from './route.repository';

function route(overrides: Partial<Route> = {}): Route {
  return {
    id: 'r1',
    sectorId: 's1',
    name: 'Sárkányfészek',
    guidebookGrade: '7b+',
    lengthInMeters: null,
    totalPitches: null,
    rockType: null,
    aspect: null,
    deleted: false,
    ...overrides,
  };
}

function saveInput(overrides: Partial<RouteSaveInput> = {}): RouteSaveInput {
  return {
    sectorId: 's1',
    name: 'Sárkányfészek',
    guidebookGrade: '7b+',
    lengthInMeters: null,
    totalPitches: null,
    rockType: null,
    aspect: null,
    ...overrides,
  };
}

describe('RouteRepository', () => {
  let repository: RouteRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listRoutes', 'upsertRoute', 'deleteRoute']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(RouteRepository);
  });

  it('load(): reads all routes from the storage backend', async () => {
    storage.listRoutes.and.resolveTo([route({ id: 'a' }), route({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((r) => r.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('forSector(): returns only the live routes of that sector, by name', async () => {
    storage.listRoutes.and.resolveTo([
      route({ id: 'b', sectorId: 's1', name: 'Béta' }),
      route({ id: 'a', sectorId: 's1', name: 'Alfa' }),
      route({ id: 'dead', sectorId: 's1', deleted: true }),
      route({ id: 'other', sectorId: 's2' }),
    ]);
    await repository.load();

    expect(repository.forSector('s1').map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('save(): stores the guidebook grade verbatim and creates a fresh id (a duplicate name is allowed)', async () => {
    storage.listRoutes.and.resolveTo([route({ id: 'existing', sectorId: 's1', name: 'Sárkányfészek' })]);
    await repository.load();
    storage.upsertRoute.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ sectorId: 's1', name: 'Sárkányfészek', guidebookGrade: '8a/8a+ (?)' }));

    expect(saved.id).not.toBe('existing');
    expect(saved.guidebookGrade).toBe('8a/8a+ (?)');
    expect(repository.items().length).toBe(2);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listRoutes.and.resolveTo([route({ id: 'a' })]);
    await repository.load();
    storage.deleteRoute.and.resolveTo(route({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteRoute).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertRoute.and.callFake(async (draft) => draft);
    storage.deleteRoute.and.resolveTo(route({ deleted: true }));

    await repository.save(saveInput({ id: 'r1' }));
    await repository.remove('r1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertRoute.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 'r1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming Route (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listRoutes.and.resolveTo([route({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['Route']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listRoutes).toHaveBeenCalledTimes(2);
  });
});
