import { AscentAttempt } from '../../api/model/ascentAttempt';
import { ClimbingSession } from '../../api/model/climbingSession';
import { WorkoutSession } from '../../api/model/workoutSession';
import { climbingKcal } from '../../pages/workout/climbing/climbing-metrics';
import { climbingKcalForDay, workoutKcalForDay } from './activity-kcal';

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

function ascent(overrides: Partial<AscentAttempt> = {}): AscentAttempt {
  return {
    id: 'a1',
    sessionId: 'c1',
    isSuccess: true,
    userRawInput: null,
    absoluteDifficultyIndex: 16,
    ascentStyle: null,
    safetyStyle: null,
    failurePoint: null,
    attemptCount: null,
    colorBandId: null,
    colorName: null,
    hexColor: null,
    gradeRange: null,
    indoorRouteId: null,
    routeId: null,
    boulderProblemId: null,
    routeName: null,
    lengthInMeters: null,
    notes: null,
    orderIndex: 0,
    pitches: [],
    deleted: false,
    ...overrides,
  };
}

function climb(overrides: Partial<ClimbingSession> = {}): ClimbingSession {
  return {
    id: 'c1',
    date: '2026-08-28',
    locationType: ClimbingSession.LocationTypeEnum.Indoor,
    discipline: ClimbingSession.DisciplineEnum.Boulder,
    totalSessionDurationMinutes: 60,
    pumpRating: null,
    headspaceRating: null,
    notes: null,
    climbingPartners: null,
    weatherConditions: null,
    gymId: null,
    gymName: null,
    cragId: null,
    cragName: null,
    sectorId: null,
    sectorName: null,
    rockType: null,
    aspect: null,
    attempts: [ascent()],
    deleted: false,
    ...overrides,
  };
}

describe('climbingKcalForDay', () => {
  it('sums climbingKcal over live sessions whose date matches the day', () => {
    const sessions = [climb({ id: 'a' }), climb({ id: 'b', totalSessionDurationMinutes: 30 })];
    const expected =
      climbingKcal({ discipline: 'BOULDER', totalSessionDurationMinutes: 60, pumpRating: null, attempts: [{ isSuccess: true, absoluteDifficultyIndex: 16 }] }, 80) +
      climbingKcal({ discipline: 'BOULDER', totalSessionDurationMinutes: 30, pumpRating: null, attempts: [{ isSuccess: true, absoluteDifficultyIndex: 16 }] }, 80);
    expect(climbingKcalForDay(sessions, '2026-08-28', 80)).toBeCloseTo(expected, 6);
    expect(climbingKcalForDay(sessions, '2026-08-28', 80)).toBeGreaterThan(0);
  });

  it('ignores other days, soft-deleted sessions, and a missing body weight', () => {
    expect(climbingKcalForDay([climb({ date: '2026-08-27' })], '2026-08-28', 80)).toBe(0);
    expect(climbingKcalForDay([climb({ deleted: true })], '2026-08-28', 80)).toBe(0);
    expect(climbingKcalForDay([climb()], '2026-08-28', null)).toBe(0);
  });
});
