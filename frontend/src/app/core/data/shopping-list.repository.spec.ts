import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { ShoppingList } from '../../api/model/shoppingList';
import { ShoppingListCompleteDraft, ShoppingListCompleteResult, ShoppingListDraft, StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { ShoppingListRepository } from './shopping-list.repository';
import { StoredFoodRepository } from './stored-food.repository';

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl-1', name: 'Heti bevásárlás', deleted: false, items: [], ...overrides };
}

function draft(overrides: Partial<ShoppingListDraft> = {}): ShoppingListDraft {
  return { id: '', name: null, items: [], ...overrides };
}

function completeDraft(overrides: Partial<ShoppingListCompleteDraft> = {}): ShoppingListCompleteDraft {
  return { shoppingListId: 'sl-1', checkedFoodEntries: [], storageEntries: [], newActiveList: null, ...overrides };
}

describe('ShoppingListRepository', () => {
  let repository: ShoppingListRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;
  let storedFoodRepository: jasmine.SpyObj<Pick<StoredFoodRepository, 'load'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listShoppingLists', 'saveShoppingList', 'deleteShoppingList', 'completeShoppingList']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);
    storedFoodRepository = jasmine.createSpyObj('StoredFoodRepository', ['load']);
    storedFoodRepository.load.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
        { provide: StoredFoodRepository, useValue: storedFoodRepository },
      ],
    });
    repository = TestBed.inject(ShoppingListRepository);
  });

  it('load(): reads all items from the storage backend', async () => {
    storage.listShoppingLists.and.resolveTo([shoppingList({ id: 'a' }), shoppingList({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): assigns a fresh id for a brand-new list', async () => {
    storage.listShoppingLists.and.resolveTo([]);
    await repository.load();
    storage.saveShoppingList.and.callFake(async (d) => shoppingList({ id: d.id || 'generated', name: d.name }));

    const saved = await repository.save(draft());

    expect(saved.id).not.toBe('');
    expect(storage.saveShoppingList).toHaveBeenCalled();
  });

  it('save(): upserts an existing list into the items signal by id', async () => {
    storage.listShoppingLists.and.resolveTo([shoppingList({ id: 'sl-1', name: 'Régi' })]);
    await repository.load();
    storage.saveShoppingList.and.resolveTo(shoppingList({ id: 'sl-1', name: 'Új' }));

    await repository.save(draft({ id: 'sl-1', name: 'Új' }));

    expect(repository.items()).toEqual([shoppingList({ id: 'sl-1', name: 'Új' })]);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listShoppingLists.and.resolveTo([shoppingList({ id: 'a' })]);
    await repository.load();
    storage.deleteShoppingList.and.resolveTo(shoppingList({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteShoppingList).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listShoppingLists.and.resolveTo([]);
    await repository.load();
    storage.saveShoppingList.and.resolveTo(shoppingList());
    storage.deleteShoppingList.and.resolveTo(shoppingList({ deleted: true }));

    await repository.save(draft());
    await repository.remove('sl-1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listShoppingLists.and.resolveTo([]);
    await repository.load();
    storage.saveShoppingList.and.resolveTo(shoppingList());

    await repository.save(draft());

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('complete(): delegates to the storage backend, reloads both this repository and StoredFoodRepository', async () => {
    storage.listShoppingLists.and.resolveTo([]);
    await repository.load();
    const result: ShoppingListCompleteResult = { archivedListId: 'sl-1', createdStorageEntryIds: ['sf-1'], newActiveListId: null };
    storage.completeShoppingList.and.resolveTo(result);
    storage.listShoppingLists.and.resolveTo([]); // archived list no longer active-listed

    const returned = await repository.complete(completeDraft());

    expect(storage.completeShoppingList).toHaveBeenCalledWith(completeDraft());
    expect(storage.listShoppingLists).toHaveBeenCalledTimes(2);
    expect(storedFoodRepository.load).toHaveBeenCalled();
    expect(returned).toEqual(result);
  });

  it('complete(): triggers a debounced drain on native', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listShoppingLists.and.resolveTo([]);
    await repository.load();
    storage.completeShoppingList.and.resolveTo({ archivedListId: 'sl-1', createdStorageEntryIds: [], newActiveListId: null });

    await repository.complete(completeDraft());

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalled();
  });
});
