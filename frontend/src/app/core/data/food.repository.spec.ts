import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Food } from '../../api/model/food';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { FoodDuplicateError, FoodRepository, isDuplicateFood } from './food.repository';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

describe('isDuplicateFood', () => {
  it('documentation/Architektúra/Névegyediség.md: is true when every field matches', () => {
    const a = food({ store: 'Aldi', energyKcal: 42 });
    const b = food({ store: 'Aldi', energyKcal: 42 });
    expect(isDuplicateFood(a, b)).toBe(true);
  });

  it('is false when a partial field differs (e.g. same name, different store)', () => {
    const a = food({ store: 'Aldi' });
    const b = food({ store: 'Lidl' });
    expect(isDuplicateFood(a, b)).toBe(false);
  });

  it('treats null and 0 as different for numeric fields', () => {
    const a = food({ energyKcal: null });
    const b = food({ energyKcal: 0 });
    expect(isDuplicateFood(a, b)).toBe(false);
  });

  it('never treats different unit families as equal, even with the same numeric amount', () => {
    const a = food({ netAmount: 3, netUnit: 'cs' });
    const b = food({ netAmount: 3, netUnit: 'g' });
    expect(isDuplicateFood(a, b)).toBe(false);
  });

  it('treats different units of the same family as equal when the canonical amount matches (1l = 100cl)', () => {
    const a = food({ netAmount: 1, netUnit: 'l' });
    const b = food({ netAmount: 100, netUnit: 'cl' });
    expect(isDuplicateFood(a, b)).toBe(true);
  });
});

describe('FoodRepository', () => {
  let repository: FoodRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listFoods', 'upsertFood', 'deleteFood']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(FoodRepository);
  });

  it('load(): reads all items from the storage backend', async () => {
    storage.listFoods.and.resolveTo([food({ id: 'a', name: 'Alma' }), food({ id: 'b', name: 'Banán' })]);

    await repository.load();

    expect(repository.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): assigns a fresh id for a brand-new item', async () => {
    storage.listFoods.and.resolveTo([]);
    await repository.load();
    storage.upsertFood.and.callFake(async (draft) => draft);

    const saved = await repository.save(food({ id: '' }));

    expect(saved.id).not.toBe('');
    expect(storage.upsertFood).toHaveBeenCalled();
  });

  it('save(): throws FoodDuplicateError before writing, when every field matches a live item', async () => {
    storage.listFoods.and.resolveTo([food({ id: 'existing', store: 'Aldi' })]);
    await repository.load();

    await expectAsync(repository.save(food({ id: 'new', store: 'Aldi' }))).toBeRejectedWith(jasmine.any(FoodDuplicateError));
    expect(storage.upsertFood).not.toHaveBeenCalled();
  });

  it('save(): allows saving a partial match against another live item', async () => {
    storage.listFoods.and.resolveTo([food({ id: 'existing', store: 'Aldi' })]);
    await repository.load();
    storage.upsertFood.and.callFake(async (draft) => draft);

    await expectAsync(repository.save(food({ id: 'new', store: 'Lidl' }))).toBeResolved();
  });

  it('save(): excludes the row being edited from its own conflict check', async () => {
    storage.listFoods.and.resolveTo([food({ id: 'existing' })]);
    await repository.load();
    storage.upsertFood.and.callFake(async (draft) => draft);

    await expectAsync(repository.save(food({ id: 'existing' }))).toBeResolved();
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listFoods.and.resolveTo([food({ id: 'a' })]);
    await repository.load();
    storage.deleteFood.and.resolveTo(food({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteFood).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listFoods.and.resolveTo([]);
    await repository.load();
    storage.upsertFood.and.resolveTo(food());
    storage.deleteFood.and.resolveTo(food({ deleted: true }));

    await repository.save(food());
    await repository.remove('f1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listFoods.and.resolveTo([]);
    await repository.load();
    storage.upsertFood.and.resolveTo(food());

    await repository.save(food());

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

describe('FoodRepository caching', () => {
  let repository: FoodRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let dataChanges: DataChangeNotifier;

  function configure(native: boolean): void {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(native);
    storage = jasmine.createSpyObj('StorageBackend', ['listFoods', 'upsertFood', 'deleteFood']);
    storage.listFoods.and.resolveTo([food({ id: 'a', name: 'Alma' })]);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(FoodRepository);
    dataChanges = TestBed.inject(DataChangeNotifier);
  }

  it('native: a second load() is served from memory instead of re-querying the store', async () => {
    configure(true);

    await repository.load();
    await repository.load();

    expect(storage.listFoods).toHaveBeenCalledTimes(1);
  });

  it('web: load() re-fetches every time, but an unchanged result does not replace the signal', async () => {
    configure(false);

    await repository.load();
    const firstReference = repository.items();
    await repository.load();

    expect(storage.listFoods).toHaveBeenCalledTimes(2);
    expect(repository.items()).toBe(firstReference);
  });

  it('reload() bypasses the cache and replaces items when the row set changed', async () => {
    configure(true);

    await repository.load();
    storage.listFoods.and.resolveTo([food({ id: 'a', name: 'Alma' }), food({ id: 'b', name: 'Banán' })]);
    await repository.reload();

    expect(storage.listFoods).toHaveBeenCalledTimes(2);
    expect(repository.items().map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('a DataChangeNotifier tick naming Food (post-pull) invalidates the native cache', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects(); // first effect run only primes the tick dependency
    storage.listFoods.and.resolveTo([food({ id: 'a', name: 'Alma', updatedAt: 'v2' })]);

    dataChanges.notifyChanged(['Food']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listFoods).toHaveBeenCalledTimes(2);
  });

  it('a tick that changed no Food rows leaves the cache alone', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects();

    dataChanges.notifyChanged(['PackingSession', 'MealItem']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listFoods).toHaveBeenCalledTimes(1);
  });

  it('a concurrent second load() reuses the in-flight read', async () => {
    configure(false);

    await Promise.all([repository.load(), repository.load()]);

    expect(storage.listFoods).toHaveBeenCalledTimes(1);
  });

  it('a forced load() arriving during a plain read still re-queries the updated store', async () => {
    configure(true);
    let resolveFirst: (rows: Food[]) => void = () => undefined;
    storage.listFoods.and.returnValue(new Promise<Food[]>((resolve) => (resolveFirst = resolve)));

    const plain = repository.load();
    const forced = repository.load({ force: true });
    resolveFirst([food({ id: 'a', name: 'Alma' })]);
    storage.listFoods.and.resolveTo([food({ id: 'a', name: 'Alma', updatedAt: 'v2' })]);
    await Promise.all([plain, forced]);

    expect(storage.listFoods).toHaveBeenCalledTimes(2);
    expect(repository.items()[0].updatedAt).toBe('v2');
  });
});
