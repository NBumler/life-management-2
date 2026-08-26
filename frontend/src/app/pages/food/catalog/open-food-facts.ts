import { Food } from '../../../api/model/food';
import { QuantityParseError, parseQuantityInput } from '../../../shared/quantity';

/**
 * documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md + Élelmiszer manuális bevitele.md
 * "Vonalkód sync gomb": Open Food Facts is called directly from the client, no backend proxy.
 */
const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

export interface OpenFoodFactsNutriments {
  'energy-kcal_100g'?: number;
  fat_100g?: number;
  'saturated-fat_100g'?: number;
  'trans-fat_100g'?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;
}

export interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  quantity?: string;
  nutriments?: OpenFoodFactsNutriments;
}

export interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

export function buildOpenFoodFactsUrl(barcode: string): string {
  return `${OFF_BASE_URL}/${encodeURIComponent(barcode)}.json`;
}

/** Every field is optional — only what OFF actually mapped, per documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md "mappelhető mezők". */
export type OpenFoodFactsMappedFields = Partial<
  Pick<
    Food,
    | 'name'
    | 'brand'
    | 'netAmount'
    | 'netUnit'
    | 'energyKcal'
    | 'fatG'
    | 'fatSaturatedG'
    | 'fatUnsaturatedG'
    | 'fatTransG'
    | 'carbsG'
    | 'carbsSugarsG'
    | 'carbsComplexG'
    | 'carbsFiberG'
    | 'proteinG'
    | 'saltG'
    | 'sodiumG'
  >
>;

/**
 * documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md: only fields OFF actually gives (or
 * can be cleanly derived) are mapped — chloride and shelf-life have no OFF equivalent, and remain
 * for the user / the form's own salt auto-calc.
 */
export function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct): OpenFoodFactsMappedFields {
  const n = product.nutriments ?? {};
  const mapped: OpenFoodFactsMappedFields = {};

  if (product.product_name) {
    mapped.name = product.product_name;
  }
  if (product.brands) {
    mapped.brand = product.brands.split(',')[0].trim();
  }
  if (product.quantity) {
    try {
      const parsed = parseQuantityInput(product.quantity.replace(/\s+/g, ''), 'quantity');
      if (parsed.amount !== null) {
        mapped.netAmount = parsed.amount;
        mapped.netUnit = parsed.unit;
      }
    } catch (error) {
      if (!(error instanceof QuantityParseError)) {
        throw error;
      }
      // Unparseable free-text quantity (e.g. "6x25cl") — left for the user to fill in manually.
    }
  }

  if (n['energy-kcal_100g'] !== undefined) {
    mapped.energyKcal = n['energy-kcal_100g'];
  }
  const fatG = n.fat_100g;
  const fatSaturatedG = n['saturated-fat_100g'];
  const fatTransG = n['trans-fat_100g'];
  if (fatG !== undefined) {
    mapped.fatG = fatG;
  }
  if (fatSaturatedG !== undefined) {
    mapped.fatSaturatedG = fatSaturatedG;
  }
  if (fatTransG !== undefined) {
    mapped.fatTransG = fatTransG;
  }
  if (fatG !== undefined && fatSaturatedG !== undefined) {
    // OFF has no direct "unsaturated fat" figure; derive it (transG defaults to 0 when OFF omits it).
    mapped.fatUnsaturatedG = Math.max(0, fatG - fatSaturatedG - (fatTransG ?? 0));
  }

  const carbsG = n.carbohydrates_100g;
  const carbsSugarsG = n.sugars_100g;
  if (carbsG !== undefined) {
    mapped.carbsG = carbsG;
  }
  if (carbsSugarsG !== undefined) {
    mapped.carbsSugarsG = carbsSugarsG;
  }
  if (n.fiber_100g !== undefined) {
    mapped.carbsFiberG = n.fiber_100g;
  }
  if (carbsG !== undefined && carbsSugarsG !== undefined) {
    // documentation/Subfeatures/Élelmiszer manuális bevitele.md field order: "complex" is carbs minus sugars.
    mapped.carbsComplexG = Math.max(0, carbsG - carbsSugarsG);
  }
  if (n.proteins_100g !== undefined) {
    mapped.proteinG = n.proteins_100g;
  }
  if (n.salt_100g !== undefined) {
    mapped.saltG = n.salt_100g;
  }
  if (n.sodium_100g !== undefined) {
    mapped.sodiumG = n.sodium_100g;
  }

  return mapped;
}

export interface OpenFoodFactsFieldDiff {
  field: keyof OpenFoodFactsMappedFields;
  oldValue: string | number | null;
  newValue: string | number;
}

/**
 * documentation/Subfeatures/Élelmiszer manuális bevitele.md "Vonalkód sync gomb": fields where OFF's
 * value differs from the form's current value — "azonos értékek kihagyva" (identical fields are
 * skipped, so the confirm dialog only lists what would actually change).
 */
export function computeOffDiff(current: Partial<Food>, incoming: OpenFoodFactsMappedFields): OpenFoodFactsFieldDiff[] {
  const diffs: OpenFoodFactsFieldDiff[] = [];
  for (const [field, newValue] of Object.entries(incoming) as [keyof OpenFoodFactsMappedFields, string | number][]) {
    if (newValue === undefined) {
      continue;
    }
    const oldValue = (current[field] ?? null) as string | number | null;
    if (oldValue !== newValue) {
      diffs.push({ field, oldValue, newValue });
    }
  }
  return diffs;
}
