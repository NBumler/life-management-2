import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { TodayNutritionService, TodayNutritionSummary } from '../../core/data/today-nutrition.service';
import { TodayWorkoutsService, TodayWorkoutsSummary } from '../../core/data/today-workouts.service';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { SyncEngineService } from '../../core/sync/sync-engine.service';
import { HomePage } from './home.page';

// documentation/Features/Kezdőlap.md — the config-driven widget stack (backlog/095, backlog/112).
function summaryStub(): TodayNutritionSummary {
  const p = { intake: 0, goal: 0 };
  return { computable: false, incomplete: false, kcal: p, proteinG: p, carbsG: p, fatG: p };
}

function workoutsSummaryStub(): TodayWorkoutsSummary {
  const a = { count: 0, kcal: 0 };
  return { steps: { ...a, stepCount: 0 }, workout: a, climbing: a, swim: a, bike: a, totalKcal: 0 };
}

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let load: jasmine.Spy;
  let workoutsLoad: jasmine.Spy;

  beforeEach(async () => {
    load = jasmine.createSpy('load').and.resolveTo(undefined);
    workoutsLoad = jasmine.createSpy('load').and.resolveTo(undefined);

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: TodayNutritionService, useValue: { load, summary: signal(summaryStub()) } },
        { provide: TodayWorkoutsService, useValue: { load: workoutsLoad, summary: signal(workoutsSummaryStub()) } },
        {
          provide: SyncEngineService,
          useValue: { connectionState: signal('online'), draining: signal(false) },
        },
        { provide: OfflineQueueService, useValue: { pendingCount: signal(0), errorCount: signal(0) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
  });

  it('renders the widget stack without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-quick-actions-widget')).not.toBeNull();
  });

  it('shows the nutrition widget and loads its data on entry (tab.kaja is on in features.json)', async () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.widgets.map((w) => w.key)).toEqual(['quick-actions', 'today-nutrition', 'today-workouts']);

    await fixture.componentInstance.ionViewWillEnter();
    expect(load).toHaveBeenCalledTimes(1);

    expect((fixture.nativeElement as HTMLElement).querySelector('app-today-nutrition-widget')).not.toBeNull();
  });

  it('backlog/112 — loads today-workouts data on entry and renders the widget host', async () => {
    fixture.detectChanges();
    await fixture.componentInstance.ionViewWillEnter();
    expect(workoutsLoad).toHaveBeenCalledTimes(1);

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-today-workouts-widget')).not.toBeNull();
  });
});
