import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { TodayNutritionService, TodayNutritionSummary } from '../../../core/data/today-nutrition.service';
import { TodayNutritionWidgetComponent } from './today-nutrition-widget.component';

function computable(overrides: Partial<TodayNutritionSummary> = {}): TodayNutritionSummary {
  return {
    computable: true,
    incomplete: false,
    kcal: { intake: 1200, goal: 2000 },
    proteinG: { intake: 60, goal: 150 },
    carbsG: { intake: 100, goal: 200 },
    fatG: { intake: 40, goal: 70 },
    ...overrides,
  };
}

describe('TodayNutritionWidgetComponent', () => {
  let summary: ReturnType<typeof signal<TodayNutritionSummary>>;

  async function setup(initial: TodayNutritionSummary): Promise<ComponentFixture<TodayNutritionWidgetComponent>> {
    summary = signal(initial);
    await TestBed.configureTestingModule({
      imports: [TodayNutritionWidgetComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: TodayNutritionService, useValue: { summary } },
      ],
    }).compileComponents();
    return TestBed.createComponent(TodayNutritionWidgetComponent);
  }

  it('renders a row per nutrient with an intake/goal figure when computable', async () => {
    const fixture = await setup(computable());
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.nutrient-row');
    expect(rows.length).toBe(4);
    expect(rows[0].textContent).toContain('kcal');
    expect(fixture.componentInstance.rows()[0]).toEqual(
      jasmine.objectContaining({ labelKey: 'HOME.NUTRITION.CALORIES', intake: 1200, goal: 2000, remaining: 800, unit: 'kcal' }),
    );
    expect(fixture.componentInstance.rows()[1].remaining).toBe(90);
  });

  it('never shows negative remaining once the goal is passed', async () => {
    const fixture = await setup(computable({ kcal: { intake: 2500, goal: 2000 } }));
    fixture.detectChanges();

    expect(fixture.componentInstance.rows()[0].remaining).toBe(0);
  });

  it('shows a profile link instead of numbers when not computable', async () => {
    const fixture = await setup({
      computable: false,
      incomplete: false,
      kcal: { intake: 0, goal: 0 },
      proteinG: { intake: 0, goal: 0 },
      carbsG: { intake: 0, goal: 0 },
      fatG: { intake: 0, goal: 0 },
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.nutrient-row').length).toBe(0);
    expect(host.querySelector('ion-button[routerLink="/tabs/menu/profile"]')).not.toBeNull();
  });
});
