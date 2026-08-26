/**
 * documentation/Features/Tápérték kalkulátor.md — pure TS BMR/PAL/macro calculation engine.
 * `Étkezés` (not yet built) will consume this for its dashboard progress bars; this slice ships
 * only the calculation engine, since the spec explicitly makes a dedicated screen for it optional
 * ("Saját magyarázó / debug UI később opcionális").
 *
 * `activityExtraKcal` is a plain input (default 0), not computed here: the step-count and MET
 * workout formulas that feed it belong to [[Lépésszám követés]] / [[Edzés]], neither of which
 * exists yet in this codebase. Callers just start passing a non-zero value once those land — this
 * file needs no changes.
 */

export type TdeeSex = 'MALE' | 'FEMALE';
export type TdeeGoal = 'FAT_LOSS' | 'MAINTENANCE' | 'WEIGHT_GAIN';

export interface TdeeProfileInput {
  birthDate: string | null; // YYYY-MM-DD, client-local calendar date — see shared/local-date.ts
  sex: TdeeSex | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  goal: TdeeGoal | null;
  /** Required whenever goal !== 'MAINTENANCE'; ignored (may be null) when goal === 'MAINTENANCE'. */
  kgPerWeek: number | null;
}

export interface TdeeMacros {
  proteinGoalG: number;
  fatGoalG: number;
  carbsGoalG: number;
}

export interface TdeeResult {
  maintenanceKcal: number;
  baseDailyCalorieGoal: number;
  activityExtraKcal: number;
  dailyAllowanceKcal: number;
  /** M_day: today's weight-maintaining TDEE including activity — kcal progress-bar color threshold. */
  maintenanceWithActivityKcal: number;
  macros: TdeeMacros;
}

export type TdeeCalculation = ({ computable: true } & TdeeResult) | { computable: false };

const PAL = 1.2;
const KG_PER_WEEK_TO_KCAL = 1100;
const CALORIE_FLOOR: Record<TdeeSex, number> = { MALE: 1500, FEMALE: 1200 };
const CARB_FLOOR_G = 20;
const PROTEIN_G_PER_KG = 2.0;
const FAT_G_PER_KG = 0.9;
const PROTEIN_MIN_G_PER_KG = 1.5;
const FAT_MIN_G_PER_KG = 0.6;

/**
 * documentation/Features/Profile.md "Tápérték fogyasztók (hiányos profil)": missing input never
 * throws — callers show `~` / homokóra instead.
 */
export function computeTdee(input: TdeeProfileInput, todayIso: string, activityExtraKcal = 0): TdeeCalculation {
  const { birthDate, sex, heightCm, currentWeightKg, goal, kgPerWeek } = input;
  if (birthDate === null || sex === null || heightCm === null || currentWeightKg === null || goal === null) {
    return { computable: false };
  }
  if (goal !== 'MAINTENANCE' && kgPerWeek === null) {
    return { computable: false };
  }

  const age = ageInYears(birthDate, todayIso);
  const bmr =
    sex === 'MALE'
      ? 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;
  const maintenanceKcal = bmr * PAL;

  const baseDailyCalorieGoal = Math.max(maintenanceKcal + goalDeltaKcal(goal, kgPerWeek), CALORIE_FLOOR[sex]);
  const dailyAllowanceKcal = baseDailyCalorieGoal + activityExtraKcal;

  return {
    computable: true,
    maintenanceKcal,
    baseDailyCalorieGoal,
    activityExtraKcal,
    dailyAllowanceKcal,
    maintenanceWithActivityKcal: maintenanceKcal + activityExtraKcal,
    macros: computeMacroGoals(dailyAllowanceKcal, currentWeightKg),
  };
}

/** documentation/Features/Tápérték kalkulátor.md "Kanonikus napi mezők": teljes évek, floor period. */
function ageInYears(birthDateIso: string, todayIso: string): number {
  const [birthYear, birthMonth, birthDay] = birthDateIso.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = todayIso.split('-').map(Number);
  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
    age -= 1;
  }
  return age;
}

function goalDeltaKcal(goal: TdeeGoal, kgPerWeek: number | null): number {
  if (goal === 'MAINTENANCE') {
    return 0;
  }
  const magnitude = Math.abs(kgPerWeek ?? 0) * KG_PER_WEEK_TO_KCAL;
  return goal === 'FAT_LOSS' ? -magnitude : magnitude;
}

/**
 * documentation/Features/Tápérték kalkulátor.md "Makrók (g/nap)" — sequential, early-exit reduction
 * when the raw protein+fat goals alone don't leave room for the daily allowance. Exported separately
 * from {@link computeTdee} so each step of the reduction chain can be tested directly.
 */
export function computeMacroGoals(dailyAllowanceKcal: number, weightKg: number): TdeeMacros {
  const proteinRawG = PROTEIN_G_PER_KG * weightKg;
  const fatRawG = FAT_G_PER_KG * weightKg;

  if (proteinRawG * 4 + fatRawG * 9 <= dailyAllowanceKcal) {
    return { proteinGoalG: proteinRawG, fatGoalG: fatRawG, carbsGoalG: (dailyAllowanceKcal - proteinRawG * 4 - fatRawG * 9) / 4 };
  }

  const fatMinG = FAT_MIN_G_PER_KG * weightKg;
  const proteinMinG = PROTEIN_MIN_G_PER_KG * weightKg;

  // Step 2: raw protein/fat plus the 20g carb floor.
  if (proteinRawG * 4 + fatRawG * 9 + CARB_FLOOR_G * 4 <= dailyAllowanceKcal) {
    return finalCarbGoal(dailyAllowanceKcal, proteinRawG, fatRawG);
  }

  // Step 3+4: reduce fat toward its floor until the 20g carb floor fits.
  const fatGoalG = Math.max(fatMinG, (dailyAllowanceKcal - proteinRawG * 4 - CARB_FLOOR_G * 4) / 9);
  if (proteinRawG * 4 + fatGoalG * 9 + CARB_FLOOR_G * 4 <= dailyAllowanceKcal) {
    return finalCarbGoal(dailyAllowanceKcal, proteinRawG, fatGoalG);
  }

  // Step 5: fat stays at its floor; reduce protein toward its floor.
  const proteinGoalG = Math.max(proteinMinG, (dailyAllowanceKcal - fatGoalG * 9 - CARB_FLOOR_G * 4) / 4);
  if (proteinGoalG * 4 + fatGoalG * 9 + CARB_FLOOR_G * 4 <= dailyAllowanceKcal) {
    return finalCarbGoal(dailyAllowanceKcal, proteinGoalG, fatGoalG);
  }

  // Step 6: both floors hit and still over allowance — carbs bottom out at 0, not blocked.
  return { proteinGoalG, fatGoalG, carbsGoalG: 0 };
}

function finalCarbGoal(dailyAllowanceKcal: number, proteinGoalG: number, fatGoalG: number): TdeeMacros {
  const carbsGoalG = Math.max(CARB_FLOOR_G, (dailyAllowanceKcal - proteinGoalG * 4 - fatGoalG * 9) / 4);
  return { proteinGoalG, fatGoalG, carbsGoalG };
}
