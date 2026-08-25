import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodRepository } from '../../../core/data/food.repository';
import { FoodListPage } from './food-list.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

describe('FoodListPage', () => {
  let fixture: ComponentFixture<FoodListPage>;
  let repository: jasmine.SpyObj<Pick<FoodRepository, 'load' | 'remove'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('FoodRepository', ['load', 'remove']) as never;
    repository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [FoodListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: FoodRepository, useValue: repository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodListPage);
  });

  it('documentation/Architektúra/Szöveges keresés.md: an accent-exact match ranks ahead of a fold-only match', () => {
    repository.items.set([food({ id: 'plain', name: 'Sor' }), food({ id: 'accented', name: 'Sör' })]);
    fixture.componentInstance.query.set('sör');

    expect(fixture.componentInstance.filteredItems().map((i) => i.id)).toEqual(['accented', 'plain']);
  });

  it('subtitle(): joins brand and store, skipping missing parts', () => {
    expect(fixture.componentInstance.subtitle(food({ brand: 'Nestlé', store: 'Aldi' }))).toBe('Nestlé · Aldi');
    expect(fixture.componentInstance.subtitle(food({ brand: null, store: 'Aldi' }))).toBe('Aldi');
    expect(fixture.componentInstance.subtitle(food({ brand: null, store: null }))).toBe('');
  });

  it('delete(): the confirmation handler removes the food via the repository', async () => {
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(food());
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('f1');
  });

  it('edit(): navigates to the catalog edit route for the item', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.edit(food({ id: 'f2' }));

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/catalog', 'f2']);
  });
});
