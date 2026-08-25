import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Food } from '../../api/model/food';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
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
    const a = food({ netAmount: 3, netUnit: 'db' });
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
