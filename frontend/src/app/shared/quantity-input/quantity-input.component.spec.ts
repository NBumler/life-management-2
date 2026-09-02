import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { ParsedQuantity } from '../quantity';
import { QuantityInputComponent } from './quantity-input.component';

describe('QuantityInputComponent', () => {
  let fixture: ComponentFixture<QuantityInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuantityInputComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(QuantityInputComponent);
    fixture.detectChanges();
  });

  it('creates and renders without throwing', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('writeValue() formats an existing value into the canonical no-space display form', () => {
    fixture.componentInstance.writeValue({ amount: 120, unit: 'dkg' });
    expect(fixture.componentInstance.text()).toBe('120dkg');
  });

  it('writeValue(null) clears the input', () => {
    fixture.componentInstance.writeValue({ amount: 1, unit: 'l' });
    fixture.componentInstance.writeValue(null);
    expect(fixture.componentInstance.text()).toBe('');
  });

  it('onInput() with valid quantity text propagates the parsed value and clears any error', () => {
    const changes: (ParsedQuantity | null)[] = [];
    fixture.componentInstance.registerOnChange((value) => changes.push(value));

    fixture.componentInstance.onInput('1.5kg');

    expect(changes).toEqual([{ amount: 1.5, unit: 'kg' }]);
    expect(fixture.componentInstance.errorMessage()).toBeNull();
  });

  it('onInput() with unparseable text sets an error and does not propagate a value', () => {
    const changes: (ParsedQuantity | null)[] = [];
    fixture.componentInstance.registerOnChange((value) => changes.push(value));

    fixture.componentInstance.onInput('not a quantity');

    expect(changes).toEqual([]);
    expect(fixture.componentInstance.errorMessage()).not.toBeNull();
  });

  it('onInput() rejects a duration unit while in quantity mode (default)', () => {
    const changes: (ParsedQuantity | null)[] = [];
    fixture.componentInstance.registerOnChange((value) => changes.push(value));

    fixture.componentInstance.onInput('5nap');

    expect(changes).toEqual([]);
    expect(fixture.componentInstance.errorMessage()).not.toBeNull();
  });

  it('onInput() parses duration units when mode is "duration"', () => {
    fixture.componentInstance.mode = 'duration';
    const changes: (ParsedQuantity | null)[] = [];
    fixture.componentInstance.registerOnChange((value) => changes.push(value));

    fixture.componentInstance.onInput('14nap');

    expect(changes).toEqual([{ amount: 14, unit: 'nap' }]);
  });

  it('onInput() with empty text propagates the "no value" state', () => {
    const changes: (ParsedQuantity | null)[] = [];
    fixture.componentInstance.registerOnChange((value) => changes.push(value));

    fixture.componentInstance.onInput('');

    expect(changes).toEqual([{ amount: null, unit: null }]);
    expect(fixture.componentInstance.errorMessage()).toBeNull();
  });

  it('onBlur() calls the registered onTouched callback', () => {
    let touched = false;
    fixture.componentInstance.registerOnTouched(() => (touched = true));

    fixture.componentInstance.onBlur();

    expect(touched).toBe(true);
  });

  it('setDisabledState() updates the disabled signal', () => {
    fixture.componentInstance.setDisabledState(true);
    expect(fixture.componentInstance.disabled()).toBe(true);
  });

  it('onInput() error and helpTextKey track the mode', () => {
    expect(fixture.componentInstance.helpTextKey).toBe('SHARED.QUANTITY_INPUT.HELP_QUANTITY');

    fixture.componentInstance.onInput('not a quantity');
    expect(fixture.componentInstance.errorMessage()).toBe('SHARED.QUANTITY_INPUT.ERROR_QUANTITY');

    fixture.componentInstance.mode = 'duration';
    expect(fixture.componentInstance.helpTextKey).toBe('SHARED.QUANTITY_INPUT.HELP_DURATION');
    fixture.componentInstance.onInput('not a duration');
    expect(fixture.componentInstance.errorMessage()).toBe('SHARED.QUANTITY_INPUT.ERROR_DURATION');
  });

  it('renders the composed help-input shell', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('app-help-input')).not.toBeNull();
  });

  describe('unit chips', () => {
    it('pickUnit() keeps a typed amount and swaps the unit, emitting the parsed value', () => {
      const changes: (ParsedQuantity | null)[] = [];
      fixture.componentInstance.registerOnChange((value) => changes.push(value));
      fixture.componentInstance.onInput('120g');

      fixture.componentInstance.pickUnit('dkg');

      expect(fixture.componentInstance.text()).toBe('120dkg');
      expect(changes[changes.length - 1]).toEqual({ amount: 120, unit: 'dkg' });
      expect(fixture.componentInstance.errorMessage()).toBeNull();
    });

    it('pickUnit() defaults the amount to 1 when the field is empty or unparseable', () => {
      fixture.componentInstance.onInput('nonsense');

      fixture.componentInstance.pickUnit('ml');

      expect(fixture.componentInstance.text()).toBe('1ml');
    });

    it('pickUnit() is a no-op while disabled', () => {
      fixture.componentInstance.onInput('2l');
      fixture.componentInstance.setDisabledState(true);

      fixture.componentInstance.pickUnit('dl');

      expect(fixture.componentInstance.text()).toBe('2l');
    });

    it('activeUnit() reports the current parsed unit for chip highlighting', () => {
      expect(fixture.componentInstance.activeUnit()).toBeNull();
      fixture.componentInstance.onInput('3db');
      expect(fixture.componentInstance.activeUnit()).toBe('db');
    });
  });
});
