import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { FoodRepository } from '../../../core/data/food.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { KajaStatsPage } from './kaja-stats.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Csirkemell', deleted: false, proteinG: 25, energyKcal: 110, carbsG: 0, ...overrides };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: 'r1', name: 'Rántotta', deleted: false, ingredients: [], ...overrides };
}

describe('KajaStatsPage', () => {
  let fixture: ComponentFixture<KajaStatsPage>;
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let recipeRepository: jasmine.SpyObj<Pick<RecipeRepository, 'load'>> & { items: ReturnType<typeof signal<Recipe[]>> };

  beforeEach(async () => {
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    recipeRepository = jasmine.createSpyObj('RecipeRepository', ['load']) as never;
    recipeRepository.load.and.resolveTo();
    recipeRepository.items = signal<Recipe[]>([]);

    await TestBed.configureTestingModule({
      imports: [KajaStatsPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: FoodRepository, useValue: foodRepository },
        { provide: RecipeRepository, useValue: recipeRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KajaStatsPage);
  });

  it('defaults to ranking foods by protein/kcal descending', () => {
    foodRepository.items.set([food({ id: 'lean', proteinG: 25, energyKcal: 110 }), food({ id: 'fatty', proteinG: 10, energyKcal: 500 })]);

    expect(fixture.componentInstance.rows().map((r) => r.id)).toEqual(['lean', 'fatty']);
  });

  it('switches to the recipe ranking when catalogKind is RECIPE', () => {
    recipeRepository.items.set([recipe({ id: 'r1' })]);
    fixture.componentInstance.catalogKind.set('RECIPE');

    expect(fixture.componentInstance.rows().map((r) => r.id)).toEqual(['r1']);
  });

  it('toggleDirection(): flips DESC/ASC', () => {
    expect(fixture.componentInstance.direction()).toBe('DESC');
    fixture.componentInstance.toggleDirection();
    expect(fixture.componentInstance.direction()).toBe('ASC');
    fixture.componentInstance.toggleDirection();
    expect(fixture.componentInstance.direction()).toBe('DESC');
  });

  it('search narrows the displayed rows without changing their assigned rank', () => {
    foodRepository.items.set([food({ id: 'lean', name: 'Csirkemell', proteinG: 25, energyKcal: 110 }), food({ id: 'fatty', name: 'Szalonna', proteinG: 10, energyKcal: 500 })]);

    fixture.componentInstance.query.set('szalonna');

    const rows = fixture.componentInstance.rows();
    expect(rows.map((r) => r.id)).toEqual(['fatty']);
    expect(rows[0].rank).toBe(2); // still its rank in the full, unfiltered ranking
  });

  it('open(): navigates to the food catalog edit route for a FOOD row', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.open({ id: 'f1', name: 'x', ratio: 1, rank: 1 });

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food', 'catalog', 'f1']);
  });

  it('open(): navigates to the recipe edit route for a RECIPE row', () => {
    fixture.componentInstance.catalogKind.set('RECIPE');
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.open({ id: 'r1', name: 'x', ratio: 1, rank: 1 });

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food', 'recipe', 'r1']);
  });
});
