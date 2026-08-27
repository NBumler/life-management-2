import { TestBed } from '@angular/core/testing';

import { Food } from '../../api/model/food';
import { Meal } from '../../api/model/meal';
import { StoredFood } from '../../api/model/storedFood';
import { MealDraft, StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { MealRepository } from './meal.repository';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'food-1', name: 'Liszt', deleted: false, ...overrides };
}

function storedFood(overrides: Partial<StoredFood> = {}): StoredFood {
  return {
    id: 'sf-1',
    foodId: 'food-1',
    quantityAmount: 500,
    quantityUnit: 'g',
    storageLocation: StoredFood.StorageLocationEnum.Room,
    expiresOn: '2026-12-01',
    opened: true,
    deleted: false,
    ...overrides,
  };
}

function foodItemDraft(): MealDraft {
  return {
    id: '',
    eatenAt: '2026-08-27T09:00:00.000Z',
    timeZoneId: 'Europe/Budapest',
    note: null,
    items: [{ id: 'item-1', type: 'FOOD', foodId: 'food-1', quantityAmount: 200, quantityUnit: 'g', servings: 1, sortOrder: 0 }],
  };
}

describe('MealRepository', () => {
  let repository: MealRepository;
  let storage: jasmine.SpyObj<StorageBackend>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', [
      'listMeals',
      'saveMeal',
      'deleteMeal',
      'listRecipes',
      'listFoods',
      'listStoredFoods',
      'upsertStoredFood',
      'deleteStoredFood',
    ]);
    storage.listMeals.and.resolveTo([]);
    storage.listRecipes.and.resolveTo([]);
    storage.listFoods.and.resolveTo([food()]);
    storage.listStoredFoods.and.resolveTo([storedFood()]);
    storage.upsertStoredFood.and.callFake((row: StoredFood) => Promise.resolve(row));
    storage.deleteStoredFood.and.callFake((id: string) => Promise.resolve(storedFood({ id, deleted: true })));
    storage.saveMeal.and.callFake((draft: MealDraft) =>
      Promise.resolve({ ...(draft as unknown as Meal), items: [], deleted: false } as Meal),
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(MealRepository);
  });

  it('save(): a new meal deducts stock even when no screen pre-loaded the stored-food catalog', async () => {
    await repository.load();

    await repository.save(foodItemDraft());

    // 500g on hand − 200g demanded = 300g written back. Regression: without an explicit
    // StoredFoodRepository.load() in the meal flow the planner saw an empty list and did nothing.
    expect(storage.listStoredFoods).toHaveBeenCalled();
    expect(storage.upsertStoredFood).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'sf-1', quantityAmount: 300 }));
  });

  it('save(): editing an existing meal never touches stock', async () => {
    storage.listMeals.and.resolveTo([
      { id: 'm1', eatenAt: '2026-08-27T09:00:00.000Z', timeZoneId: 'Europe/Budapest', note: null, items: [], deleted: false } as Meal,
    ]);
    await repository.load();

    await repository.save({ ...foodItemDraft(), id: 'm1' });

    expect(storage.upsertStoredFood).not.toHaveBeenCalled();
    expect(storage.deleteStoredFood).not.toHaveBeenCalled();
  });
});
