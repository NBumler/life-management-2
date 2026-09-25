import { AscentAttempt } from '../../../api/model/ascentAttempt';
import { ClimbingSession } from '../../../api/model/climbingSession';
import { PitchLog } from '../../../api/model/pitchLog';

import { boulderReferenceIndex, climbingAttemptInput, climbingSessionKcalInput } from './climbing-attempt-input';

function pitch(overrides: Partial<PitchLog> = {}): PitchLog {
  return {
    id: 'p1',
    attemptId: 'a1',
    pitchNumber: 1,
    isLead: true,
    rawGrade: null,
    absoluteDifficultyIndex: null,
    lengthInMeters: 30,
    orderIndex: 0,
    deleted: false,
    ...overrides,
  };
}

function ascent(overrides: Partial<AscentAttempt> = {}): AscentAttempt {
  return {
    id: 'a1',
    sessionId: 'c1',
    isSuccess: true,
    userRawInput: null,
    absoluteDifficultyIndex: 16,
    ascentStyle: null,
    safetyStyle: null,
    attemptCount: null,
    colorBandId: null,
    colorName: null,
    hexColor: null,
    gradeRange: null,
    indoorRouteId: null,
    routeId: null,
    boulderProblemId: null,
    routeName: null,
    lengthInMeters: 40,
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
    date: '2026-09-25',
    locationType: ClimbingSession.LocationTypeEnum.Indoor,
    discipline: ClimbingSession.DisciplineEnum.Boulder,
    totalSessionDurationMinutes: 60,
    pumpRating: null,
    headspaceRating: null,
    notes: null,
    climbingPartners: null,
    weatherConditions: [],
    gymId: null,
    gymName: null,
    cragId: null,
    cragName: null,
    attempts: [ascent()],
    deleted: false,
    ...overrides,
  };
}

describe('climbingAttemptInput', () => {
  it('carries the go count through (null when missing)', () => {
    expect(climbingAttemptInput(ascent({ attemptCount: 4 })).attemptCount).toBe(4);
    expect(climbingAttemptInput(ascent()).attemptCount).toBeNull();
  });

  it('carries the grade index, safety style and single-pitch length through', () => {
    const input = climbingAttemptInput(
      ascent({ safetyStyle: AscentAttempt.SafetyStyleEnum.Lead, lengthInMeters: 25 }),
    );
    expect(input.isSuccess).toBeTrue();
    expect(input.absoluteDifficultyIndex).toBe(16);
    expect(input.safetyStyle).toBe('LEAD');
    expect(input.lengthInMeters).toBe(25);
    expect(input.pitches).toBeNull();
  });

  it('maps a live pitch list (lead flags + lengths) so the kcal / volume model can sum them', () => {
    const input = climbingAttemptInput(
      ascent({
        pitches: [
          pitch({ id: 'p1', isLead: true, lengthInMeters: 30 }),
          pitch({ id: 'p2', isLead: false, lengthInMeters: 28 }),
        ],
      }),
    );
    expect(input.pitches).toEqual([
      { isLead: true, lengthInMeters: 30 },
      { isLead: false, lengthInMeters: 28 },
    ]);
  });

  it('drops soft-deleted pitches and falls back to null when none remain', () => {
    const input = climbingAttemptInput(ascent({ pitches: [pitch({ deleted: true })] }));
    expect(input.pitches).toBeNull();
  });

  it('null-coalesces missing optional fields', () => {
    const input = climbingAttemptInput(
      ascent({ absoluteDifficultyIndex: null, safetyStyle: null, lengthInMeters: null, pitches: [] }),
    );
    expect(input.absoluteDifficultyIndex).toBeNull();
    expect(input.safetyStyle).toBeNull();
    expect(input.lengthInMeters).toBeNull();
    expect(input.pitches).toBeNull();
  });
});

describe('boulderReferenceIndex', () => {
  it('is the best successful boulder index within the 90 days up to the date', () => {
    const sessions = [
      session({ id: 'a', date: '2026-09-01', attempts: [ascent({ absoluteDifficultyIndex: 22 })] }),
      session({ id: 'b', date: '2026-06-27', attempts: [ascent({ absoluteDifficultyIndex: 24 })] }), // exactly 90 days back
      session({ id: 'c', date: '2026-06-26', attempts: [ascent({ absoluteDifficultyIndex: 30 })] }), // 91 days back
      session({ id: 'd', date: '2026-09-26', attempts: [ascent({ absoluteDifficultyIndex: 32 })] }), // later
    ];
    expect(boulderReferenceIndex(sessions, '2026-09-25')).toBe(24);
  });

  it('ignores failed / deleted attempts, deleted and rope sessions, and the excluded session', () => {
    const sessions = [
      session({ id: 'a', attempts: [ascent({ absoluteDifficultyIndex: 30, isSuccess: false })] }),
      session({ id: 'b', attempts: [ascent({ absoluteDifficultyIndex: 30, deleted: true })] }),
      session({ id: 'c', deleted: true, attempts: [ascent({ absoluteDifficultyIndex: 30 })] }),
      session({ id: 'd', discipline: ClimbingSession.DisciplineEnum.Rope, attempts: [ascent({ absoluteDifficultyIndex: 30 })] }),
      session({ id: 'self', attempts: [ascent({ absoluteDifficultyIndex: 30 })] }),
      session({ id: 'e', attempts: [ascent({ absoluteDifficultyIndex: 18 })] }),
    ];
    expect(boulderReferenceIndex(sessions, '2026-09-25', 'self')).toBe(18);
    expect(boulderReferenceIndex([], '2026-09-25')).toBeNull();
  });
});

describe('climbingSessionKcalInput', () => {
  it('scores a boulder session against the other sessions, never itself', () => {
    const self = session({ id: 'self', attempts: [ascent({ absoluteDifficultyIndex: 30 }), ascent({ id: 'x', deleted: true })] });
    const other = session({ id: 'other', attempts: [ascent({ absoluteDifficultyIndex: 22 })] });
    const input = climbingSessionKcalInput(self, [self, other]);
    expect(input.referenceDifficultyIndex).toBe(22);
    expect(input.attempts.length).toBe(1);
  });

  it('leaves the reference empty for a rope session', () => {
    const rope = session({ discipline: ClimbingSession.DisciplineEnum.Rope });
    expect(climbingSessionKcalInput(rope, [rope]).referenceDifficultyIndex).toBeNull();
  });
});
