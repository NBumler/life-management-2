import { calorieBarColor, macroBarColor, progressStatus } from './progress-bar-status';

describe('calorieBarColor', () => {
  const A = 2242; // dailyAllowanceKcal, spec's own worked example

  it('yellow when intake is below the 95% band', () => {
    expect(calorieBarColor(0.94 * A, A, A)).toBe('yellow');
  });

  it('green at the lower band edge', () => {
    expect(calorieBarColor(0.95 * A, A, A)).toBe('green');
  });

  it('green in the middle of the band', () => {
    expect(calorieBarColor(A, A, A)).toBe('green');
  });

  it('green at the upper band edge', () => {
    expect(calorieBarColor(1.05 * A, A, A)).toBe('green');
  });

  describe('fat-loss goal (A < M)', () => {
    const M = 2600;

    it('orange above the band but within maintenance', () => {
      expect(calorieBarColor(1.06 * A, A, M)).toBe('orange');
    });

    it('orange exactly at maintenance', () => {
      expect(calorieBarColor(M, A, M)).toBe('orange');
    });

    it('red once intake exceeds maintenance', () => {
      expect(calorieBarColor(M + 1, A, M)).toBe('red');
    });
  });

  describe('maintenance/gain goal (A >= M) — no orange tier', () => {
    const M = 2000;

    it('red immediately once intake exceeds the band', () => {
      expect(calorieBarColor(1.06 * A, A, M)).toBe('red');
    });
  });
});

describe('macroBarColor', () => {
  const goal = 150;

  it('yellow below the 95% band', () => {
    expect(macroBarColor(0.94 * goal, goal)).toBe('yellow');
  });

  it('green within the ±5% band', () => {
    expect(macroBarColor(goal, goal)).toBe('green');
    expect(macroBarColor(0.95 * goal, goal)).toBe('green');
    expect(macroBarColor(1.05 * goal, goal)).toBe('green');
  });

  it('orange above the band — never red', () => {
    expect(macroBarColor(1.06 * goal, goal)).toBe('orange');
    expect(macroBarColor(10 * goal, goal)).toBe('orange');
  });
});

describe('progressStatus', () => {
  it('reports remaining (not exceeded) when intake is at or below goal', () => {
    expect(progressStatus(1200, 2242)).toEqual({ remaining: 1042, exceeded: false });
    expect(progressStatus(2242, 2242)).toEqual({ remaining: 0, exceeded: false });
  });

  it('reports exceeded when intake is above goal', () => {
    expect(progressStatus(2442, 2242)).toEqual({ remaining: 200, exceeded: true });
  });
});
