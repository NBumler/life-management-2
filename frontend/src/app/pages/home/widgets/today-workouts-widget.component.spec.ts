import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { TodayWorkoutsService, TodayWorkoutsSummary } from '../../../core/data/today-workouts.service';
import { TodayWorkoutsWidgetComponent } from './today-workouts-widget.component';

const ZERO = { count: 0, kcal: 0 };

function summaryWith(overrides: Partial<TodayWorkoutsSummary> = {}): TodayWorkoutsSummary {
  return {
    steps: { ...ZERO, stepCount: 0 },
    workout: ZERO,
    climbing: ZERO,
    swim: ZERO,
    bike: ZERO,
    totalKcal: 0,
    ...overrides,
  };
}

describe('TodayWorkoutsWidgetComponent', () => {
  async function setup(
    summary: TodayWorkoutsSummary,
    isEnabled: (key: string) => boolean = () => true,
  ): Promise<ComponentFixture<TodayWorkoutsWidgetComponent>> {
    await TestBed.configureTestingModule({
      imports: [TodayWorkoutsWidgetComponent],
      providers: [
        provideTranslateService(),
        { provide: FeatureFlagsService, useValue: { isEnabled } },
        { provide: TodayWorkoutsService, useValue: { summary: signal(summary) } },
      ],
    }).compileComponents();
    return TestBed.createComponent(TodayWorkoutsWidgetComponent);
  }

  it('renders nothing when no row flag qualifies', async () => {
    const fixture = await setup(summaryWith(), () => false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('ion-card')).toBeNull();
  });

  it('shows the empty-state note when flags are on but nothing was logged today', async () => {
    const fixture = await setup(summaryWith());
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('ion-card')).not.toBeNull();
    expect(host.querySelectorAll('.workout-row').length).toBe(0);
    // provideTranslateService() loads no translations in tests; TranslatePipe falls back to the raw key.
    expect(host.querySelector('ion-note')?.textContent).toContain('HOME.WORKOUTS.EMPTY');
  });

  it('shows only the activities with today data, plus the combined total', async () => {
    const fixture = await setup(
      summaryWith({
        steps: { count: 1, stepCount: 8500, kcal: 12.3 },
        climbing: { count: 2, kcal: 300 },
        totalKcal: 312.3,
      }),
    );
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const rows = host.querySelectorAll('.workout-row');
    // 2 data rows + 1 total row
    expect(rows.length).toBe(3);
    expect(fixture.componentInstance.rows().map((r) => r.key)).toEqual(['steps', 'climbing']);
    expect(host.querySelector('.workout-total')?.textContent).toContain('312');
  });

  it('drops a row whose flag is off even if it has today data', async () => {
    const fixture = await setup(
      summaryWith({ swim: { count: 1, kcal: 50 } }),
      (key) => key !== 'edzes.uszas',
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.rows().length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('ion-note')).not.toBeNull();
  });
});
