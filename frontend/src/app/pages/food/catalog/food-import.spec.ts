import { Food } from '../../../api/model/food';
import { parseFoodImportBatch } from './food-import';

/** Builds a 22-column TSV row from a partial override map (defaults to all-empty cells). */
function row(overrides: Record<number, string> = {}): string {
  const cells = new Array(22).fill('');
  for (const [index, value] of Object.entries(overrides)) {
    cells[Number(index)] = value;
  }
  return cells.join('\t');
}

const VALID_ROW = row({ 0: 'Aldi', 1: 'Tej', 4: '350', 5: '1l', 6: '42', 16: '0.1' });

describe('parseFoodImportBatch', () => {
  it('parses a single valid row as new', () => {
    const rows = parseFoodImportBatch(VALID_ROW, []);

    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('new');
    expect(rows[0].food).toEqual(
      jasmine.objectContaining({ name: 'Tej', store: 'Aldi', priceHuf: 350, netAmount: 1, netUnit: 'l', energyKcal: 42 }),
    );
  });

  it('detects and discards a recognized header row', () => {
    const header = row({ 0: 'Üzlet', 1: 'Termék' });
    const rows = parseFoodImportBatch([header, VALID_ROW].join('\n'), []);

    expect(rows.length).toBe(1);
    expect(rows[0].line).toBe(1); // header itself doesn't count as a data line
  });

  it('does not discard a first row that only coincidentally has text in column 1/2', () => {
    const rows = parseFoodImportBatch([row({ 0: 'Spar', 1: 'Kenyér' }), VALID_ROW].join('\n'), []);

    expect(rows.length).toBe(2);
  });

  it('detects a header row via the nutrient-section pattern when it does not start with Üzlet/Termék', () => {
    // documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md "Fejléc": "vagy a sor
    // tartalmazza a 100g / 100ml - energia mintát" — an independent detection path from Üzlet/Termék.
    const header = row({ 6: '100 g / 100 ml - Energia' });
    const rows = parseFoodImportBatch([header, VALID_ROW].join('\n'), []);

    expect(rows.length).toBe(1);
    expect(rows[0].line).toBe(1);
  });

  it('skips blank lines', () => {
    const rows = parseFoodImportBatch(['', VALID_ROW, '   ', VALID_ROW.replace('Tej', 'Kenyér')].join('\n'), []);

    expect(rows.length).toBe(2);
  });

  it('accepts both "." and "," as the decimal separator', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Tej', 4: '350,5' }), []);

    expect(rows[0].food?.priceHuf).toBe(350.5);
  });

  it('treats "-" and a truly empty cell both as "no value"', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Tej', 4: '-' }), []);

    expect(rows[0].food?.priceHuf).toBeNull();
  });

  it('marks a row missing the required product name as invalid', () => {
    const rows = parseFoodImportBatch(row({ 0: 'Aldi' }), []);

    expect(rows[0].status).toBe('invalid');
    expect(rows[0].reason).toBe('MISSING_NAME');
  });

  it('marks a row with an unparseable number as invalid', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Tej', 4: 'abc' }), []);

    expect(rows[0].status).toBe('invalid');
    expect(rows[0].reason).toBe('INVALID_NUMBER');
  });

  it('marks a row with an unparseable net amount as invalid', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Tej', 5: 'a lot' }), []);

    expect(rows[0].status).toBe('invalid');
    expect(rows[0].reason).toBe('INVALID_NET_AMOUNT');
  });

  it('marks a row with the wrong column count as invalid', () => {
    const rows = parseFoodImportBatch('Aldi\tTej\tNestlé', []);

    expect(rows[0].status).toBe('invalid');
    expect(rows[0].reason).toBe('COLUMN_COUNT');
  });

  it('documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md: computes sodium/chloride from salt when the row left them empty', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Só', 16: '2.5' }), []);

    expect(rows[0].food?.sodiumG).toBe(1);
    expect(rows[0].food?.chlorideG).toBe(1.5);
  });

  it('keeps the pasted sodium/chloride values when the row filled them in itself', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Só', 16: '2.5', 17: '0.5', 18: '2' }), []);

    expect(rows[0].food?.sodiumG).toBe(0.5);
    expect(rows[0].food?.chlorideG).toBe(2);
  });

  it('reads the three shelf-life columns as days', () => {
    const rows = parseFoodImportBatch(row({ 1: 'Tej', 19: '3', 20: '7', 21: '90' }), []);

    expect(rows[0].food).toEqual(
      jasmine.objectContaining({
        shelfRoomAmount: 3,
        shelfRoomUnit: 'nap',
        shelfFridgeAmount: 7,
        shelfFridgeUnit: 'nap',
        shelfFreezerAmount: 90,
        shelfFreezerUnit: 'nap',
      }),
    );
  });

  it('marks a duplicate of an existing catalog item', () => {
    const existing: Food = { id: 'e1', name: 'Tej', store: 'Aldi', priceHuf: 350, deleted: false };
    const rows = parseFoodImportBatch(row({ 0: 'Aldi', 1: 'Tej', 4: '350' }), [existing]);

    expect(rows[0].status).toBe('duplicate');
  });

  it('marks the second of two identical pasted rows as a batch-internal duplicate', () => {
    const rows = parseFoodImportBatch([VALID_ROW, VALID_ROW].join('\n'), []);

    expect(rows.map((r) => r.status)).toEqual(['new', 'duplicate']);
  });

  it('allows a partial match (same name, different store) as new', () => {
    const existing: Food = { id: 'e1', name: 'Tej', store: 'Aldi', deleted: false };
    const rows = parseFoodImportBatch(row({ 0: 'Lidl', 1: 'Tej' }), [existing]);

    expect(rows[0].status).toBe('new');
  });
});
