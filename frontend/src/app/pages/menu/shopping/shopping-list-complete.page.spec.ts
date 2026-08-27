import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingListCompleteDraft, ShoppingListCompleteResult } from '../../../core/storage/storage-backend';
import { ShoppingListCompletePage } from './shopping-list-complete.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

function foodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i1', shoppingListId: 'sl1', type: 'FOOD', foodId: 'f1', quantityAmount: 1, quantityUnit: 'kg', checked: true, sortOrder: 0, deleted: false, ...overrides };
}

function nonFoodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i2', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Mosószer', note: null, checked: false, sortOrder: 1, deleted: false, ...overrides };
}

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl1', name: 'Heti bevásárlás', deleted: false, items: [], ...overrides };
}

describe('ShoppingListCompletePage', () => {
  let fixture: ComponentFixture<ShoppingListCompletePage>;
  let repository: jasmine.SpyObj<Pick<ShoppingListRepository, 'load' | 'complete'>> & { items: ReturnType<typeof signal<ShoppingList[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('ShoppingListRepository', ['load', 'complete']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<ShoppingList[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);

    await TestBed.configureTestingModule({
      imports: [ShoppingListCompletePage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: ShoppingListRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingListCompletePage);
  }

  it('redirects to the list overview when the list no longer exists', async () => {
    await createFixture('gone');
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping');
  });

  it('builds one row per checked FOOD item, prefilling location/expiry from the catalog', async () => {
    await createFixture('sl1');
    foodRepository.items.set([food({ id: 'f1' })]);
    repository.items.set([shoppingList({ items: [foodItem({ checked: true }), nonFoodItem({ checked: false })] })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.rows().length).toBe(1);
    expect(fixture.componentInstance.rows()[0].item.id).toBe('i1');
    expect(fixture.componentInstance.hasCheckedFood()).toBeTrue();
  });

  it('hasCheckedFood() is false when nothing is checked', async () => {
    await createFixture('sl1');
    repository.items.set([shoppingList({ items: [nonFoodItem({ checked: false })] })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.rows()).toEqual([]);
    expect(fixture.componentInstance.hasCheckedFood()).toBeFalse();
  });

  it('confirm(): calls repository.complete with a draft built from the current rows, then navigates back', async () => {
    await createFixture('sl1');
    foodRepository.items.set([food({ id: 'f1' })]);
    repository.items.set([shoppingList({ items: [foodItem({ checked: true })] })]);
    await fixture.componentInstance.ngOnInit();
    const result: ShoppingListCompleteResult = { archivedListId: 'sl1', createdStorageEntryIds: ['x'], newActiveListId: null };
    repository.complete.and.resolveTo(result);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.confirm();

    expect(repository.complete).toHaveBeenCalled();
    const draft = repository.complete.calls.mostRecent().args[0] as ShoppingListCompleteDraft;
    expect(draft.shoppingListId).toBe('sl1');
    expect(draft.checkedFoodEntries.length).toBe(1);
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping');
  });

  it('confirm(): works with zero checked items (straight-to-confirm path)', async () => {
    await createFixture('sl1');
    repository.items.set([shoppingList({ items: [nonFoodItem({ checked: false })] })]);
    await fixture.componentInstance.ngOnInit();
    const result: ShoppingListCompleteResult = { archivedListId: 'sl1', createdStorageEntryIds: [], newActiveListId: 'new-1' };
    repository.complete.and.resolveTo(result);
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.confirm();

    const draft = repository.complete.calls.mostRecent().args[0] as ShoppingListCompleteDraft;
    expect(draft.checkedFoodEntries).toEqual([]);
    expect(draft.newActiveList).not.toBeNull();
  });
});
