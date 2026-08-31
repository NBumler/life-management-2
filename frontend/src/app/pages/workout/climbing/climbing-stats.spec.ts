import { AscentAttempt } from '../../../api/model/ascentAttempt';
import { ClimbingSession } from '../../../api/model/climbingSession';
import { PitchLog } from '../../../api/model/pitchLog';

import { computeClimbingStats } from './climbing-stats';

const TODAY = '2026-08-31';

function pitch(overrides: Partial<PitchLog> = {}): PitchLog {
  return {
    id: 'p1',
    attemptId: 'a1',
    pitchNumber: 1,
    isLead: true,
    rawGrade: null,
    absoluteDifficultyIndex: null,
    lengthInMeters: null,
    orderIndex: 0,
    deleted: false,
    ...overrides,
  };
}

function attempt(overrides: Partial<AscentAttempt> = {}): AscentAttempt {
  return {
    id: 'a1',
    sessionId: 's1',
    isSuccess: true,
    userRawInput: null,
    absoluteDifficultyIndex: null,
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

function session(overrides: Partial<ClimbingSession> = {}): ClimbingSession {
  return {
    id: 's1',
    date: TODAY,
    locationType: ClimbingSession.LocationTypeEnum.Indoor,
    discipline: ClimbingSession.DisciplineEnum.Boulder,
    totalSessionDurationMinutes: null,
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
    attempts: [],
    deleted: false,
    ...overrides,
  };
}

function contextOf(stats: ReturnType<typeof computeClimbingStats>, key: string) {
  return stats.contexts.find((c) => c.key === key)!;
}

describe('computeClimbingStats', () => {
  it('returns all four contexts, zeroed, for an empty log', () => {
    const stats = computeClimbingStats([], 90, TODAY);
    expect(stats.contexts.map((c) => c.key)).toEqual(['indoor-boulder', 'indoor-rope', 'outdoor-boulder', 'outdoor-rope']);
    expect(stats.totalVolume).toBe(0);
    for (const ctx of stats.contexts) {
      expect(ctx.sessionCount).toBe(0);
      expect(ctx.maxGradeLabel).toBeNull();
      expect(ctx.totalVolume).toBe(0);
      expect(ctx.pyramid).toEqual([]);
      expect(ctx.outcomes.total).toBe(0);
    }
  });

  it('max grade is the hardest SUCCESSFUL attempt label; a harder failed attempt is ignored', () => {
    const stats = computeClimbingStats(
      [
        session({
          attempts: [
            attempt({ id: 'a', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16 }),
            attempt({ id: 'b', isSuccess: false, userRawInput: '7A', absoluteDifficultyIndex: 24 }),
          ],
        }),
      ],
      90,
      TODAY,
    );
    const ctx = contextOf(stats, 'indoor-boulder');
    expect(ctx.maxGradeIndex).toBe(16);
    expect(ctx.maxGradeLabel).toBe('6A');
  });

  it('total volume sums 4 m x index over successful boulder attempts, per context and overall', () => {
    const stats = computeClimbingStats(
      [
        session({
          id: 's1',
          attempts: [
            attempt({ id: 'a', isSuccess: true, absoluteDifficultyIndex: 16 }),
            attempt({ id: 'b', isSuccess: true, absoluteDifficultyIndex: 24 }),
            attempt({ id: 'c', isSuccess: false, absoluteDifficultyIndex: 30 }),
          ],
        }),
        session({
          id: 's2',
          locationType: ClimbingSession.LocationTypeEnum.Outdoor,
          attempts: [attempt({ id: 'd', isSuccess: true, absoluteDifficultyIndex: 10 })],
        }),
      ],
      90,
      TODAY,
    );
    expect(contextOf(stats, 'indoor-boulder').totalVolume).toBe(4 * 16 + 4 * 24);
    expect(contextOf(stats, 'outdoor-boulder').totalVolume).toBe(4 * 10);
    expect(stats.totalVolume).toBe(4 * 16 + 4 * 24 + 4 * 10);
  });

  it('outcome breakdown: onsight / flash / redpoint (+ style-less send) / failed', () => {
    const stats = computeClimbingStats(
      [
        session({
          attempts: [
            attempt({ id: 'a', isSuccess: true, ascentStyle: AscentAttempt.AscentStyleEnum.Onsight }),
            attempt({ id: 'b', isSuccess: true, ascentStyle: AscentAttempt.AscentStyleEnum.Flash }),
            attempt({ id: 'c', isSuccess: true, ascentStyle: AscentAttempt.AscentStyleEnum.Redpoint }),
            attempt({ id: 'd', isSuccess: true, ascentStyle: null }),
            attempt({ id: 'e', isSuccess: false }),
          ],
        }),
      ],
      90,
      TODAY,
    );
    const o = contextOf(stats, 'indoor-boulder').outcomes;
    expect(o).toEqual({ onsight: 1, flash: 1, redpoint: 2, failed: 1, total: 5 });
  });

  it('grade pyramid: successful sends within the window, hardest first, most-frequent raw label', () => {
    const stats = computeClimbingStats(
      [
        session({
          attempts: [
            attempt({ id: 'a', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16 }),
            attempt({ id: 'b', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16 }),
            attempt({ id: 'c', isSuccess: true, userRawInput: 'V4', absoluteDifficultyIndex: 16 }),
            attempt({ id: 'd', isSuccess: true, userRawInput: '7A', absoluteDifficultyIndex: 24 }),
            attempt({ id: 'e', isSuccess: false, userRawInput: '7B', absoluteDifficultyIndex: 28 }),
          ],
        }),
      ],
      90,
      TODAY,
    );
    expect(contextOf(stats, 'indoor-boulder').pyramid).toEqual([
      { index: 24, label: '7A', sends: 1 },
      { index: 16, label: '6A', sends: 3 },
    ]);
  });

  it('grade pyramid respects the period window; other figures stay all-time', () => {
    const sessions = [
      session({ id: 'recent', date: '2026-08-20', attempts: [attempt({ id: 'r', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16 })] }),
      session({ id: 'old', date: '2026-05-01', attempts: [attempt({ id: 'o', isSuccess: true, userRawInput: '7A', absoluteDifficultyIndex: 24 })] }),
    ];
    const near = computeClimbingStats(sessions, 30, TODAY);
    expect(contextOf(near, 'indoor-boulder').pyramid.map((r) => r.index)).toEqual([16]);
    // all-time figures still see the old harder send
    expect(contextOf(near, 'indoor-boulder').maxGradeIndex).toBe(24);
    expect(contextOf(near, 'indoor-boulder').totalVolume).toBe(4 * 16 + 4 * 24);

    const far = computeClimbingStats(sessions, 365, TODAY);
    expect(contextOf(far, 'indoor-boulder').pyramid.map((r) => r.index)).toEqual([24, 16]);
  });

  it('rope volume uses climbed metres (pitch-length sum when pitches are present)', () => {
    const stats = computeClimbingStats(
      [
        session({
          locationType: ClimbingSession.LocationTypeEnum.Outdoor,
          discipline: ClimbingSession.DisciplineEnum.Rope,
          attempts: [
            attempt({
              id: 'a',
              isSuccess: true,
              absoluteDifficultyIndex: 14,
              lengthInMeters: 100,
              pitches: [pitch({ id: 'p1', lengthInMeters: 20 }), pitch({ id: 'p2', isLead: false, lengthInMeters: 25 })],
            }),
          ],
        }),
      ],
      90,
      TODAY,
    );
    expect(contextOf(stats, 'outdoor-rope').totalVolume).toBe((20 + 25) * 14);
  });

  it('ignores soft-deleted sessions, attempts and pitches', () => {
    const stats = computeClimbingStats(
      [
        session({ id: 'gone', deleted: true, attempts: [attempt({ id: 'x', isSuccess: true, absoluteDifficultyIndex: 40 })] }),
        session({
          id: 'live',
          attempts: [
            attempt({ id: 'a', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16 }),
            attempt({ id: 'dead', deleted: true, isSuccess: true, userRawInput: '8A', absoluteDifficultyIndex: 36 }),
          ],
        }),
      ],
      90,
      TODAY,
    );
    const ctx = contextOf(stats, 'indoor-boulder');
    expect(ctx.sessionCount).toBe(1);
    expect(ctx.maxGradeIndex).toBe(16);
    expect(ctx.outcomes.total).toBe(1);
  });
});
