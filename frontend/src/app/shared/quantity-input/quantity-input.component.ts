import { ChangeDetectionStrategy, Component, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AlertController, IonButton, IonIcon, IonInput, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ParsedQuantity, QuantityMode, QuantityParseError, formatQuantityValue, parseQuantityInput } from '../quantity';

/**
 * documentation/Architektúra/Mennyiség mező.md — single free-text input for a `quantity` or
 * `duration` value, parsed into `{amount, unit}`. Mirrors the "password-reveal" pattern for its
 * trailing helper-icon button (a short usage hint), not a real value toggle.
 *
 * Invalid input never commits a partial value to the parent form — the last successfully parsed
 * value (or null) is preserved in the control's value until the text becomes parseable again.
 */
@Component({
  selector: 'app-quantity-input',
  templateUrl: 'quantity-input.component.html',
  imports: [IonInput, IonButton, IonIcon, IonNote, TranslatePipe],
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

  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly text = signal('');
  readonly errorMessage = signal<string | null>(null);
  disabled = signal(false);

  private onChange: (value: ParsedQuantity | null) => void = () => {};
  private onTouched: () => void = () => {};

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
          this.translate.instant(this.mode === 'quantity' ? 'SHARED.QUANTITY_INPUT.ERROR_QUANTITY' : 'SHARED.QUANTITY_INPUT.ERROR_DURATION'),
        );
        return;
      }
      throw error;
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  async showHelp(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('SHARED.QUANTITY_INPUT.HELP_TITLE'),
      message: this.translate.instant(this.mode === 'quantity' ? 'SHARED.QUANTITY_INPUT.HELP_QUANTITY' : 'SHARED.QUANTITY_INPUT.HELP_DURATION'),
      buttons: [this.translate.instant('COMMON.CLOSE')],
    });
    await alert.present();
  }
}
