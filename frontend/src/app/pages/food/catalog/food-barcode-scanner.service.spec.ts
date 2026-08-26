import { Barcode } from '@capacitor-mlkit/barcode-scanning';

import { pickBarcodeValue } from './food-barcode-scanner.service';

function barcode(overrides: Partial<Barcode> = {}): Barcode {
  return { format: 'EAN_13' as never, valueType: 'TEXT' as never, displayValue: '', ...overrides };
}

describe('pickBarcodeValue', () => {
  it('prefers rawValue over displayValue', () => {
    expect(pickBarcodeValue([barcode({ rawValue: '5901234123457', displayValue: 'formatted' })])).toBe('5901234123457');
  });

  it('falls back to displayValue when rawValue is absent', () => {
    expect(pickBarcodeValue([barcode({ displayValue: '5901234123457' })])).toBe('5901234123457');
  });

  it('returns null when no barcode was detected', () => {
    expect(pickBarcodeValue([])).toBeNull();
  });
});
