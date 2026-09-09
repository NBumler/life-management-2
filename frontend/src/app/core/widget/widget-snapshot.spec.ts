import { TodayNutritionSummary } from '../data/today-nutrition.service';
import {
  WIDGET_LABEL_KEYS,
  WIDGET_ROUTES,
  WIDGET_SNAPSHOT_VERSION,
  WidgetLabels,
  buildWidgetSnapshot,
} from './widget-snapshot';

function identityLabels(): WidgetLabels {
  const out = {} as WidgetLabels;
  for (const key of Object.keys(WIDGET_LABEL_KEYS) as (keyof typeof WIDGET_LABEL_KEYS)[]) {
    out[key] = key;
  }
  return out;
}

const computable: TodayNutritionSummary = {
  computable: true,
  incomplete: false,
  kcal: { intake: 1234.6, goal: 2242 },
  proteinG: { intake: 55, goal: 130 },
  carbsG: { intake: 120, goal: 250 },
  fatG: { intake: 40, goal: 70 },
};

const notComputable: TodayNutritionSummary = {
  computable: false,
  incomplete: false,
  kcal: { intake: 0, goal: 0 },
  proteinG: { intake: 0, goal: 0 },
  carbsG: { intake: 0, goal: 0 },
  fatG: { intake: 0, goal: 0 },
};

describe('buildWidgetSnapshot', () => {
  it('carries rounded nutrition progress + steps when logged in and computable', () => {
    const snap = buildWidgetSnapshot({
      loggedIn: true,
      lang: 'hu',
      nutrition: computable,
      stepCount: 5400,
      stepGoal: 2000,
      labels: identityLabels(),
      now: 111,
    });

    expect(snap.version).toBe(WIDGET_SNAPSHOT_VERSION);
    expect(snap.writtenAt).toBe(111);
    expect(snap.loggedIn).toBe(true);
    expect(snap.nutrition).toEqual({
      incomplete: false,
      kcal: { intake: 1235, goal: 2242 },
      proteinG: { intake: 55, goal: 130 },
      carbsG: { intake: 120, goal: 250 },
      fatG: { intake: 40, goal: 70 },
    });
    expect(snap.steps).toEqual({ count: 5400, goal: 2000 });
    expect(snap.routes).toEqual(WIDGET_ROUTES);
  });

  it('nulls nutrition when the profile is not computable (widget then shows the "set up profile" hint)', () => {
    const snap = buildWidgetSnapshot({
      loggedIn: true,
      lang: 'hu',
      nutrition: notComputable,
      stepCount: 0,
      stepGoal: 2000,
      labels: identityLabels(),
    });

    expect(snap.nutrition).toBeNull();
  });

  it('nulls nutrition and reports logged-out regardless of the summary', () => {
    const snap = buildWidgetSnapshot({
      loggedIn: false,
      lang: 'en',
      nutrition: computable,
      stepCount: 999,
      stepGoal: 2000,
      labels: identityLabels(),
    });

    expect(snap.loggedIn).toBe(false);
    expect(snap.nutrition).toBeNull();
    expect(snap.steps.count).toBe(999);
  });

  it('clamps negative / non-finite numbers to 0', () => {
    const snap = buildWidgetSnapshot({
      loggedIn: true,
      lang: 'hu',
      nutrition: notComputable,
      stepCount: -5,
      stepGoal: Number.NaN,
      labels: identityLabels(),
    });

    expect(snap.steps).toEqual({ count: 0, goal: 0 });
  });
});
