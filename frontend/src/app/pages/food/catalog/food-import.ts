import { Food } from '../../../api/model/food';
import { isDuplicateFood } from '../../../core/data/food.repository';
import { QuantityParseError, parseQuantityInput } from '../../../shared/quantity';
import { matchesSearch } from '../../../shared/text-search';
import { chlorideFromSaltAndSodium, sodiumFromSalt } from './salt-sodium-chloride';

/**
 * documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md "Oszlopok": fixed 22-column
 * TSV schema, same order as documentation/Subfeatures/Élelmiszer manuális bevitele.md's nutrient
 * section for columns 7-19. Barcode and "after opening" shelf-life have no column in this format.
 */
const COLUMN_COUNT = 22;

export type ImportRowStatus = 'new' | 'duplicate' | 'invalid';

export interface ImportRow {
  /** 1-based position among data rows (header, if any, is not counted). */
  line: number;
  status: ImportRowStatus;
  /** Set only for 'invalid' — a translation key suffix, see FOOD.IMPORT.INVALID_* in the i18n files. */
  reason?: string;
  /** The product name as typed in the row, for display — even for invalid rows missing other fields. */
  name: string;
  /** Present for 'new' and 'duplicate' — the fully-parsed candidate. */
  food?: Food;
}

/**
 * documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md "Fejléc": presence check only —
 * a real header row is discarded whole, never used to reorder columns (the schema is positional).
 * Two independent patterns count, per spec ("vagy"): the first two columns read Üzlet/Termék, or any
 * cell carries the nutrient section's header text ("100g / 100ml - energia") — a header pasted
 * without the leading Üzlet/Termék columns still needs to be recognized.
 */
function looksLikeHeaderRow(cells: string[]): boolean {
  if (cells.length >= 2 && matchesSearch('üzlet', cells[0]) && matchesSearch('termék', cells[1])) {
    return true;
  }
  return cells.some(isNutrientSectionHeaderCell);
}

function isNutrientSectionHeaderCell(cell: string): boolean {
  const compact = cell.replace(/\s+/g, '');
  return matchesSearch('100g', compact) && matchesSearch('100ml', compact) && matchesSearch('energia', compact);
}

/** documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md "Formátum": `-` and a truly empty cell both mean "no value". */
function cellValue(cells: string[], index: number): string {
  const raw = (cells[index] ?? '').trim();
  return raw === '-' ? '' : raw;
}

/** Accepts both `.` and `,` as the decimal separator; returns `null` for an empty cell, `NaN` for anything unparseable. */
function parseNumberCell(cells: string[], index: number): number | null {
  const raw = cellValue(cells, index);
  if (raw === '') {
    return null;
  }
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
}

function parseQuantityCell(cells: string[], index: number): { amount: number | null; unit: string | null } | 'invalid' {
  const raw = cellValue(cells, index);
  if (raw === '') {
    return { amount: null, unit: null };
  }
  try {
    return parseQuantityInput(raw, 'quantity');
  } catch (error) {
    if (error instanceof QuantityParseError) {
      return 'invalid';
    }
    throw error;
  }
}

/** documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md col 20-22: days only, never a full duration string. */
function parseShelfDaysCell(cells: string[], index: number): number | null | 'invalid' {
  const value = parseNumberCell(cells, index);
  return Number.isNaN(value) ? 'invalid' : value;
}

interface ParsedRowOrError {
  food?: Food;
  reason?: string;
}

function parseDataRow(cells: string[]): ParsedRowOrError {
  const name = cellValue(cells, 1);
  if (name === '') {
    return { reason: 'MISSING_NAME' };
  }

  const priceHuf = parseNumberCell(cells, 4);
  if (Number.isNaN(priceHuf)) {
    return { reason: 'INVALID_NUMBER' };
  }
  const netQuantity = parseQuantityCell(cells, 5);
  if (netQuantity === 'invalid') {
    return { reason: 'INVALID_NET_AMOUNT' };
  }

  const nutrientIndexes = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
  const nutrients = nutrientIndexes.map((index) => parseNumberCell(cells, index));
  if (nutrients.some((value) => Number.isNaN(value))) {
    return { reason: 'INVALID_NUMBER' };
  }
  const [energyKcal, fatG, fatSaturatedG, fatUnsaturatedG, fatTransG, carbsG, carbsSugarsG, carbsComplexG, carbsFiberG, proteinG, saltG] =
    nutrients;
  let sodiumG = nutrients[11];
  let chlorideG = nutrients[12];

  // documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md "Só → nátrium / klorid": same
  // auto-calc as the manual form, applied only to cells the pasted row left empty.
  if (saltG !== null) {
    if (sodiumG === null) {
      sodiumG = sodiumFromSalt(saltG);
    }
    if (chlorideG === null) {
      chlorideG = chlorideFromSaltAndSodium(saltG, sodiumG);
    }
  }

  const shelfRoomDays = parseShelfDaysCell(cells, 19);
  const shelfFridgeDays = parseShelfDaysCell(cells, 20);
  const shelfFreezerDays = parseShelfDaysCell(cells, 21);
  if (shelfRoomDays === 'invalid' || shelfFridgeDays === 'invalid' || shelfFreezerDays === 'invalid') {
    return { reason: 'INVALID_NUMBER' };
  }

  const food: Food = {
    id: '',
    name,
    store: cellValue(cells, 0) || null,
    brand: cellValue(cells, 2) || null,
    barcode: null,
    note: cellValue(cells, 3) || null,
    priceHuf,
    netAmount: netQuantity.amount,
    netUnit: netQuantity.unit,
    energyKcal,
    fatG,
    fatSaturatedG,
    fatUnsaturatedG,
    fatTransG,
    carbsG,
    carbsSugarsG,
    carbsComplexG,
    carbsFiberG,
    proteinG,
    saltG,
    sodiumG,
    chlorideG,
    shelfRoomAmount: shelfRoomDays,
    shelfRoomUnit: shelfRoomDays === null ? null : 'nap',
    shelfFridgeAmount: shelfFridgeDays,
    shelfFridgeUnit: shelfFridgeDays === null ? null : 'nap',
    shelfFreezerAmount: shelfFreezerDays,
    shelfFreezerUnit: shelfFreezerDays === null ? null : 'nap',
    shelfAfterOpeningAmount: null,
    shelfAfterOpeningUnit: null,
    deleted: false,
  };
  return { food };
}

/**
 * documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md — classifies every pasted row
 * as new / duplicate / invalid. Duplicate-checks against both the existing live catalog and every
 * valid row already accepted earlier in this same paste (top to bottom).
 */
export function parseFoodImportBatch(text: string, existingFoods: Food[]): ImportRow[] {
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return [];
  }

  const firstCells = lines[0].split('\t');
  const dataLines = looksLikeHeaderRow(firstCells) ? lines.slice(1) : lines;

  const rows: ImportRow[] = [];
  const acceptedInBatch: Food[] = [];

  dataLines.forEach((line, index) => {
    const cells = line.split('\t');
    if (cells.length !== COLUMN_COUNT) {
      rows.push({ line: index + 1, status: 'invalid', reason: 'COLUMN_COUNT', name: cellValue(cells, 1) });
      return;
    }

    const parsed = parseDataRow(cells);
    if (parsed.food === undefined) {
      rows.push({ line: index + 1, status: 'invalid', reason: parsed.reason, name: cellValue(cells, 1) });
      return;
    }

    const isDuplicate =
      existingFoods.some((existing) => isDuplicateFood(existing, parsed.food!)) ||
      acceptedInBatch.some((accepted) => isDuplicateFood(accepted, parsed.food!));
    if (isDuplicate) {
      rows.push({ line: index + 1, status: 'duplicate', name: parsed.food.name, food: parsed.food });
      return;
    }

    acceptedInBatch.push(parsed.food);
    rows.push({ line: index + 1, status: 'new', name: parsed.food.name, food: parsed.food });
  });

  return rows;
}
