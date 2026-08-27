import { Food } from '../../../api/model/food';
import { Meal } from '../../../api/model/meal';
import { MealItem } from '../../../api/model/mealItem';
import { Recipe } from '../../../api/model/recipe';
import { computeDailyNutrition } from './daily-nutrition';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'food-1', name: 'Tej', deleted: false, energyKcal: 60, proteinG: 3, carbsG: 5, fatG: 3, priceHuf: 500, netAmount: 1000, netUnit: 'ml', ...overrides };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    name: 'Rántotta',
    deleted: false,
    ingredients: [{ id: 'ing-1', recipeId: 'recipe-1', foodId: 'food-1', quantityAmount: 200, quantityUnit: 'ml', sortOrder: 0, deleted: false }],
    ...overrides,
  };
}

function customItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 'item-1',
    mealId: 'meal-1',
    type: 'CUSTOM',
    displayName: 'Torta',
    caloriesKcal: 100,
    proteinG: 10,
    carbsG: 20,
    fatG: 5,
    priceHuf: 300,
    servings: 1,
    sortOrder: 0,
    deleted: false,
    ...overrides,
  };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return { id: 'meal-1', eatenAt: '2026-08-26T10:00:00.000Z', timeZoneId: 'Europe/Budapest', note: null, deleted: false, items: [], ...overrides };
}

describe('computeDailyNutrition', () => {
  it('sums live CUSTOM items across multiple meals', () => {
    const meals = [
      meal({ id: 'm1', items: [customItem({ id: 'i1', mealId: 'm1', caloriesKcal: 100, proteinG: 10, carbsG: 20, fatG: 5, priceHuf: 300 })] }),
      meal({ id: 'm2', items: [customItem({ id: 'i2', mealId: 'm2', caloriesKcal: 200, proteinG: 15, carbsG: 30, fatG: 10, priceHuf: 400 })] }),
    ];

    const totals = computeDailyNutrition(meals, [], []);

    expect(totals).toEqual({ kcal: 300, proteinG: 25, carbsG: 50, fatG: 15, priceHuf: 700, incomplete: false });
  });

  it('excludes deleted items from the sum', () => {
    const meals = [
      meal({
        items: [
          customItem({ id: 'i1', caloriesKcal: 100, deleted: false }),
          customItem({ id: 'i2', caloriesKcal: 999, deleted: true }),
        ],
      }),
    ];

    expect(computeDailyNutrition(meals, [], []).kcal).toBe(100);
  });

  it('sums a RECIPE item by servings using the live recipe/food catalog', () => {
    const item: MealItem = { id: 'i1', mealId: 'm1', type: 'RECIPE', recipeId: 'recipe-1', servings: 2, sortOrder: 0, deleted: false };
    const meals = [meal({ items: [item] })];

    // 200ml of Tej: price=(200/1000)*500=100, kcal=(200/100)*60=120 — x2 servings.
    const totals = computeDailyNutrition(meals, [recipe()], [food()]);
    expect(totals.priceHuf).toBeCloseTo(200);
    expect(totals.kcal).toBeCloseTo(240);
    expect(totals.incomplete).toBeFalse();
  });

  it('sums a FOOD item using the effective quantity', () => {
    const item: MealItem = { id: 'i1', mealId: 'm1', type: 'FOOD', foodId: 'food-1', quantityAmount: 500, quantityUnit: 'ml', servings: 1, sortOrder: 0, deleted: false };
    const meals = [meal({ items: [item] })];

    const totals = computeDailyNutrition(meals, [], [food()]);
    expect(totals.kcal).toBeCloseTo(300);
    expect(totals.priceHuf).toBeCloseTo(250);
  });

  it('propagates incomplete when a referenced recipe no longer resolves', () => {
    const item: MealItem = { id: 'i1', mealId: 'm1', type: 'RECIPE', recipeId: 'missing', servings: 1, sortOrder: 0, deleted: false };
    const meals = [meal({ items: [item] })];

    expect(computeDailyNutrition(meals, [], []).incomplete).toBeTrue();
  });

  it('returns all-zero totals for an empty meal list', () => {
    expect(computeDailyNutrition([], [], [])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, priceHuf: 0, incomplete: false });
  });

  it('returns a fresh totals object per call (no shared zero-totals reference)', () => {
    const first = computeDailyNutrition([], [], []);
    const second = computeDailyNutrition([], [], []);
    expect(first).not.toBe(second);
  });
});
