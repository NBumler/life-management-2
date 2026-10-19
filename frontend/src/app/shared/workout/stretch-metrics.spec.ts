import { STRETCH_NET_MET, stretchKcal } from './stretch-metrics';

describe('stretch-metrics (backlog/169)', () => {
  it('kcal = 1.3 net MET × body weight × hours', () => {
    expect(STRETCH_NET_MET).toBe(1.3);
    expect(stretchKcal({ durationMinutes: 30 }, 80)).toBeCloseTo(52);
  });

  it('0 without a weight or a duration; the duration is capped at 240 min', () => {
    expect(stretchKcal({ durationMinutes: 30 }, null)).toBe(0);
    expect(stretchKcal({ durationMinutes: 0 }, 80)).toBe(0);
    expect(stretchKcal({ durationMinutes: 600 }, 60)).toBeCloseTo(1.3 * 60 * 4);
  });
});
