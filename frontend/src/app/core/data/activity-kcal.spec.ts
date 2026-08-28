import { WorkoutSession } from '../../api/model/workoutSession';
import { workoutKcalForDay } from './activity-kcal';

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    date: '2026-08-28',
    startTime: null,
    endTime: null,
    durationMinutes: 60,
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    title: null,
    notes: null,
    location: null,
    planId: null,
    roundsCount: null,
    exercises: [],
    deleted: false,
    ...overrides,
  };
}

describe('workoutKcalForDay', () => {
  // GENERAL_WEIGHTS MET 5.0 × 80 kg × 60/60 min = 400 kcal.
  it('sums sessionKcal over live sessions whose date matches the day', () => {
    const sessions = [
      session({ id: 'a', date: '2026-08-28', durationMinutes: 60 }),
      session({ id: 'b', date: '2026-08-28', durationMinutes: 30 }),
    ];
    expect(workoutKcalForDay(sessions, '2026-08-28', 80)).toBe(400 + 200);
  });

  it('ignores sessions on other days', () => {
    const sessions = [session({ id: 'a', date: '2026-08-27' }), session({ id: 'b', date: '2026-08-29' })];
    expect(workoutKcalForDay(sessions, '2026-08-28', 80)).toBe(0);
  });

  it('ignores soft-deleted sessions', () => {
    expect(workoutKcalForDay([session({ deleted: true })], '2026-08-28', 80)).toBe(0);
  });

  it('is 0 when body weight is missing', () => {
    expect(workoutKcalForDay([session()], '2026-08-28', null)).toBe(0);
  });

  it('is 0 with no sessions', () => {
    expect(workoutKcalForDay([], '2026-08-28', 80)).toBe(0);
  });
});
