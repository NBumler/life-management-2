import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Recipe } from '../../../api/model/recipe';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { RecipeListPage } from './recipe-list.page';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: 'r1', name: 'Rántotta', deleted: false, ingredients: [], ...overrides };
}

describe('RecipeListPage', () => {
  let fixture: ComponentFixture<RecipeListPage>;
  let repository: jasmine.SpyObj<Pick<RecipeRepository, 'load' | 'remove'>> & { items: ReturnType<typeof signal<Recipe[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('RecipeRepository', ['load', 'remove']) as never;
    repository.items = signal<Recipe[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [RecipeListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: RecipeRepository, useValue: repository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeListPage);
  });

  it('documentation/Architektúra/Szöveges keresés.md: an accent-exact match ranks ahead of a fold-only match', () => {
    repository.items.set([recipe({ id: 'plain', name: 'Sos' }), recipe({ id: 'accented', name: 'Sós' })]);
    fixture.componentInstance.query.set('sós');

    expect(fixture.componentInstance.filteredItems().map((r) => r.id)).toEqual(['accented', 'plain']);
  });

  it('subtitle(): reports the live ingredient count, excluding tombstoned rows', () => {
    const item = recipe({
      ingredients: [
        { id: 'i1', recipeId: 'r1', foodId: 'f1', quantityAmount: 1, quantityUnit: 'db', sortOrder: 0, deleted: false },
        { id: 'i2', recipeId: 'r1', foodId: 'f2', quantityAmount: 1, quantityUnit: 'db', sortOrder: 1, deleted: true },
      ],
    });

    expect(fixture.componentInstance.subtitle(item)).toBe('FOOD.RECIPE.INGREDIENT_COUNT');
  });

  it('edit(): navigates to the recipe edit route for the item', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.edit(recipe({ id: 'r2' }));

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/recipe', 'r2']);
  });

  it('addRecipe(): navigates to the new-recipe route', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.addRecipe();

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/recipe', 'new']);
  });

  it('delete(): the confirmation handler removes the recipe via the repository', async () => {
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(recipe());
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('r1');
  });

  it('switchSection(): navigates to catalog or storage, ignoring its own segment value', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance.switchSection('catalog');
    fixture.componentInstance.switchSection('storage');
    fixture.componentInstance.switchSection('recipe');

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/catalog');
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/storage');
    expect(navigateSpy).toHaveBeenCalledTimes(2);
  });

  it('switchSection(): navigating to "stats" goes to the Kaja statisztika page', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance.switchSection('stats');

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/stats');
  });
});
