import {
  BOULDER_SECONDS_PER_GO,
  CLIMBING_MET,
  ClimbingKcalInput,
  RESTING_MET,
  boulderActiveMet,
  climbingKcal,
  climbingVolume,
  durationFallbackMinutes,
  pumpMultiplier,
  resolveBoulderReferenceIndex,
  resolveSessionDurationMinutes,
} from './climbing-metrics';

/** Every zone is charged `(grossMET − RESTING_MET)` (ACSM net-energy convention — see climbing-metrics.ts). */
const ROPE_LEAD_NET = CLIMBING_MET.ACTIVE_ROPE_LEAD - RESTING_MET;
const REST_NET = CLIMBING_MET.REST - RESTING_MET;
const BOULDER_REST_NET = CLIMBING_MET.REST_BOULDER - RESTING_MET;
const EASY_NET = CLIMBING_MET.ACTIVE_BOULDER_EASY - RESTING_MET;
const LIMIT_NET = CLIMBING_MET.ACTIVE_BOULDER_LIMIT - RESTING_MET;
const GO_MIN = BOULDER_SECONDS_PER_GO / 60;

describe('climbing-metrics', () => {
  describe('pumpMultiplier', () => {
    it('is 1.0 when the rating is missing', () => {
      expect(pumpMultiplier(null)).toBe(1.0);
      expect(pumpMultiplier(undefined)).toBe(1.0);
    });

    it('interpolates piecewise-linearly through the anchor points', () => {
      expect(pumpMultiplier(1)).toBeCloseTo(0.8, 6);
      expect(pumpMultiplier(2)).toBeCloseTo(0.9, 6);
      expect(pumpMultiplier(3)).toBeCloseTo(1.0, 6);
      expect(pumpMultiplier(4)).toBeCloseTo(1.15, 6);
      expect(pumpMultiplier(5)).toBeCloseTo(1.3, 6);
    });

    it('clamps out-of-range ratings', () => {
      expect(pumpMultiplier(0)).toBeCloseTo(0.8, 6);
      expect(pumpMultiplier(9)).toBeCloseTo(1.3, 6);
    });
  });

  describe('durationFallbackMinutes', () => {
    it('is 5 min per boulder attempt row and 15 min per rope attempt row', () => {
      expect(durationFallbackMinutes('BOULDER', 4)).toBe(20);
      expect(durationFallbackMinutes('ROPE', 3)).toBe(45);
      expect(durationFallbackMinutes('BOULDER', 0)).toBe(0);
    });
  });

  describe('resolveSessionDurationMinutes', () => {
    const base: ClimbingKcalInput = {
      discipline: 'BOULDER',
      totalSessionDurationMinutes: null,
      pumpRating: null,
      attempts: [
        { isSuccess: true, absoluteDifficultyIndex: 14 },
        { isSuccess: false, absoluteDifficultyIndex: 14 },
        { isSuccess: true, absoluteDifficultyIndex: 16 },
      ],
    };

    it('uses the stored duration when it is positive', () => {
      expect(resolveSessionDurationMinutes({ ...base, totalSessionDurationMinutes: 50 })).toBe(50);
    });

    it('falls back to attempt-count × per-discipline minutes otherwise', () => {
      expect(resolveSessionDurationMinutes(base)).toBe(15); // 3 boulder rows × 5
      expect(resolveSessionDurationMinutes({ ...base, totalSessionDurationMinutes: 0 })).toBe(15);
      expect(resolveSessionDurationMinutes({ ...base, totalSessionDurationMinutes: -10 })).toBe(15);
    });
  });

  describe('boulder relative difficulty', () => {
    it('ramps linearly from EASY at reference − 8 to LIMIT at the reference, clamped', () => {
      expect(boulderActiveMet(16, 24)).toBeCloseTo(CLIMBING_MET.ACTIVE_BOULDER_EASY, 6);
      expect(boulderActiveMet(10, 24)).toBeCloseTo(CLIMBING_MET.ACTIVE_BOULDER_EASY, 6);
      expect(boulderActiveMet(20, 24)).toBeCloseTo((CLIMBING_MET.ACTIVE_BOULDER_EASY + CLIMBING_MET.ACTIVE_BOULDER_LIMIT) / 2, 6);
      expect(boulderActiveMet(24, 24)).toBeCloseTo(CLIMBING_MET.ACTIVE_BOULDER_LIMIT, 6);
      expect(boulderActiveMet(30, 24)).toBeCloseTo(CLIMBING_MET.ACTIVE_BOULDER_LIMIT, 6);
    });

    it('charges an ungraded go at the Compendium free-boulder MET', () => {
      expect(boulderActiveMet(null, 24)).toBe(CLIMBING_MET.ACTIVE_BOULDER_UNGRADED);
    });

    it('uses the stored reference (V5 default without one), raised only by a successful send in the session', () => {
      const base: ClimbingKcalInput = { discipline: 'BOULDER', totalSessionDurationMinutes: 60, pumpRating: null, attempts: [] };
      expect(resolveBoulderReferenceIndex(base)).toBe(20);
      expect(resolveBoulderReferenceIndex({ ...base, referenceDifficultyIndex: 12 })).toBe(12);
      expect(
        resolveBoulderReferenceIndex({ ...base, referenceDifficultyIndex: 12, attempts: [{ isSuccess: true, absoluteDifficultyIndex: 18 }] }),
      ).toBe(18);
      expect(
        resolveBoulderReferenceIndex({ ...base, referenceDifficultyIndex: 12, attempts: [{ isSuccess: false, absoluteDifficultyIndex: 30 }] }),
      ).toBe(12);
    });
  });

  describe('climbingKcal', () => {
    it('is 0 when the body weight is missing or non-positive', () => {
      const input: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 60,
        pumpRating: null,
        attempts: [{ isSuccess: true, absoluteDifficultyIndex: 14 }],
      };
      expect(climbingKcal(input, null)).toBe(0);
      expect(climbingKcal(input, 0)).toBe(0);
    });

    it('charges each boulder go by its grade relative to the reference level, plus a boulder rest zone', () => {
      const input: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 60,
        pumpRating: null,
        referenceDifficultyIndex: 24, // V7
        attempts: [
          { isSuccess: true, absoluteDifficultyIndex: 16 }, // V3 = reference − band → easy
          { isSuccess: false, absoluteDifficultyIndex: 24, attemptCount: 3 }, // at the limit, 3 goes
        ],
      };
      const active = EASY_NET * 70 * (GO_MIN / 60) + LIMIT_NET * 70 * ((3 * GO_MIN) / 60);
      const rest = BOULDER_REST_NET * 70 * ((60 - 4 * GO_MIN) / 60);
      expect(climbingKcal(input, 70)).toBeCloseTo(active + rest, 6);
    });

    it('a harder go burns more than an easier one, and more goes burn more', () => {
      const session = (index: number, attemptCount: number): ClimbingKcalInput => ({
        discipline: 'BOULDER',
        totalSessionDurationMinutes: null,
        pumpRating: null,
        referenceDifficultyIndex: 24,
        attempts: [{ isSuccess: false, absoluteDifficultyIndex: index, attemptCount }],
      });
      expect(climbingKcal(session(24, 1), 70)).toBeGreaterThan(climbingKcal(session(10, 1), 70));
      expect(climbingKcal(session(24, 4), 70)).toBeGreaterThan(climbingKcal(session(24, 1), 70));
    });

    it('a longer boulder session burns noticeably more (2 net MET: ~76 kcal per extra 30 min at 76 kg)', () => {
      const base: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 60,
        pumpRating: null,
        attempts: [{ isSuccess: true, absoluteDifficultyIndex: 20 }],
      };
      const delta = climbingKcal({ ...base, totalSessionDurationMinutes: 90 }, 76) - climbingKcal(base, 76);
      expect(delta).toBeCloseTo(76, 6);
    });

    it('reproduces the backlog/130 worked example (81 min, 4 × V7 × 4 goes + 5 × V5, 76 kg) at ~325 kcal', () => {
      const input: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 81,
        pumpRating: 3,
        referenceDifficultyIndex: 24,
        attempts: [
          ...Array.from({ length: 4 }, () => ({ isSuccess: false, absoluteDifficultyIndex: 24, attemptCount: 4 })),
          ...Array.from({ length: 5 }, () => ({ isSuccess: true, absoluteDifficultyIndex: 20, attemptCount: 1 })),
        ],
      };
      const kcal = climbingKcal(input, 76);
      expect(kcal).toBeGreaterThan(310);
      expect(kcal).toBeLessThan(340);
    });

    it('plausibility: an easy 60 min session ~170–250 kcal, a 90 min projecting one ~350–450 kcal (76 kg)', () => {
      const easy: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 60,
        pumpRating: null,
        referenceDifficultyIndex: 24,
        attempts: Array.from({ length: 10 }, () => ({ isSuccess: true, absoluteDifficultyIndex: 18 })),
      };
      const projecting: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 90,
        pumpRating: 4,
        referenceDifficultyIndex: 24,
        attempts: [
          ...Array.from({ length: 5 }, () => ({ isSuccess: false, absoluteDifficultyIndex: 24, attemptCount: 4 })),
          ...Array.from({ length: 5 }, () => ({ isSuccess: true, absoluteDifficultyIndex: 20 })),
        ],
      };
      const easyKcal = climbingKcal(easy, 76);
      const projectingKcal = climbingKcal(projecting, 76);
      expect(easyKcal).toBeGreaterThan(170);
      expect(easyKcal).toBeLessThan(250);
      expect(projectingKcal).toBeGreaterThan(350);
      expect(projectingKcal).toBeLessThan(450);
    });

    it('a mostly-rest crag session is charged only ~1 net MET for the idle time', () => {
      const input: ClimbingKcalInput = {
        discipline: 'ROPE',
        totalSessionDurationMinutes: 120, // 2 h at the crag…
        pumpRating: null,
        attempts: [{ isSuccess: true, absoluteDifficultyIndex: 14, safetyStyle: 'LEAD', lengthInMeters: 20 }], // …15 min of it climbing
      };
      const activeMin = (20 * 45) / 60;
      const rest = REST_NET * 70 * ((120 - activeMin) / 60); // net 1.0, not gross 2.0
      const active = ROPE_LEAD_NET * 70 * (activeMin / 60);
      expect(climbingKcal(input, 70)).toBeCloseTo(active + rest, 6);
    });

    it('uses length × 45 s for a LEAD rope attempt', () => {
      const input: ClimbingKcalInput = {
        discipline: 'ROPE',
        totalSessionDurationMinutes: 120,
        pumpRating: 3, // multiplier 1.0
        attempts: [{ isSuccess: true, absoluteDifficultyIndex: 14, safetyStyle: 'LEAD', lengthInMeters: 20 }],
      };
      const activeMin = (20 * 45) / 60; // 15
      const active = ROPE_LEAD_NET * 70 * (activeMin / 60);
      const rest = REST_NET * 70 * ((120 - activeMin) / 60);
      expect(climbingKcal(input, 70)).toBeCloseTo(active + rest, 6);
    });

    it('adds 6 kg of hardware to the active branch for TRAD, not the rest branch', () => {
      const input: ClimbingKcalInput = {
        discipline: 'ROPE',
        totalSessionDurationMinutes: 60,
        pumpRating: null,
        attempts: [{ isSuccess: true, absoluteDifficultyIndex: 20, safetyStyle: 'TRAD', lengthInMeters: 10 }],
      };
      const activeMin = (10 * 60) / 60; // 10
      const active = ROPE_LEAD_NET * (70 + 6) * (activeMin / 60);
      const rest = REST_NET * 70 * ((60 - activeMin) / 60);
      expect(climbingKcal(input, 70)).toBeCloseTo(active + rest, 6);
    });

    it('applies the double 0.8 (time and MET) to a following climber on a pitch', () => {
      const input: ClimbingKcalInput = {
        discipline: 'ROPE',
        totalSessionDurationMinutes: 100,
        pumpRating: null,
        attempts: [
          {
            isSuccess: true,
            absoluteDifficultyIndex: 16,
            safetyStyle: 'LEAD',
            pitches: [
              { isLead: true, lengthInMeters: 30 },
              { isLead: false, lengthInMeters: 30 },
            ],
          },
        ],
      };
      const leadMin = (30 * 45) / 60; // 22.5
      const secondMin = (30 * 45 * 0.8) / 60; // 18
      const active =
        ROPE_LEAD_NET * 70 * (leadMin / 60) +
        (CLIMBING_MET.ACTIVE_ROPE_LEAD * 0.8 - RESTING_MET) * 70 * (secondMin / 60);
      const rest = REST_NET * 70 * ((100 - leadMin - secondMin) / 60);
      expect(climbingKcal(input, 70)).toBeCloseTo(active + rest, 6);
    });

    it('replaces a missing duration with the fallback', () => {
      const input: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: null,
        pumpRating: null,
        attempts: [
          { isSuccess: true, absoluteDifficultyIndex: 14 },
          { isSuccess: true, absoluteDifficultyIndex: 16 },
        ],
      };
      // fallback = 2 × 5 = 10 min; 2 goes; no history → default reference V5 (index 20)
      const active =
        (boulderActiveMet(14, 20) - RESTING_MET) * 70 * (GO_MIN / 60) + (boulderActiveMet(16, 20) - RESTING_MET) * 70 * (GO_MIN / 60);
      const rest = BOULDER_REST_NET * 70 * ((10 - 2 * GO_MIN) / 60);
      expect(climbingKcal(input, 70)).toBeCloseTo(active + rest, 6);
    });

    it('never produces a negative rest zone', () => {
      const input: ClimbingKcalInput = {
        discipline: 'BOULDER',
        totalSessionDurationMinutes: 1, // less than the 5 goes of active time
        pumpRating: null,
        attempts: Array.from({ length: 5 }, () => ({ isSuccess: true, absoluteDifficultyIndex: 14 })),
      };
      const active = 5 * ((boulderActiveMet(14, 20) - RESTING_MET) * 70 * (GO_MIN / 60));
      expect(climbingKcal(input, 70)).toBeCloseTo(active, 6);
    });
  });

  describe('climbingVolume', () => {
    it('sums 4 m × index over successful boulder attempts only', () => {
      expect(
        climbingVolume({
          discipline: 'BOULDER',
          attempts: [
            { isSuccess: true, absoluteDifficultyIndex: 16 },
            { isSuccess: true, absoluteDifficultyIndex: 20 },
            { isSuccess: false, absoluteDifficultyIndex: 30 },
            { isSuccess: true, absoluteDifficultyIndex: null },
          ],
        }),
      ).toBe(4 * 16 + 4 * 20);
    });

    it('sums climbed metres × index for rope, taking the pitch-length sum when present', () => {
      expect(
        climbingVolume({
          discipline: 'ROPE',
          attempts: [
            { isSuccess: true, absoluteDifficultyIndex: 14, lengthInMeters: 20 },
            {
              isSuccess: true,
              absoluteDifficultyIndex: 10,
              pitches: [
                { isLead: true, lengthInMeters: 10 },
                { isLead: false, lengthInMeters: 15 },
              ],
            },
          ],
        }),
      ).toBe(20 * 14 + 25 * 10);
    });
  });
});
