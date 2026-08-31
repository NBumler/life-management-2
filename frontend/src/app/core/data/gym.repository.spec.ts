import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Gym } from '../../api/model/gym';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { GymNameConflictError, GymRepository, GymSaveInput } from './gym.repository';

function gym(overrides: Partial<Gym> = {}): Gym {
  return {
    id: 'g1',
    name: 'Mászócentrum',
    address: null,
    disciplines: [Gym.DisciplinesEnum.Boulder],
    defaultWallHeightMeters: null,
    availableSafetyStyles: null,
    deleted: false,
    ...overrides,
  };
}

function saveInput(overrides: Partial<GymSaveInput> = {}): GymSaveInput {
  return {
    name: 'Mászócentrum',
    address: null,
    disciplines: [Gym.DisciplinesEnum.Boulder],
    defaultWallHeightMeters: null,
    availableSafetyStyles: null,
    ...overrides,
  };
}

describe('GymRepository', () => {
  let repository: GymRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listGyms', 'upsertGym', 'deleteGym']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(GymRepository);
  });

  it('load(): reads all gyms from the storage backend', async () => {
    storage.listGyms.and.resolveTo([gym({ id: 'a' }), gym({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((g) => g.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): keeps the in-memory list name-sorted after an insert', async () => {
    storage.listGyms.and.resolveTo([gym({ id: 'beta', name: 'Béta' })]);
    await repository.load();
    storage.upsertGym.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ name: 'Alfa' }));

    expect(repository.items().map((g) => g.name)).toEqual(['Alfa', 'Béta']);
  });

  it('save(): creates a new gym with a fresh id when none is given', async () => {
    storage.upsertGym.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ name: 'Új terem' }));

    expect(saved.id).toMatch(/[0-9a-f-]{36}/);
    expect(repository.items().map((g) => g.name)).toEqual(['Új terem']);
  });

  it('save(): drops the rope-only config when ROPE is not among the disciplines', async () => {
    storage.upsertGym.and.callFake(async (draft) => draft);

    const saved = await repository.save(
      saveInput({
        disciplines: [Gym.DisciplinesEnum.Boulder],
        defaultWallHeightMeters: 12,
        availableSafetyStyles: [Gym.AvailableSafetyStylesEnum.Lead],
      }),
    );

    expect(saved.defaultWallHeightMeters).toBeNull();
    expect(saved.availableSafetyStyles).toBeNull();
  });

  it('save(): keeps the rope-only config when ROPE is present', async () => {
    storage.upsertGym.and.callFake(async (draft) => draft);

    const saved = await repository.save(
      saveInput({
        disciplines: [Gym.DisciplinesEnum.Rope],
        defaultWallHeightMeters: 15,
        availableSafetyStyles: [Gym.AvailableSafetyStylesEnum.Toprope],
      }),
    );

    expect(saved.defaultWallHeightMeters).toBe(15);
    expect(saved.availableSafetyStyles).toEqual([Gym.AvailableSafetyStylesEnum.Toprope]);
  });

  it('save(): throws GymNameConflictError before writing when another live gym has the same normalized name', async () => {
    storage.listGyms.and.resolveTo([gym({ id: 'existing', name: 'Fal Klub' })]);
    await repository.load();

    await expectAsync(repository.save(saveInput({ name: '  fal   klub  ' }))).toBeRejectedWith(
      jasmine.any(GymNameConflictError),
    );
    expect(storage.upsertGym).not.toHaveBeenCalled();
  });

  it('save(): carries the conflicting live row id on the error', async () => {
    storage.listGyms.and.resolveTo([gym({ id: 'existing', name: 'Fal Klub' })]);
    await repository.load();

    await repository.save(saveInput({ name: 'fal klub' })).then(
      () => fail('expected a conflict'),
      (error: unknown) => expect((error as GymNameConflictError).conflictingId).toBe('existing'),
    );
  });

  it('save(): allows renaming a gym to its own current name', async () => {
    storage.listGyms.and.resolveTo([gym({ id: 'existing', name: 'Fal Klub' })]);
    await repository.load();
    storage.upsertGym.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ id: 'existing', name: 'Fal Klub', address: 'Fő utca 1' }));

    expect(saved.address).toBe('Fő utca 1');
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listGyms.and.resolveTo([gym({ id: 'a' })]);
    await repository.load();
    storage.deleteGym.and.resolveTo(gym({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteGym).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertGym.and.callFake(async (draft) => draft);
    storage.deleteGym.and.resolveTo(gym({ deleted: true }));

    await repository.save(saveInput({ id: 'g1' }));
    await repository.remove('g1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertGym.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 'g1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

describe('GymRepository caching', () => {
  let repository: GymRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let dataChanges: DataChangeNotifier;

  function configure(native: boolean): void {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(native);
    storage = jasmine.createSpyObj('StorageBackend', ['listGyms', 'upsertGym', 'deleteGym']);
    storage.listGyms.and.resolveTo([gym({ id: 'a', name: 'Alfa' })]);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(GymRepository);
    dataChanges = TestBed.inject(DataChangeNotifier);
  }

  it('native: a second load() is served from memory instead of re-querying the store', async () => {
    configure(true);

    await repository.load();
    await repository.load();

    expect(storage.listGyms).toHaveBeenCalledTimes(1);
  });

  it('a DataChangeNotifier tick naming Gym (post-pull) invalidates the native cache', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects();
    storage.listGyms.and.resolveTo([gym({ id: 'a', name: 'Alfa' }), gym({ id: 'b', name: 'Béta' })]);

    dataChanges.notifyChanged(['Gym']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listGyms).toHaveBeenCalledTimes(2);
  });

  it('a tick that did not touch gyms leaves the cache alone', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects();

    dataChanges.notifyChanged(['GymColorBand']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listGyms).toHaveBeenCalledTimes(1);
  });
});
