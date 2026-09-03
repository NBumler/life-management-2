import { ChangeDetectionStrategy, Component, Input, computed, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonChip } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { HelpInputComponent } from '../help-input/help-input.component';
import { ParsedQuantity, QuantityMode, QuantityParseError, formatQuantityValue, parseQuantityInput } from '../quantity';

/**
 * documentation/Architektúra/Mennyiség mező.md — single free-text input for a `quantity` or
 * `duration` value, parsed into `{amount, unit}`. Composes the shared `HelpInputComponent` for the
 * trailing helper-icon button (a short usage hint) and the inline error note.
 *
 * Invalid input never commits a partial value to the parent form — the last successfully parsed
 * value (or null) is preserved in the control's value until the text becomes parseable again.
 *
 * `unitChips` (opt-in) renders a quick-pick unit row under the field via `HelpInputComponent`'s
 * `[chips]` slot — a shortcut that rewrites the current value's unit, keeping the typed amount. The
 * free-text field stays the source of truth; the chips never restrict what can be typed.
 */
@Component({
  selector: 'app-quantity-input',
  templateUrl: 'quantity-input.component.html',
  styleUrls: ['quantity-input.component.scss'],
  imports: [HelpInputComponent, IonChip, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuantityInputComponent),
      multi: true,
    },
  ],
})
export class QuantityInputComponent implements ControlValueAccessor {
  @Input() mode: QuantityMode = 'quantity';
  @Input() label = '';
  /** Literal placeholder override; when empty, a mode-appropriate example hint is shown instead. */
  @Input() placeholder = '';
  /** Quick-pick units shown as chips under the field; empty (default) hides the row entirely. */
  @Input() unitChips: string[] = [];

  readonly text = signal('');
  /** i18n key of the current inline error, or `null`. */
  readonly errorMessage = signal<string | null>(null);
  disabled = signal(false);

  private onChange: (value: ParsedQuantity | null) => void = () => {};
  private onTouched: () => void = () => {};

  get helpTextKey(): string {
    return this.mode === 'quantity' ? 'SHARED.QUANTITY_INPUT.HELP_QUANTITY' : 'SHARED.QUANTITY_INPUT.HELP_DURATION';
  }

  get placeholderKey(): string {
    return this.mode === 'quantity'
      ? 'SHARED.QUANTITY_INPUT.PLACEHOLDER_QUANTITY'
      : 'SHARED.QUANTITY_INPUT.PLACEHOLDER_DURATION';
  }

  writeValue(value: ParsedQuantity | null): void {
    this.text.set(value === null ? '' : formatQuantityValue(value));
    this.errorMessage.set(null);
  }

  registerOnChange(fn: (value: ParsedQuantity | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(value: string): void {
    this.text.set(value);
    try {
      const parsed = parseQuantityInput(value, this.mode);
      this.errorMessage.set(null);
      this.onChange(parsed);
    } catch (error) {
      if (error instanceof QuantityParseError) {
        this.errorMessage.set(
          this.mode === 'quantity' ? 'SHARED.QUANTITY_INPUT.ERROR_QUANTITY' : 'SHARED.QUANTITY_INPUT.ERROR_DURATION',
        );
        return;
      }
      throw error;
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  /**
   * The unit of the currently parsed value, or `null` — used to highlight the matching chip.
   * A `computed` off `text()` (not a per-change-detection method call); `mode` is set once and never
   * changes after construction.
   */
  readonly activeUnit = computed<string | null>(() => {
    try {
      return parseQuantityInput(this.text(), this.mode).unit;
    } catch {
      return null;
    }
  });

  /** Chip tap: keep the amount already typed (or default to 1), swap in the chosen unit. */
  pickUnit(unit: string): void {
    if (this.disabled()) {
      return;
    }
    let amount: number | null = null;
    try {
      amount = parseQuantityInput(this.text(), this.mode).amount;
    } catch {
      amount = null;
    }
    const nextAmount = amount ?? 1;
    const nextText = `${nextAmount}${unit}`;
    this.text.set(nextText);
    this.errorMessage.set(null);
    // Emit the canonical parse of the exact text now shown, not a hand-built object — so the emitted
    // value can never drift from the field if a chip label ever differs from the parser's unit token.
    try {
      this.onChange(parseQuantityInput(nextText, this.mode));
    } catch {
      this.onChange({ amount: nextAmount, unit } as ParsedQuantity);
    }
    this.onTouched();
  }
}
