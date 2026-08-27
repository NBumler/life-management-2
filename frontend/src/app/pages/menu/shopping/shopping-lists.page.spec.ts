import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { ShoppingList } from '../../../api/model/shoppingList';
import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingListsPage } from './shopping-lists.page';

function nonFoodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i1', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Mosószer', note: null, checked: false, sortOrder: 0, deleted: false, ...overrides };
}

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl1', name: 'Heti bevásárlás', deleted: false, items: [], ...overrides };
}

describe('ShoppingListsPage', () => {
  let fixture: ComponentFixture<ShoppingListsPage>;
  let repository: jasmine.SpyObj<Pick<ShoppingListRepository, 'load' | 'remove'>> & { items: ReturnType<typeof signal<ShoppingList[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('ShoppingListRepository', ['load', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<ShoppingList[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [ShoppingListsPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ShoppingListRepository, useValue: repository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingListsPage);
  });

  it('itemCount(): counts only live items', () => {
    const list = shoppingList({ items: [nonFoodItem({ id: 'i1' }), nonFoodItem({ id: 'i2', deleted: true })] });
    expect(fixture.componentInstance.itemCount(list)).toBe(1);
  });

  it('delete(): the confirmation handler removes the list via the repository', async () => {
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(shoppingList({ id: 'sl1' }));
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('sl1');
  });
});
