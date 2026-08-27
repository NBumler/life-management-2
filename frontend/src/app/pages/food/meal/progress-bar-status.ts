export type ProgressBarColor = 'yellow' | 'green' | 'orange' | 'red';

/**
 * documentation/Subfeatures/Étkezés.md "Progress bar színek — kalória". `dailyAllowanceKcal` (A)
 * and `maintenanceWithActivityKcal` (M) come straight from `TdeeResult`
 * (frontend/src/app/shared/tdee-calculator.ts) — no re-derivation needed here.
 */
export function calorieBarColor(intakeKcal: number, dailyAllowanceKcal: number, maintenanceWithActivityKcal: number): ProgressBarColor {
  const lo = 0.95 * dailyAllowanceKcal;
  const hi = 1.05 * dailyAllowanceKcal;
  if (intakeKcal < lo) {
    return 'yellow';
  }
  if (intakeKcal <= hi) {
    return 'green';
  }
  if (dailyAllowanceKcal < maintenanceWithActivityKcal) {
    return intakeKcal <= maintenanceWithActivityKcal ? 'orange' : 'red';
  }
  return 'red';
}

/** documentation/Subfeatures/Étkezés.md "Progress bar színek — fehérje / szénhidrát / zsír" — same ±5% band, no red tier. */
export function macroBarColor(intakeG: number, goalG: number): ProgressBarColor {
  const lo = 0.95 * goalG;
  const hi = 1.05 * goalG;
  if (intakeG < lo) {
    return 'yellow';
  }
  if (intakeG <= hi) {
    return 'green';
  }
  return 'orange';
}

export interface ProgressStatus {
  remaining: number;
  exceeded: boolean;
}

/** documentation/Subfeatures/Étkezés.md "Állapot szöveg (minden bar)" — hátra (≤ goal) vs túllépés (> goal). */
export function progressStatus(intake: number, goal: number): ProgressStatus {
  return { remaining: Math.abs(goal - intake), exceeded: intake > goal };
}
