import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Recipe } from '../../api/model/recipe';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { RecipeDuplicateError, RecipeRepository, isDuplicateRecipe } from './recipe.repository';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: 'r1', name: 'Rántotta', deleted: false, ingredients: [], ...overrides };
}

describe('isDuplicateRecipe', () => {
  it('is never a duplicate of itself', () => {
    const existing = recipe({ id: 'same' });
    expect(isDuplicateRecipe(existing, { id: 'same', name: 'Rántotta', ingredients: [] })).toBeFalse();
  });

  it('matches on name, case/diacritic-insensitively, regardless of ingredients', () => {
    const existing = recipe({ name: 'Rántotta' });
    expect(isDuplicateRecipe(existing, { id: 'other', name: 'rántotta', ingredients: [] })).toBeTrue();
  });

  it('does not treat two different-named empty-ingredient recipes as duplicates', () => {
    const existing = recipe({ name: 'Leves', ingredients: [] });
    expect(isDuplicateRecipe(existing, { id: 'other', name: 'Saláta', ingredients: [] })).toBeFalse();
  });

  it('matches when the live ingredient set is the same regardless of order', () => {
    const existing = recipe({
      name: 'Rántotta A',
      ingredients: [
        { id: 'i1', recipeId: 'r1', foodId: 'egg', quantityAmount: 3, quantityUnit: 'cs', sortOrder: 0, deleted: false },
        { id: 'i2', recipeId: 'r1', foodId: 'milk', quantityAmount: 100, quantityUnit: 'ml', sortOrder: 1, deleted: false },
      ],
    });
    const draft = {
      id: 'other',
      name: 'Rántotta B',
      ingredients: [
        { foodId: 'milk', quantityAmount: 100, quantityUnit: 'ml' },
        { foodId: 'egg', quantityAmount: 3, quantityUnit: 'cs' },
      ],
    };
    expect(isDuplicateRecipe(existing, draft)).toBeTrue();
  });

  it('ignores tombstoned ingredients on the existing recipe when comparing sets', () => {
    const existing = recipe({
      name: 'Rántotta A',
      ingredients: [
        { id: 'i1', recipeId: 'r1', foodId: 'egg', quantityAmount: 3, quantityUnit: 'cs', sortOrder: 0, deleted: false },
        { id: 'i2', recipeId: 'r1', foodId: 'milk', quantityAmount: 100, quantityUnit: 'ml', sortOrder: 1, deleted: true },
      ],
    });
    const draft = { id: 'other', name: 'Rántotta B', ingredients: [{ foodId: 'egg', quantityAmount: 3, quantityUnit: 'cs' }] };
    expect(isDuplicateRecipe(existing, draft)).toBeTrue();
  });

  it('does not match when a single ingredient amount differs', () => {
    const existing = recipe({
      name: 'Rántotta A',
      ingredients: [{ id: 'i1', recipeId: 'r1', foodId: 'egg', quantityAmount: 3, quantityUnit: 'cs', sortOrder: 0, deleted: false }],
    });
    const draft = { id: 'other', name: 'Rántotta B', ingredients: [{ foodId: 'egg', quantityAmount: 4, quantityUnit: 'cs' }] };
    expect(isDuplicateRecipe(existing, draft)).toBeFalse();
  });
});

describe('RecipeRepository', () => {
  let repository: RecipeRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listRecipes', 'saveRecipe', 'deleteRecipe']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(RecipeRepository);
  });

  it('load(): reads every recipe from the storage backend', async () => {
    storage.listRecipes.and.resolveTo([recipe({ id: 'a', name: 'Alfa' }), recipe({ id: 'b', name: 'Béta' })]);

    await repository.load();

    expect(repository.items().map((r) => r.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBeTrue();
  });

  it('save(): throws RecipeDuplicateError before writing, when another live recipe has the same name', async () => {
    storage.listRecipes.and.resolveTo([recipe({ id: 'existing', name: 'Tél' })]);
    await repository.load();

    await expectAsync(repository.save({ id: '', name: 'tél', note: null, ingredients: [] })).toBeRejectedWith(
      jasmine.any(RecipeDuplicateError),
    );
    expect(storage.saveRecipe).not.toHaveBeenCalled();
  });

  it('save(): upserts the returned recipe into the loaded list', async () => {
    storage.listRecipes.and.resolveTo([]);
    await repository.load();
    storage.saveRecipe.and.resolveTo(recipe({ id: 'new-1', name: 'Bableves' }));

    const saved = await repository.save({ id: '', name: 'Bableves', note: null, ingredients: [] });

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((r) => r.id)).toEqual(['new-1']);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listRecipes.and.resolveTo([recipe({ id: 'a' })]);
    await repository.load();
    storage.deleteRecipe.and.resolveTo(recipe({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteRecipe).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listRecipes.and.resolveTo([]);
    await repository.load();
    storage.saveRecipe.and.resolveTo(recipe());
    storage.deleteRecipe.and.resolveTo(recipe({ deleted: true }));

    await repository.save({ id: '', name: 'Tél', note: null, ingredients: [] });
    await repository.remove('r1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listRecipes.and.resolveTo([]);
    await repository.load();
    storage.saveRecipe.and.resolveTo(recipe());

    await repository.save({ id: '', name: 'Tél', note: null, ingredients: [] });

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

describe('RecipeRepository caching', () => {
  let repository: RecipeRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let dataChanges: DataChangeNotifier;

  function configure(native: boolean): void {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(native);
    storage = jasmine.createSpyObj('StorageBackend', ['listRecipes', 'saveRecipe', 'deleteRecipe']);
    storage.listRecipes.and.resolveTo([recipe({ id: 'a', name: 'Alma torta' })]);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(RecipeRepository);
    dataChanges = TestBed.inject(DataChangeNotifier);
  }

  it('native: a second load() is served from memory instead of re-querying the store', async () => {
    configure(true);

    await repository.load();
    await repository.load();

    expect(storage.listRecipes).toHaveBeenCalledTimes(1);
  });

  it('an unchanged reload does not replace the signal — even when an ingredient version is stable', async () => {
    configure(false);
    storage.listRecipes.and.resolveTo([
      recipe({ id: 'a', name: 'Alma torta', ingredients: [{ id: 'i1', recipeId: 'a', foodId: 'f1', quantityAmount: 1, quantityUnit: 'cs', sortOrder: 0, deleted: false }] }),
    ]);

    await repository.load();
    const firstReference = repository.items();
    await repository.load();

    expect(repository.items()).toBe(firstReference);
  });

  it('reload() picks up an ingredient-only change (nested aggregate)', async () => {
    configure(true);
    storage.listRecipes.and.resolveTo([
      recipe({ id: 'a', name: 'Alma torta', ingredients: [{ id: 'i1', recipeId: 'a', foodId: 'f1', quantityAmount: 1, quantityUnit: 'cs', sortOrder: 0, deleted: false, updatedAt: 'v1' }] }),
    ]);
    await repository.load();
    const firstReference = repository.items();

    storage.listRecipes.and.resolveTo([
      recipe({ id: 'a', name: 'Alma torta', ingredients: [{ id: 'i1', recipeId: 'a', foodId: 'f1', quantityAmount: 2, quantityUnit: 'cs', sortOrder: 0, deleted: false, updatedAt: 'v2' }] }),
    ]);
    await repository.reload();

    expect(repository.items()).not.toBe(firstReference);
    expect(repository.items()[0].ingredients[0].quantityAmount).toBe(2);
  });

  it('a DataChangeNotifier tick naming Recipe (post-pull) invalidates the native cache', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects();
    storage.listRecipes.and.resolveTo([recipe({ id: 'a', name: 'Alma torta', updatedAt: 'v2' })]);

    dataChanges.notifyChanged(['Recipe']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listRecipes).toHaveBeenCalledTimes(2);
  });

  it('reloads on a Food tick too — a Food delete cascades to recipe_ingredient locally', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects();
    storage.listRecipes.and.resolveTo([recipe({ id: 'a', name: 'Alma torta', updatedAt: 'v2' })]);

    dataChanges.notifyChanged(['Food']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listRecipes).toHaveBeenCalledTimes(2);
  });

  it('a tick that touched neither recipes nor food leaves the cache alone', async () => {
    configure(true);

    await repository.load();
    TestBed.flushEffects();

    dataChanges.notifyChanged(['ShoppingListItem']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listRecipes).toHaveBeenCalledTimes(1);
  });
});
