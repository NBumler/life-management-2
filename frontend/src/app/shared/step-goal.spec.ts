import { stepGoalOrNull, stepGoalProgress, stepGoalReached } from './step-goal';

describe('step-goal (backlog/136)', () => {
  it('stepGoalOrNull() treats missing / non-positive goals as "no goal"', () => {
    expect(stepGoalOrNull(undefined)).toBeNull();
    expect(stepGoalOrNull(null)).toBeNull();
    expect(stepGoalOrNull(0)).toBeNull();
    expect(stepGoalOrNull(13000)).toBe(13000);
  });

  it('stepGoalProgress() is a 0‥1 ratio capped at 1', () => {
    expect(stepGoalProgress(0, 13000)).toBe(0);
    expect(stepGoalProgress(6500, 13000)).toBe(0.5);
    expect(stepGoalProgress(20000, 13000)).toBe(1);
    expect(stepGoalProgress(-5, 13000)).toBe(0);
  });

  it('stepGoalReached() needs a goal and a count at or above it', () => {
    expect(stepGoalReached(13000, 13000)).toBeTrue();
    expect(stepGoalReached(12999, 13000)).toBeFalse();
    expect(stepGoalReached(20000, null)).toBeFalse();
  });
});
