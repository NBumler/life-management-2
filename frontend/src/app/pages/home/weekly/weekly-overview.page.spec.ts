import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { NutritionSummary, WorkoutsSummary } from '../../../core/data/day-summary';
import { WeeklyOverviewService } from '../../../core/data/weekly-overview.service';
import { OfflineQueueService } from '../../../core/sync/offline-queue.service';
import { SyncEngineService } from '../../../core/sync/sync-engine.service';
import { WeeklyOverviewPage } from './weekly-overview.page';

// documentation/Subfeatures/Heti adatok.md (backlog/233).
function nutritionStub(): NutritionSummary {
  const p = { intake: 0, goal: 0 };
  return { computable: false, incomplete: false, kcal: p, proteinG: p, carbsG: p, fatG: p };
}

function workoutsStub(): WorkoutsSummary {
  const a = { count: 0, kcal: 0 };
  return { steps: { ...a, stepCount: 0 }, workout: a, climbing: a, swim: a, bike: a, volleyball: a, stretch: a, totalKcal: 0 };
}

describe('WeeklyOverviewPage', () => {
  let fixture: ComponentFixture<WeeklyOverviewPage>;
  let isCurrentWeek: ReturnType<typeof signal<boolean>>;
  let week: {
    weekStart: ReturnType<typeof signal<string>>;
    weekEnd: ReturnType<typeof computed<string>>;
    isCurrentWeek: ReturnType<typeof signal<boolean>>;
    countedDays: ReturnType<typeof signal<string[]>>;
    nutrition: ReturnType<typeof signal<NutritionSummary>>;
    workoutsSummary: ReturnType<typeof signal<WorkoutsSummary>>;
    load: jasmine.Spy;
    showCurrentWeek: jasmine.Spy;
    previousWeek: jasmine.Spy;
    nextWeek: jasmine.Spy;
  };

  beforeEach(async () => {
    isCurrentWeek = signal(true);
    week = {
      weekStart: signal('2026-10-19'),
      weekEnd: computed(() => '2026-10-25'),
      isCurrentWeek,
      countedDays: signal(['2026-10-19', '2026-10-20', '2026-10-21']),
      nutrition: signal(nutritionStub()),
      workoutsSummary: signal(workoutsStub()),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      showCurrentWeek: jasmine.createSpy('showCurrentWeek'),
      previousWeek: jasmine.createSpy('previousWeek'),
      nextWeek: jasmine.createSpy('nextWeek'),
    };

    await TestBed.configureTestingModule({
      imports: [WeeklyOverviewPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WeeklyOverviewService, useValue: week },
        { provide: SyncEngineService, useValue: { connectionState: signal('online'), draining: signal(false) } },
        { provide: OfflineQueueService, useValue: { pendingCount: signal(0), errorCount: signal(0) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeeklyOverviewPage);
  });

  it('renders both weekly widgets (tab.kaja is on in features.json)', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.widgets.map((w) => w.key)).toEqual(['week-nutrition', 'week-workouts']);
    expect(host.querySelector('app-today-nutrition-widget')).not.toBeNull();
    expect(host.querySelector('app-today-workouts-widget')).not.toBeNull();
  });

  it('resets to the current week and loads on entry', async () => {
    await fixture.componentInstance.ionViewWillEnter();

    expect(week.showCurrentWeek).toHaveBeenCalledTimes(1);
    expect(week.load).toHaveBeenCalledTimes(1);
  });

  it('current week: next disabled, no "this week" button, days-counted note shown', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect((host.querySelector('ion-button.next-week') as HTMLIonButtonElement).disabled).toBe(true);
    expect(host.querySelector('ion-button.this-week')).toBeNull();
    expect(host.querySelector('.days-counted')?.textContent).toContain('HOME.WEEKLY.DAYS_COUNTED');
  });

  it('past week: "this week" button shown, days-counted note hidden, chevrons step', () => {
    isCurrentWeek.set(false);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('ion-button.this-week')).not.toBeNull();
    expect(host.querySelector('.days-counted')).toBeNull();

    (host.querySelector('ion-button.previous-week') as HTMLElement).click();
    (host.querySelector('ion-button.next-week') as HTMLElement).click();
    (host.querySelector('ion-button.this-week') as HTMLElement).click();
    expect(week.previousWeek).toHaveBeenCalledTimes(1);
    expect(week.nextWeek).toHaveBeenCalledTimes(1);
    expect(week.showCurrentWeek).toHaveBeenCalledTimes(1);
  });
});
