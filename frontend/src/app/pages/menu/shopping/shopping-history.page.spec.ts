import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingHistoryPage } from './shopping-history.page';

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl1', name: 'Heti bevásárlás', status: 'ARCHIVED', completedAt: '2026-08-20T10:00:00.000Z', deleted: false, items: [], ...overrides };
}

describe('ShoppingHistoryPage', () => {
  let fixture: ComponentFixture<ShoppingHistoryPage>;
  let repository: jasmine.SpyObj<Pick<ShoppingListRepository, 'load'>> & { items: ReturnType<typeof signal<ShoppingList[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };

  beforeEach(async () => {
    repository = jasmine.createSpyObj('ShoppingListRepository', ['load']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<ShoppingList[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);

    await TestBed.configureTestingModule({
      imports: [ShoppingHistoryPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ShoppingListRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingHistoryPage);
  });

  it('lists(): only ARCHIVED lists, narrowed by the search query', () => {
    repository.items.set([shoppingList({ id: 'a', name: 'Karácsonyi' }), shoppingList({ id: 'b', name: 'Nyári' }), shoppingList({ id: 'c', status: 'ACTIVE' })]);

    expect(fixture.componentInstance.lists().map((l) => l.id)).toEqual(jasmine.arrayWithExactContents(['a', 'b']));

    fixture.componentInstance.query.set('karácsony');
    expect(fixture.componentInstance.lists().map((l) => l.id)).toEqual(['a']);
  });

  it('itemCount(): counts only live items', () => {
    const list = shoppingList({
      items: [
        { id: 'i1', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'A', checked: false, sortOrder: 0, deleted: false },
        { id: 'i2', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'B', checked: false, sortOrder: 1, deleted: true },
      ],
    });
    expect(fixture.componentInstance.itemCount(list)).toBe(1);
  });
});
