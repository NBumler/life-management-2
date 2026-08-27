import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingHistoryDetailPage } from './shopping-history-detail.page';

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl1', name: 'Heti bevásárlás', status: 'ARCHIVED', completedAt: '2026-08-20T10:00:00.000Z', deleted: false, items: [], ...overrides };
}

describe('ShoppingHistoryDetailPage', () => {
  let fixture: ComponentFixture<ShoppingHistoryDetailPage>;
  let repository: jasmine.SpyObj<Pick<ShoppingListRepository, 'load' | 'save'>> & { items: ReturnType<typeof signal<ShoppingList[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('ShoppingListRepository', ['load', 'save']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<ShoppingList[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);

    await TestBed.configureTestingModule({
      imports: [ShoppingHistoryDetailPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: ShoppingListRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingHistoryDetailPage);
  }

  it('redirects to history when the list no longer exists', async () => {
    await createFixture('gone');
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping/history');
  });

  it('liveItems(): excludes deleted items', async () => {
    await createFixture('sl1');
    repository.items.set([
      shoppingList({
        items: [
          { id: 'i1', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'A', checked: false, sortOrder: 0, deleted: false },
          { id: 'i2', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'B', checked: false, sortOrder: 1, deleted: true },
        ],
      }),
    ]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.liveItems().map((i) => i.id)).toEqual(['i1']);
  });

  it('relist(): builds a fresh draft with unchecked items and navigates to the new list\'s editor', async () => {
    await createFixture('sl1');
    repository.items.set([
      shoppingList({
        name: 'Heti bevásárlás',
        items: [{ id: 'i1', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Mosószer', note: 'Lidl', checked: true, sortOrder: 0, deleted: false }],
      }),
    ]);
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(shoppingList({ id: 'new-1' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.relist();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Heti bevásárlás',
        items: [jasmine.objectContaining({ type: 'NON_FOOD', name: 'Mosószer', note: 'Lidl', checked: false })],
      }),
    );
    const draft = repository.save.calls.mostRecent().args[0];
    expect(draft.id).not.toBe('sl1');
    expect(draft.items[0].id).not.toBe('i1');
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping/new-1');
  });
});
