import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { IndoorRoute } from '../../api/model/indoorRoute';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { IndoorRouteRepository, IndoorRouteSaveInput } from './indoor-route.repository';

function route(overrides: Partial<IndoorRoute> = {}): IndoorRoute {
  return {
    id: 'r1',
    gymId: 'g1',
    name: 'Sárga 12',
    discipline: IndoorRoute.DisciplineEnum.Rope,
    grade: '7a',
    absoluteDifficultyIndex: 50,
    sector: null,
    deleted: false,
    ...overrides,
  };
}

function saveInput(overrides: Partial<IndoorRouteSaveInput> = {}): IndoorRouteSaveInput {
  return {
    gymId: 'g1',
    name: 'Sárga 12',
    discipline: IndoorRoute.DisciplineEnum.Rope,
    grade: '7a',
    absoluteDifficultyIndex: 50,
    sector: null,
    ...overrides,
  };
}

describe('IndoorRouteRepository', () => {
  let repository: IndoorRouteRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listIndoorRoutes', 'upsertIndoorRoute', 'deleteIndoorRoute']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(IndoorRouteRepository);
  });

  it('load(): reads all indoor routes from the storage backend', async () => {
    storage.listIndoorRoutes.and.resolveTo([route({ id: 'a' }), route({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((r) => r.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('forGym(): returns only the live routes of that gym, by name', async () => {
    storage.listIndoorRoutes.and.resolveTo([
      route({ id: 'b', gymId: 'g1', name: 'Béta' }),
      route({ id: 'a', gymId: 'g1', name: 'Alfa' }),
      route({ id: 'dead', gymId: 'g1', deleted: true }),
      route({ id: 'other', gymId: 'g2' }),
    ]);
    await repository.load();

    expect(repository.forGym('g1').map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('save(): creates a new route with a fresh id, no uniqueness rule (a duplicate name is allowed)', async () => {
    storage.listIndoorRoutes.and.resolveTo([route({ id: 'existing', gymId: 'g1', name: 'Sárga 12' })]);
    await repository.load();
    storage.upsertIndoorRoute.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ gymId: 'g1', name: 'Sárga 12' }));

    expect(saved.id).not.toBe('existing');
    expect(repository.items().length).toBe(2);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listIndoorRoutes.and.resolveTo([route({ id: 'a' })]);
    await repository.load();
    storage.deleteIndoorRoute.and.resolveTo(route({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteIndoorRoute).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertIndoorRoute.and.callFake(async (draft) => draft);
    storage.deleteIndoorRoute.and.resolveTo(route({ deleted: true }));

    await repository.save(saveInput({ id: 'r1' }));
    await repository.remove('r1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertIndoorRoute.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 'r1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming IndoorRoute (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listIndoorRoutes.and.resolveTo([route({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['IndoorRoute']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listIndoorRoutes).toHaveBeenCalledTimes(2);
  });
});
