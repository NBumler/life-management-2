import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { LanguageService } from '../config/language.service';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { TodayNutritionService, TodayNutritionSummary } from '../data/today-nutrition.service';
import { NotificationTuningService } from '../notifications/notification-tuning.service';
import { AuthSessionService } from '../session/auth-session.service';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { WidgetSnapshotService } from './widget-snapshot.service';
import { WIDGET_SNAPSHOT_KEY, WidgetSnapshot } from './widget-snapshot';

function computableSummary(): TodayNutritionSummary {
  return {
    computable: true,
    incomplete: false,
    kcal: { intake: 1200, goal: 2200 },
    proteinG: { intake: 50, goal: 120 },
    carbsG: { intake: 100, goal: 250 },
    fatG: { intake: 30, goal: 70 },
  };
}

async function readSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = (await Preferences.get({ key: WIDGET_SNAPSHOT_KEY })).value;
  return raw === null ? null : (JSON.parse(raw) as WidgetSnapshot);
}

describe('WidgetSnapshotService', () => {
  let summary: ReturnType<typeof signal<TodayNutritionSummary>>;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let nutritionLoad: jasmine.Spy;
  let stepLoad: jasmine.Spy;

  function configure(native: boolean): WidgetSnapshotService {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(native);
    summary = signal<TodayNutritionSummary>(computableSummary());
    isAuthenticated = signal(true);
    nutritionLoad = jasmine.createSpy('nutritionLoad').and.resolveTo(undefined);
    stepLoad = jasmine.createSpy('stepLoad').and.resolveTo(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: LanguageService, useValue: { activeLanguage: () => 'hu' } },
        { provide: AuthSessionService, useValue: { isAuthenticated } },
        { provide: TodayNutritionService, useValue: { summary, load: nutritionLoad } },
        { provide: DailyStepLogRepository, useValue: { items: signal([]), stepsForDay: () => 5400, load: stepLoad } },
        { provide: NotificationTuningService, useValue: { tuning: signal({ stepsLowThreshold: 2000 }) } },
        { provide: DataChangeNotifier, useValue: { tick: signal(0) } },
      ],
    });
    return TestBed.inject(WidgetSnapshotService);
  }

  afterEach(async () => {
    await Preferences.remove({ key: WIDGET_SNAPSHOT_KEY });
  });

  it('writes a snapshot with the computed nutrition + step values on native init()', async () => {
    const service = configure(true);
    await service.init();

    const snap = await readSnapshot();
    expect(snap?.loggedIn).toBe(true);
    expect(snap?.steps).toEqual({ count: 5400, goal: 2000 });
    expect(snap?.nutrition?.kcal).toEqual({ intake: 1200, goal: 2200 });
    expect(snap?.labels.nutritionTitle).toBe('WIDGET.NUTRITION_TITLE');
  });

  it('writes loggedIn:false / nutrition:null when the session is gone', async () => {
    const service = configure(true);
    isAuthenticated.set(false);
    await service.init();

    const snap = await readSnapshot();
    expect(snap?.loggedIn).toBe(false);
    expect(snap?.nutrition).toBeNull();
  });

  it('is a no-op on web (no snapshot written)', async () => {
    const service = configure(false);
    await service.init();

    expect(await readSnapshot()).toBeNull();
  });

  it('rewrites and reloads sources after a delta-pull tick', async () => {
    const service = configure(true);
    await service.init();
    nutritionLoad.calls.reset();
    stepLoad.calls.reset();

    TestBed.inject(DataChangeNotifier).tick.set(1);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

    expect(nutritionLoad).toHaveBeenCalledTimes(1);
    expect(stepLoad).toHaveBeenCalledTimes(1);
  });
});

const DEBOUNCE_WAIT_MS = 700;
