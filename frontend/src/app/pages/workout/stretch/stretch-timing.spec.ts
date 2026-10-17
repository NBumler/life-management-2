import {
  STRETCH_TRANSITION_SECONDS,
  stretchItemHolds,
  stretchItemSeconds,
  stretchPlanDurationMinutes,
  stretchPlanDurationSeconds,
} from './stretch-timing';

describe('stretch-timing (backlog/168)', () => {
  it('an item runs repetitions × (2 when per side) holds', () => {
    expect(stretchItemHolds({ holdSeconds: 30, perSide: false, repetitions: 1 })).toBe(1);
    expect(stretchItemHolds({ holdSeconds: 30, perSide: true, repetitions: 2 })).toBe(4);
  });

  it('item seconds = hold × holds, no transitions', () => {
    expect(stretchItemSeconds({ holdSeconds: 30, perSide: true, repetitions: 2 })).toBe(120);
  });

  it('plan duration adds one transition before every hold', () => {
    const items = [
      { holdSeconds: 30, perSide: true, repetitions: 1 },
      { holdSeconds: 45, perSide: false, repetitions: 2 },
    ];
    // holds: 2 × 30 + 2 × 45 = 150; transitions: 4 × 5 = 20
    expect(stretchPlanDurationSeconds(items)).toBe(150 + 4 * STRETCH_TRANSITION_SECONDS);
    expect(stretchPlanDurationMinutes(items)).toBe(3);
  });

  it('an empty plan is 0 minutes, a short one at least 1', () => {
    expect(stretchPlanDurationMinutes([])).toBe(0);
    expect(stretchPlanDurationMinutes([{ holdSeconds: 10, perSide: false, repetitions: 1 }])).toBe(1);
  });
});
