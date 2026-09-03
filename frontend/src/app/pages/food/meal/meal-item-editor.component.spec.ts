import { Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { MealItemEditorComponent } from './meal-item-editor.component';
import { createCustomRow, createFoodRow } from './meal-item-row';

describe('MealItemEditorComponent', () => {
  let fixture: ComponentFixture<MealItemEditorComponent>;
  let component: MealItemEditorComponent;
  let injector: Injector;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealItemEditorComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(MealItemEditorComponent);
    component = fixture.componentInstance;
    injector = TestBed.inject(Injector);
  });

  it('creates', () => {
    component.row = createFoodRow('f1', injector);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('servings stepper', () => {
    it('adjustServings(): steps the multiplier and never goes to zero or below', () => {
      component.row = createFoodRow('f1', injector);

      component.adjustServings(0.5);
      expect(component.row.servings()).toBe(1.5);

      component.adjustServings(-0.5);
      component.adjustServings(-0.5);
      expect(component.row.servings()).toBe(0.5);

      component.adjustServings(-0.5); // would hit 0 — ignored
      expect(component.row.servings()).toBe(0.5);
    });

    it('onServingsInput(): accepts a positive decimal, ignores empty / non-positive / NaN', () => {
      component.row = createFoodRow('f1', injector);

      component.onServingsInput('0.8');
      expect(component.row.servings()).toBe(0.8);

      component.onServingsInput('0');
      component.onServingsInput('-2');
      component.onServingsInput('');
      component.onServingsInput('abc');
      expect(component.row.servings()).toBe(0.8);
    });
  });

  describe('parseOptionalNumber()', () => {
    it('maps blank / unparseable to null and otherwise parses', () => {
      component.row = createCustomRow();
      expect(component.parseOptionalNumber('')).toBeNull();
      expect(component.parseOptionalNumber('not a number')).toBeNull();
      expect(component.parseOptionalNumber('12.5')).toBe(12.5);
      expect(component.parseOptionalNumber('0')).toBe(0);
    });

    it('B-2: rejects a negative value (no negative kcal / macro / price)', () => {
      component.row = createCustomRow();
      expect(component.parseOptionalNumber('-50')).toBeNull();
      expect(component.parseOptionalNumber('-0.1')).toBeNull();
    });
  });

  describe('valid()', () => {
    it('tracks the row completeness as its signals change', () => {
      const row = createCustomRow();
      component.row = row;
      expect(component.valid()).toBeFalse();

      row.displayName.set('Palacsinta');
      row.caloriesKcal.set(300);
      expect(component.valid()).toBeTrue();
    });
  });

  describe('effective()', () => {
    it('recomputes the preview when the servings multiplier changes (CUSTOM row)', () => {
      const row = createCustomRow();
      row.displayName.set('Müzli');
      row.caloriesKcal.set(200);
      component.row = row;

      expect(component.effective().energyKcal).toBe(200);

      row.servings.set(2);
      expect(component.effective().energyKcal).toBe(400);
    });
  });

  it('emits done / cancelled', () => {
    component.row = createFoodRow('f1', injector);
    const doneSpy = jasmine.createSpy('done');
    const cancelledSpy = jasmine.createSpy('cancelled');
    component.done.subscribe(doneSpy);
    component.cancelled.subscribe(cancelledSpy);

    component.done.emit();
    component.cancelled.emit();

    expect(doneSpy).toHaveBeenCalled();
    expect(cancelledSpy).toHaveBeenCalled();
  });
});
