import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { GradeParseResult } from '../climbing/grade-scale';

import { GradeInputComponent } from './grade-input.component';

describe('GradeInputComponent', () => {
  let fixture: ComponentFixture<GradeInputComponent>;
  let component: GradeInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradeInputComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(GradeInputComponent);
    component = fixture.componentInstance;
    component.discipline = 'BOULDER';
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue() parses synchronously (no debounce on programmatic set)', () => {
    component.writeValue('6A');
    expect(component.text()).toBe('6A');
    expect(component.parsed().status).toBe('VALID');
    expect(component.badge).toBe('FONT');
  });

  it('onChange fires on every keystroke but the visual parse is debounced 250 ms', fakeAsync(() => {
    const changes: string[] = [];
    component.registerOnChange((v) => changes.push(v));

    component.onInput('7');
    expect(changes).toEqual(['7']); // value propagates immediately
    expect(component.parsed().status).toBe('EMPTY'); // visual not yet updated

    tick(250);
    expect(component.parsed().status).toBe('AMBIGUOUS'); // bare 7 needs a letter
  }));

  it('shows a "?" badge and an UNKNOWN error for an unrecognised string', fakeAsync(() => {
    component.onInput('nope');
    tick(250);
    expect(component.badge).toBe('?');
    expect(component.errorKey).toBe('SHARED.GRADE_INPUT.ERROR_UNKNOWN');
    expect(component.chips.length).toBe(0);
  }));

  it('offers ambiguity chips for a bare rope number and resolves on pick', fakeAsync(() => {
    component.discipline = 'ROPE';
    component.onInput('6');
    tick(250);

    expect(component.errorKey).toBe('SHARED.GRADE_INPUT.ERROR_AMBIGUOUS');
    expect(component.chips.map((c) => c.label)).toEqual(['6a', 'VI']);

    component.pickCandidate(component.chips[0]);
    expect(component.text()).toBe('6a');
    expect(component.parsed().status).toBe('VALID');
    expect(component.badge).toBe('FRA');
    expect(component.chips.length).toBe(0);
  }));

  it('emits parseChange with the debounced result and via [value]', fakeAsync(() => {
    const results: GradeParseResult[] = [];
    component.parseChange.subscribe((r) => results.push(r));

    component.value = 'V5';
    expect(results[results.length - 1]?.status).toBe('VALID'); // [value] set → synchronous flush
    expect(component.badge).toBe('V');
  }));

  it('helpTextKey follows the discipline', () => {
    component.discipline = 'BOULDER';
    expect(component.helpTextKey).toBe('SHARED.GRADE_INPUT.HELP_BOULDER');
    component.discipline = 'ROPE';
    expect(component.helpTextKey).toBe('SHARED.GRADE_INPUT.HELP_ROPE');
  });

  it('setDisabledState() toggles the disabled signal', () => {
    component.setDisabledState(true);
    expect(component.disabled()).toBe(true);
  });
});
