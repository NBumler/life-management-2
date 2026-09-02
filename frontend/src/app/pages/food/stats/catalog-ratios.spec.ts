import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { computeRatio, pricePer100, rankFoods, rankRecipes } from './catalog-ratios';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: 'r1', name: 'Rántotta', deleted: false, ingredients: [], ...overrides };
}

describe('computeRatio', () => {
  it('divides numerator by denominator', () => {
    expect(computeRatio(10, 4)).toBe(2.5);
  });

  it('is null when either side is missing', () => {
    expect(computeRatio(null, 4)).toBeNull();
    expect(computeRatio(10, null)).toBeNull();
    expect(computeRatio(undefined, 4)).toBeNull();
  });

  it('is null when the denominator is zero', () => {
    expect(computeRatio(10, 0)).toBeNull();
  });
});

describe('pricePer100', () => {
  it('scales the package price to a 100-unit basis using the net content', () => {
    // 200 Ft for 250 g -> 80 Ft / 100 g
    expect(pricePer100(food({ priceHuf: 200, netAmount: 250, netUnit: 'g' }))).toBeCloseTo(80);
  });

  it('is null when the catalog has no price or no net content', () => {
    expect(pricePer100(food({ priceHuf: null, netAmount: 250, netUnit: 'g' }))).toBeNull();
    expect(pricePer100(food({ priceHuf: 200, netAmount: null, netUnit: null }))).toBeNull();
  });

  it('is null for a db-unit net content (no weight/volume dimension to scale to 100)', () => {
    expect(pricePer100(food({ priceHuf: 200, netAmount: 4, netUnit: 'cs' }))).toBeNull();
  });
});

describe('rankFoods', () => {
  it('ranks by protein/kcal descending by default', () => {
    const foods = [
      food({ id: 'lean', name: 'Csirkemell', proteinG: 25, energyKcal: 110 }),
      food({ id: 'fatty', name: 'Szalonna', proteinG: 10, energyKcal: 500 }),
    ];

    const ranked = rankFoods(foods, 'PROTEIN_PER_KCAL', 'DESC');

    expect(ranked.map((r) => r.id)).toEqual(['lean', 'fatty']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it('reverses order in ASC direction', () => {
    const foods = [
      food({ id: 'lean', name: 'Csirkemell', proteinG: 25, energyKcal: 110 }),
      food({ id: 'fatty', name: 'Szalonna', proteinG: 10, energyKcal: 500 }),
    ];

    expect(rankFoods(foods, 'PROTEIN_PER_KCAL', 'ASC').map((r) => r.id)).toEqual(['fatty', 'lean']);
  });

  it('places hiányos items after every ranked item, sorted alphabetically, with no rank', () => {
    const foods = [
      food({ id: 'valid', name: 'Csirkemell', proteinG: 25, energyKcal: 110 }),
      food({ id: 'z-missing', name: 'Zöldség', proteinG: null, energyKcal: 30 }),
      food({ id: 'a-missing', name: 'Alma', proteinG: null, energyKcal: 50 }),
    ];

    const ranked = rankFoods(foods, 'PROTEIN_PER_KCAL', 'DESC');

    expect(ranked.map((r) => r.id)).toEqual(['valid', 'a-missing', 'z-missing']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBeNull();
    expect(ranked[2].rank).toBeNull();
  });

  it('excludes deleted foods', () => {
    const foods = [food({ id: 'live' }), food({ id: 'gone', deleted: true })];
    expect(rankFoods(foods, 'PROTEIN_PER_KCAL', 'DESC').map((r) => r.id)).toEqual(['live']);
  });

  it('PROTEIN_PER_PRICE uses the 100-unit package price', () => {
    const foods = [food({ id: 'f1', proteinG: 20, priceHuf: 200, netAmount: 200, netUnit: 'g' })]; // 100 Ft/100g -> ratio 0.2
    expect(rankFoods(foods, 'PROTEIN_PER_PRICE', 'DESC')[0].ratio).toBeCloseTo(0.2);
  });
});

describe('rankRecipes', () => {
  it('ranks by the recipe\'s summed totals (one adag)', () => {
    const foods = [food({ id: 'f1', proteinG: 20, energyKcal: 100, carbsG: 10, fatG: 5, priceHuf: 100, netAmount: 100, netUnit: 'g' })];
    const recipes = [
      recipe({ id: 'r1', name: 'A', ingredients: [{ id: 'i1', recipeId: 'r1', foodId: 'f1', quantityAmount: 200, quantityUnit: 'g', sortOrder: 0, deleted: false }] }),
    ];

    const ranked = rankRecipes(recipes, foods, 'PROTEIN_PER_KCAL', 'DESC');

    expect(ranked[0].ratio).toBeCloseTo(40 / 200); // 2x scaled protein/kcal
  });

  it('is hiányos when the summary itself is incomplete (e.g. a deleted/missing ingredient food)', () => {
    const recipes = [
      recipe({ id: 'r1', name: 'A', ingredients: [{ id: 'i1', recipeId: 'r1', foodId: 'missing', quantityAmount: 1, quantityUnit: 'kg', sortOrder: 0, deleted: false }] }),
    ];

    const ranked = rankRecipes(recipes, [], 'PROTEIN_PER_KCAL', 'DESC');

    expect(ranked[0].ratio).toBeNull();
    expect(ranked[0].rank).toBeNull();
  });

  it('excludes deleted recipes', () => {
    const recipes = [recipe({ id: 'live' }), recipe({ id: 'gone', deleted: true })];
    expect(rankRecipes(recipes, [], 'PROTEIN_PER_KCAL', 'DESC').map((r) => r.id)).toEqual(['live']);
  });
});
