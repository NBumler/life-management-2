import { rampWarmupSets } from './warmup-ramp';

describe('rampWarmupSets (backlog/132)', () => {
  it('scales an external load to 30 / 65 / 87 %, rounded to 2.5 kg, with 60 / 90 / 120 s rest', () => {
    expect(rampWarmupSets(100, null)).toEqual({
      ok: true,
      sets: [
        { reps: 5, weightKg: 30, restTimeSeconds: 60 },
        { reps: 3, weightKg: 65, restTimeSeconds: 90 },
        { reps: 1, weightKg: 87.5, restTimeSeconds: 120 },
      ],
    });
  });

  it('rounds small loads to the nearest plate (can reach 0 kg)', () => {
    const result = rampWarmupSets(2.5, null);
    expect(result.ok && result.sets.map((set) => set.weightKg)).toEqual([0, 2.5, 2.5]);
  });

  it('turns an assisted (negative) working weight into larger assistance, using body weight', () => {
    // 80 kg body, -20 kg band: moved load 60 kg; warm-ups move 18 / 39 / 52.2 kg = -62 / -41 / -27.8 kg assistance
    const result = rampWarmupSets(-20, 80);
    expect(result.ok && result.sets.map((set) => set.weightKg)).toEqual([-62.5, -40, -27.5]);
  });

  it('refuses without a working weight, or an assisted one without body weight', () => {
    expect(rampWarmupSets(null, 80)).toEqual({ ok: false, reason: 'NO_WORKING_WEIGHT' });
    expect(rampWarmupSets(0, 80)).toEqual({ ok: false, reason: 'NO_WORKING_WEIGHT' });
    expect(rampWarmupSets(-20, null)).toEqual({ ok: false, reason: 'NEEDS_BODY_WEIGHT' });
    expect(rampWarmupSets(-90, 80)).toEqual({ ok: false, reason: 'NEEDS_BODY_WEIGHT' });
  });
});
