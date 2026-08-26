import { buildOpenFoodFactsUrl, computeOffDiff, mapOpenFoodFactsProduct } from './open-food-facts';

describe('buildOpenFoodFactsUrl', () => {
  it('documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md: uses the v2 product endpoint', () => {
    expect(buildOpenFoodFactsUrl('5901234123457')).toBe('https://world.openfoodfacts.org/api/v2/product/5901234123457.json');
  });
});

describe('mapOpenFoodFactsProduct', () => {
  it('maps name, brand (first of a comma list), and nutrients', () => {
    const mapped = mapOpenFoodFactsProduct({
      product_name: 'Tejcsokoládé',
      brands: 'Milka, Mondelez',
      nutriments: { 'energy-kcal_100g': 539, fat_100g: 30.9, proteins_100g: 6.3, salt_100g: 0.107 },
    });

    expect(mapped.name).toBe('Tejcsokoládé');
    expect(mapped.brand).toBe('Milka');
    expect(mapped.energyKcal).toBe(539);
    expect(mapped.fatG).toBe(30.9);
    expect(mapped.proteinG).toBe(6.3);
    expect(mapped.saltG).toBe(0.107);
  });

  it('derives unsaturated fat from fat minus saturated minus trans', () => {
    const mapped = mapOpenFoodFactsProduct({
      nutriments: { fat_100g: 30, 'saturated-fat_100g': 10, 'trans-fat_100g': 2 },
    });

    expect(mapped.fatUnsaturatedG).toBe(18);
  });

  it('derives complex carbs from carbohydrates minus sugars', () => {
    const mapped = mapOpenFoodFactsProduct({
      nutriments: { carbohydrates_100g: 57.5, sugars_100g: 56.3 },
    });

    expect(mapped.carbsComplexG).toBeCloseTo(1.2);
  });

  it('parses a clean quantity string into amount + unit', () => {
    const mapped = mapOpenFoodFactsProduct({ quantity: '500 g' });

    expect(mapped.netAmount).toBe(500);
    expect(mapped.netUnit).toBe('g');
  });

  it('leaves netAmount unset for an unparseable free-text quantity', () => {
    const mapped = mapOpenFoodFactsProduct({ quantity: '6x25cl' });

    expect(mapped.netAmount).toBeUndefined();
  });

  it('leaves chloride and shelf-life untouched (no OFF equivalent)', () => {
    const mapped = mapOpenFoodFactsProduct({ nutriments: { salt_100g: 1 } }) as Record<string, unknown>;

    expect(mapped['chlorideG']).toBeUndefined();
  });
});

describe('computeOffDiff', () => {
  it('documentation/Subfeatures/Élelmiszer manuális bevitele.md: skips fields where old and new are identical', () => {
    const diffs = computeOffDiff({ name: 'Tej', brand: 'Milka' }, { name: 'Tej', brand: 'Milka' });

    expect(diffs).toEqual([]);
  });

  it('reports fields that would actually change, old -> new', () => {
    const diffs = computeOffDiff({ name: 'Tej', energyKcal: 40 }, { name: 'Friss tej', energyKcal: 42 });

    expect(diffs).toEqual([
      { field: 'name', oldValue: 'Tej', newValue: 'Friss tej' },
      { field: 'energyKcal', oldValue: 40, newValue: 42 },
    ]);
  });

  it('treats a currently-empty field as a reportable difference', () => {
    const diffs = computeOffDiff({}, { brand: 'Milka' });

    expect(diffs).toEqual([{ field: 'brand', oldValue: null, newValue: 'Milka' }]);
  });
});
