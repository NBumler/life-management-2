import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { ASPECTS, Aspect, aspectFullKey, aspectShortKey } from '../aspect';

/**
 * backlog/068 — the visual "fekvés" (aspect) picker: the eight compass points laid out on the
 * perimeter of a 3×3 square, N at the top. One tap selects a direction; tapping the selected one
 * again clears it back to "unknown" (`null`). The centre cell echoes the current choice.
 *
 * Guidebooks give the aspect straight as a compass point, so this is the primary input; a
 * degrees-from-a-phone-compass reading is binned to the same enum by `degreesToAspect` in
 * `../aspect.ts` (not wired into this component — callers convert before setting the value).
 *
 * Dual API, like `GradeInputComponent`: a `ControlValueAccessor` for `formControlName` callers plus
 * a plain `[value]` / `(valueChange)` pass-through.
 */
@Component({
  selector: 'app-aspect-picker',
  templateUrl: 'aspect-picker.component.html',
  styleUrls: ['aspect-picker.component.scss'],
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AspectPickerComponent),
      multi: true,
    },
  ],
})
export class AspectPickerComponent implements ControlValueAccessor {
  @Input() label = '';

  @Input()
  set value(v: Aspect | null) {
    this.selected.set(v);
  }

  @Output() readonly valueChange = new EventEmitter<Aspect | null>();

  /** Grid order: NW N NE / W · E / SW S SE — a plain list the template renders into fixed cells. */
  protected readonly directions = ASPECTS;
  protected readonly selected = signal<Aspect | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: Aspect | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: Aspect | null): void {
    this.selected.set(value ?? null);
  }

  registerOnChange(fn: (value: Aspect | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected shortKey(aspect: Aspect): string {
    return aspectShortKey(aspect);
  }

  protected fullKey(aspect: Aspect): string {
    return aspectFullKey(aspect);
  }

  protected selectedFullKey(): string | null {
    const current = this.selected();
    return current === null ? null : aspectFullKey(current);
  }

  protected pick(aspect: Aspect): void {
    if (this.disabled()) {
      return;
    }
    const next = this.selected() === aspect ? null : aspect;
    this.selected.set(next);
    this.onChange(next);
    this.onTouched();
    this.valueChange.emit(next);
  }
}
