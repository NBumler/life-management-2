import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutritionProgressBarComponent } from './nutrition-progress-bar.component';

describe('NutritionProgressBarComponent', () => {
  let fixture: ComponentFixture<NutritionProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NutritionProgressBarComponent] }).compileComponents();
    fixture = TestBed.createComponent(NutritionProgressBarComponent);
  });

  function setInputs(overrides: Partial<NutritionProgressBarComponent>): void {
    Object.assign(fixture.componentInstance, { label: 'Kalória', intake: 1200, goal: 2242, unit: 'kcal', color: 'green', statusText: '1042 kcal hátra', ...overrides });
    fixture.detectChanges();
  }

  it('renders label, values, and status text', () => {
    setInputs({});
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kalória');
    expect(text).toContain('1042 kcal hátra');
  });

  it('computes a 0..1 fill ratio from intake/goal', () => {
    setInputs({ intake: 1121, goal: 2242 });
    expect(fixture.componentInstance.ratio).toBeCloseTo(0.5);
  });

  it('clamps the fill ratio at 1 when intake exceeds goal', () => {
    setInputs({ intake: 5000, goal: 2242 });
    expect(fixture.componentInstance.ratio).toBe(1);
  });

  it('exposes the color as a bar-{color} class name', () => {
    setInputs({ color: 'orange' });
    expect(fixture.componentInstance.barClass).toBe('bar-orange');
  });
});
