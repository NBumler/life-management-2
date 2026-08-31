import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonChip } from '@ionic/angular/standalone';

import { ClimbingScale } from '../climbing/climbing-grade-matrix';
import { ClimbingDiscipline, GradeCandidate, GradeParseResult, parseGrade, scalePostfix } from '../climbing/grade-scale';
import { HelpInputComponent } from '../help-input/help-input.component';

const EMPTY_PARSE: GradeParseResult = { status: 'EMPTY', normalized: '', scale: null, absoluteDifficultyIndex: null, candidates: [] };

/**
 * documentation/Subfeatures/Nehézségi szint skálája.md — the shared grade-entry field. Wraps the
 * pure `parseGrade` parser (documentation/Subfeatures/Nehézségi szint skálája (konverziós mátrix).md)
 * with a trailing scale badge (FRA / YDS / UIAA / FONT / V, or `?` for an unrecognised string), an
 * ambiguity chip row (bare `6` → `6a` / `VI`), the scale help modal, and an inline validation note —
 * all composed onto the shared `HelpInputComponent`.
 *
 * The 250 ms debounce (spec §2 "állapotgép") gates the *visual* derivation only (badge / chips /
 * error / `parseChange`); the form value propagates on every keystroke so a parent `save()` gate
 * that re-runs `parseGrade` synchronously stays correct.
 *
 * Dual API on purpose: `ControlValueAccessor` for reactive-form callers (`formControlName`), plus a
 * plain `[value]` / `(valueChange)` pass-through for the signal-based naplo edit rows that don't use
 * Angular forms.
 */
@Component({
  selector: 'app-grade-input',
  templateUrl: 'grade-input.component.html',
  styleUrls: ['grade-input.component.scss'],
  imports: [HelpInputComponent, IonChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GradeInputComponent),
      multi: true,
    },
  ],
})
export class GradeInputComponent implements ControlValueAccessor, OnDestroy {
  @Input({ required: true }) discipline: ClimbingDiscipline = 'BOULDER';
  @Input() label = '';
  @Input() placeholder = '';

  @Input()
  set value(v: string | null) {
    this.applyText(v ?? '', false);
  }

  @Output() readonly valueChange = new EventEmitter<string>();
  /** The debounced parse result — a convenience for parents that would otherwise re-`parseGrade`. */
  @Output() readonly parseChange = new EventEmitter<GradeParseResult>();

  readonly text = signal('');
  readonly disabled = signal(false);
  /** Debounced parse driving the badge / chips / inline error. */
  readonly parsed = signal<GradeParseResult>(EMPTY_PARSE);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.applyText(value ?? '', false);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  onInput(value: string): void {
    this.applyText(value, true);
  }

  onBlur(): void {
    this.onTouched();
    this.flushParse();
  }

  pickCandidate(candidate: GradeCandidate): void {
    this.applyText(candidate.label, true);
    this.flushParse();
  }

  scaleBadge(scale: ClimbingScale): string {
    return scalePostfix(scale);
  }

  get badge(): string | null {
    const result = this.parsed();
    if (result.status === 'VALID' && result.scale !== null) {
      return scalePostfix(result.scale);
    }
    return result.status === 'UNKNOWN' ? '?' : null;
  }

  get errorKey(): string | null {
    switch (this.parsed().status) {
      case 'UNKNOWN':
        return 'SHARED.GRADE_INPUT.ERROR_UNKNOWN';
      case 'AMBIGUOUS':
        return 'SHARED.GRADE_INPUT.ERROR_AMBIGUOUS';
      default:
        return null;
    }
  }

  get helpTextKey(): string {
    return this.discipline === 'BOULDER' ? 'SHARED.GRADE_INPUT.HELP_BOULDER' : 'SHARED.GRADE_INPUT.HELP_ROPE';
  }

  get chips(): readonly GradeCandidate[] {
    const result = this.parsed();
    if (result.status === 'AMBIGUOUS' || (result.status === 'VALID' && result.candidates.length > 1)) {
      return result.candidates;
    }
    return [];
  }

  private applyText(value: string, emit: boolean): void {
    this.text.set(value);
    if (emit) {
      this.onChange(value);
      this.valueChange.emit(value);
      this.scheduleParse();
    } else {
      this.flushParse();
    }
  }

  private scheduleParse(): void {
    this.clearTimer();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushParse();
    }, 250);
  }

  private flushParse(): void {
    this.clearTimer();
    const result = parseGrade(this.text(), this.discipline);
    this.parsed.set(result);
    this.parseChange.emit(result);
  }

  private clearTimer(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
