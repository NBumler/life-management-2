import { TdeeProfileInput, computeMacroGoals, computeTdee } from './tdee-calculator';

function profile(overrides: Partial<TdeeProfileInput> = {}): TdeeProfileInput {
  return { birthDate: '1990-01-01', sex: 'MALE', heightCm: 180, currentWeightKg: 70, goal: 'MAINTENANCE', kgPerWeek: null, ...overrides };
}

describe('tdee-calculator', () => {
  describe('computeTdee', () => {
    it('computes BMR/PAL/floor/allowance for a male on FAT_LOSS, clamped at the 1500 kcal floor', () => {
      const result = computeTdee(profile({ goal: 'FAT_LOSS', kgPerWeek: 0.5 }), '2026-08-26');

      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      expect(result.maintenanceKcal).toBeCloseTo(1980); // BMR 1650 * 1.2
      expect(result.baseDailyCalorieGoal).toBe(1500); // raw 1430 clamped to the male floor
      expect(result.activityExtraKcal).toBe(0);
      expect(result.dailyAllowanceKcal).toBe(1500);
      expect(result.maintenanceWithActivityKcal).toBeCloseTo(1980);
      expect(result.macros.carbsGoalG).toBeCloseTo(93.25);
    });

    it('computes BMR/PAL/floor for a female on FAT_LOSS, clamped at the 1200 kcal floor', () => {
      const result = computeTdee(
        profile({ sex: 'FEMALE', heightCm: 160, currentWeightKg: 50, goal: 'FAT_LOSS', kgPerWeek: 1.0 }),
        '2026-08-26',
      );

      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      expect(result.maintenanceKcal).toBeCloseTo(1390.8); // BMR 1159 (age 36) * 1.2
      expect(result.baseDailyCalorieGoal).toBe(1200); // raw 290.8 clamped to the female floor
      expect(result.macros.carbsGoalG).toBeCloseTo(98.75);
    });

    it('does not clamp when the raw goal is above the floor, and MAINTENANCE ignores a null kgPerWeek', () => {
      const result = computeTdee(profile({ heightCm: 190, currentWeightKg: 90, goal: 'MAINTENANCE', kgPerWeek: null }), '2026-08-26', undefined);

      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      expect(result.maintenanceKcal).toBeCloseTo(2295); // BMR 1912.5 (age 36) * 1.2
      expect(result.baseDailyCalorieGoal).toBeCloseTo(2295); // unclamped, delta = 0
      expect(result.dailyAllowanceKcal).toBeCloseTo(2295);
    });

    it('adds a WEIGHT_GAIN delta instead of subtracting it', () => {
      const result = computeTdee(profile({ heightCm: 190, currentWeightKg: 90, goal: 'WEIGHT_GAIN', kgPerWeek: 0.3 }), '2026-08-26');

      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      expect(result.baseDailyCalorieGoal).toBeCloseTo(2295 + 0.3 * 1100);
    });

    it('passes activityExtraKcal through into dailyAllowanceKcal, maintenanceWithActivityKcal, and the macro budget', () => {
      const result = computeTdee(profile({ goal: 'FAT_LOSS', kgPerWeek: 0.5 }), '2026-08-26', 300);

      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      expect(result.dailyAllowanceKcal).toBe(1800); // 1500 floor + 300
      expect(result.maintenanceWithActivityKcal).toBeCloseTo(2280); // 1980 + 300
      expect(result.macros.carbsGoalG).toBeCloseTo(168.25); // (1800 - 1127) / 4
    });

    it('age: counts a birthday already passed this year as a full year', () => {
      const result = computeTdee(profile({ birthDate: '1990-01-01' }), '2026-08-26');
      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      // BMR uses age 36: 10*70 + 6.25*180 - 5*36 + 5 = 1650
      expect(result.maintenanceKcal).toBeCloseTo(1650 * 1.2);
    });

    it('age: does not count a birthday not yet reached this year', () => {
      const result = computeTdee(profile({ birthDate: '1990-12-31' }), '2026-08-26');
      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      // age 35: 10*70 + 6.25*180 - 5*35 + 5 = 1655
      expect(result.maintenanceKcal).toBeCloseTo(1655 * 1.2);
    });

    it('age: counts a birthday falling exactly today', () => {
      const result = computeTdee(profile({ birthDate: '1990-08-26' }), '2026-08-26');
      expect(result.computable).toBeTrue();
      if (!result.computable) return;
      expect(result.maintenanceKcal).toBeCloseTo(1650 * 1.2); // same as the already-passed case: age 36
    });

    for (const [field, override] of Object.entries({
      birthDate: { birthDate: null },
      sex: { sex: null },
      heightCm: { heightCm: null },
      currentWeightKg: { currentWeightKg: null },
      goal: { goal: null },
    })) {
      it(`flags not computable when ${field} is missing`, () => {
        const result = computeTdee(profile(override as Partial<TdeeProfileInput>), '2026-08-26');
        expect(result.computable).toBeFalse();
      });
    }

    it('flags not computable when goal is FAT_LOSS but kgPerWeek is missing', () => {
      const result = computeTdee(profile({ goal: 'FAT_LOSS', kgPerWeek: null }), '2026-08-26');
      expect(result.computable).toBeFalse();
    });

    it('flags not computable when goal is WEIGHT_GAIN but kgPerWeek is missing', () => {
      const result = computeTdee(profile({ goal: 'WEIGHT_GAIN', kgPerWeek: null }), '2026-08-26');
      expect(result.computable).toBeFalse();
    });
  });

  describe('computeMacroGoals', () => {
    const weightKg = 70; // proteinRaw 140g/560kcal, fatRaw 63g/567kcal, sum 1127kcal; Pmin 105g, Fmin 42g

    it('uses the raw protein/fat goals with no reduction when the allowance covers them', () => {
      const macros = computeMacroGoals(1500, weightKg);
      expect(macros).toEqual({ proteinGoalG: 140, fatGoalG: 63, carbsGoalG: 93.25 });
    });

    it('lets carbs settle at exactly 0 (no floor) right at the raw protein+fat boundary', () => {
      const macros = computeMacroGoals(1127, weightKg);
      expect(macros).toEqual({ proteinGoalG: 140, fatGoalG: 63, carbsGoalG: 0 });
    });

    it('reduces fat toward its floor when the allowance is just under the raw protein+fat sum', () => {
      const macros = computeMacroGoals(1090, weightKg);
      expect(macros.proteinGoalG).toBe(140);
      expect(macros.fatGoalG).toBeCloseTo(50);
      expect(macros.carbsGoalG).toBeCloseTo(20);
    });

    it('clamps fat at its floor and reduces protein when fat reduction alone is not enough', () => {
      const macros = computeMacroGoals(1000, weightKg);
      expect(macros.fatGoalG).toBeCloseTo(42); // Fmin = 0.6 * 70
      expect(macros.proteinGoalG).toBeCloseTo(135.5);
      expect(macros.carbsGoalG).toBeCloseTo(20);
    });

    it('bottoms carbs out at 0 (not blocked) when both floors are hit and the allowance still does not fit', () => {
      const macros = computeMacroGoals(700, weightKg);
      expect(macros.fatGoalG).toBeCloseTo(42); // Fmin
      expect(macros.proteinGoalG).toBeCloseTo(105); // Pmin = 1.5 * 70
      expect(macros.carbsGoalG).toBe(0);
    });
  });
});
