import { AscentAttempt } from '../../../api/model/ascentAttempt';
import { PitchLog } from '../../../api/model/pitchLog';

import { climbingAttemptInput } from './climbing-attempt-input';

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
    lengthInMeters: 40,
    notes: null,
    orderIndex: 0,
    pitches: [],
    deleted: false,
    ...overrides,
  };
}

describe('climbingAttemptInput', () => {
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
