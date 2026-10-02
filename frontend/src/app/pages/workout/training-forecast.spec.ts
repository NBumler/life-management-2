import { ClimbingSession } from '../../api/model/climbingSession';
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { DayOverride, ForecastDay, ForecastInputs, nextBlockLimit, nextForecastWorkout, overridesByDate, trainingForecast } from './training-forecast';
import { addLocalDays } from './weekly-plan/weekly-plan-adherence';

/** 2026-10-05 is a Monday. */
const TODAY = '2026-10-05';

function plan(id: string, category = 'BACK', active = true): WorkoutPlan {
  return {
    id,
    name: id,
    active,
    deleted: false,
    exercises: [{ id: `${id}-x`, deleted: false, exerciseCategory: category, exerciseKind: 'WEIGHTED_REPS' }],
  } as unknown as WorkoutPlan;
}

function workout(date: string, planId: string | null = null): WorkoutSession {
  return { id: `w-${date}`, date, planId, deleted: false, exercises: [] } as unknown as WorkoutSession;
}

function climb(date: string): ClimbingSession {
  return { id: `c-${date}`, date, deleted: false, attempts: [] } as unknown as ClimbingSession;
}

const day = (offset: number) => addLocalDays(TODAY, offset);

function forecast(overrides: Partial<ForecastInputs>, days = 7): ForecastDay[] {
  const inputs: ForecastInputs = {
    today: TODAY,
    plans: [plan('A'), plan('B')],
    workoutSessions: [],
    climbingSessions: [],
    plannedClimbs: new Set(),
    overrides: new Map(),
    ...overrides,
  };
  return trainingForecast(inputs, day(days - 1));
}

/** Compact "kind:plan" per day, e.g. `W:A`, `C`, `R`. */
function compact(days: readonly ForecastDay[]): string[] {
  return days.map((entry) => (entry.kind === 'WORKOUT' ? `W:${entry.plan?.id ?? '-'}` : entry.kind === 'CLIMB' ? 'C' : 'R'));
}

describe('training-forecast (backlog/144)', () => {
  it('alternates the load-block limit 2 / 3 (no history starts with 2) and rotates A / B', () => {
    const result = forecast({}, 10);
    expect(compact(result)).toEqual(['W:A', 'W:B', 'R', 'W:A', 'W:B', 'W:A', 'R', 'W:B', 'W:A', 'R']);
    expect(result[2]).toEqual(jasmine.objectContaining({ reason: 'BLOCK_LIMIT', blockLength: 2 }));
    expect(result[6].blockLength).toBe(3);
  });

  it('nextBlockLimit(): after a ≥ 3 day block (or none) 2, otherwise 3', () => {
    expect([nextBlockLimit(0), nextBlockLimit(1), nextBlockLimit(2), nextBlockLimit(3), nextBlockLimit(5)]).toEqual([2, 3, 3, 2, 2]);
  });

  it('a planned climb is a load day without a workout; the day before it is finger-free', () => {
    const result = forecast({ plans: [plan('F', 'FOREARM_FINGERS'), plan('P')], plannedClimbs: new Set([day(1)]) }, 4);
    expect(compact(result)).toEqual(['W:P', 'C', 'R', 'W:F']);
  });

  it('flags a finger fallback when every template has finger work', () => {
    const result = forecast({ plans: [plan('F', 'FOREARM_FINGERS')], plannedClimbs: new Set([day(1)]) }, 1);
    expect(result[0]).toEqual(jasmine.objectContaining({ kind: 'WORKOUT', fingerFallback: true }));
  });

  it('a manual override wins, and the rotation continues from it', () => {
    const overrides = new Map<string, DayOverride>([
      [day(0), { kind: 'PLAN', planId: 'B' }],
      [day(3), { kind: 'REST', planId: null }],
    ]);
    const result = forecast({ overrides }, 6);
    expect(compact(result)).toEqual(['W:B', 'W:A', 'R', 'R', 'W:B', 'W:A']);
    expect(result[0].reason).toBe('OVERRIDE');
    expect(result[3].reason).toBe('OVERRIDE');
  });

  it('an override to a deleted template falls back to the automatic rule', () => {
    const result = forecast({ overrides: new Map([[day(0), { kind: 'PLAN', planId: 'gone' }]]) }, 1);
    expect(result[0]).toEqual(jasmine.objectContaining({ kind: 'WORKOUT', reason: 'ROTATION' }));
  });

  it('continues the logged block: 2 load days after a 3-day block → today is a rest day', () => {
    const result = forecast(
      {
        climbingSessions: [climb(day(-6)), climb(day(-5)), climb(day(-4)), climb(day(-1))],
        workoutSessions: [workout(day(-2), 'A')],
      },
      2,
    );
    expect(compact(result)).toEqual(['R', 'W:B']);
  });

  it('a suggested but unlogged past day is a rest day — the block restarts', () => {
    // only the day before yesterday was logged; yesterday's suggestion was skipped
    const result = forecast({ workoutSessions: [workout(day(-2), 'A')] }, 1);
    expect(result[0]).toEqual(jasmine.objectContaining({ kind: 'WORKOUT', reason: 'ROTATION' }));
    expect(result[0].plan?.id).toBe('B');
  });

  it('today, once logged, is what happened — no second suggestion; the next workout moves on', () => {
    const result = forecast({ workoutSessions: [workout(TODAY, 'A')] }, 3);
    expect(result[0]).toEqual(jasmine.objectContaining({ kind: 'WORKOUT', reason: 'LOGGED' }));
    expect(result[0].plan?.id).toBe('A');
    expect(nextForecastWorkout(result, TODAY)).toEqual(jasmine.objectContaining({ date: day(1), plan: jasmine.objectContaining({ id: 'B' }) }));
  });

  it('a climb logged today makes today a climbing day', () => {
    expect(compact(forecast({ climbingSessions: [climb(TODAY)] }, 1))).toEqual(['C']);
  });

  it('without an active template a free day is a rest day', () => {
    const result = forecast({ plans: [plan('X', 'BACK', false)] }, 1);
    expect(result[0]).toEqual(jasmine.objectContaining({ kind: 'REST', reason: 'NO_PLANS' }));
  });

  it('overridesByDate(): every live slot of every live week, by date — no inheritance', () => {
    const weeks = [
      {
        id: 'w1',
        weekStartDate: TODAY,
        deleted: false,
        slots: [
          { id: 's1', weeklyPlanId: 'w1', dayOfWeek: 'WEDNESDAY', kind: 'PLAN', planId: 'A', deleted: false },
          { id: 's2', weeklyPlanId: 'w1', dayOfWeek: 'FRIDAY', kind: 'REST', planId: null, deleted: false },
          { id: 's3', weeklyPlanId: 'w1', dayOfWeek: 'MONDAY', kind: 'PLAN', planId: 'B', deleted: true },
        ],
      },
      { id: 'w2', weekStartDate: day(7), deleted: true, slots: [{ id: 's4', weeklyPlanId: 'w2', dayOfWeek: 'MONDAY', kind: 'PLAN', planId: 'A', deleted: false }] },
    ] as unknown as WeeklyPlan[];
    const overrides = overridesByDate(weeks);
    expect([...overrides.entries()]).toEqual([
      [day(2), { kind: 'PLAN', planId: 'A' }],
      [day(4), { kind: 'REST', planId: null }],
    ]);
  });
});
