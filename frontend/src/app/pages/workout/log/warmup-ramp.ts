/**
 * backlog/132 — ramping warm-up generator (documentation/Subfeatures/Edzésnapló.md "Bemelegítő-szett
 * generátor"). Fatigue-free, rising warm-up before heavy working sets: 5 reps at ~30%, 3 reps at ~65%,
 * 1 rep at ~87% of the working load, with 60 / 90 / 120 s rest. Always stored as absolute kg — there is
 * no percentage field in the model. Pure, no Angular.
 */

export interface WarmupSetSpec {
  reps: number;
  weightKg: number;
  restTimeSeconds: number;
}

export const WARMUP_RAMP: readonly { reps: number; fraction: number; restTimeSeconds: number }[] = [
  { reps: 5, fraction: 0.3, restTimeSeconds: 60 },
  { reps: 3, fraction: 0.65, restTimeSeconds: 90 },
  { reps: 1, fraction: 0.87, restTimeSeconds: 120 },
];

const PLATE_STEP_KG = 2.5;

function roundToPlate(value: number): number {
  const rounded = Math.round(value / PLATE_STEP_KG) * PLATE_STEP_KG;
  return rounded === 0 ? 0 : Math.round(rounded * 100) / 100;
}

export type WarmupRampResult =
  | { ok: true; sets: WarmupSetSpec[] }
  | { ok: false; reason: 'NO_WORKING_WEIGHT' | 'NEEDS_BODY_WEIGHT' };

/**
 * `workingWeightKg` > 0: an external load, scaled directly. < 0: an assisted bodyweight movement (band /
 * pulley) — the moved load is `bodyWeight + workingWeight`, so the warm-up needs the profile body weight
 * and comes out as a larger assistance. 0 / null: nothing to scale from.
 */
export function rampWarmupSets(workingWeightKg: number | null, bodyWeightKg: number | null): WarmupRampResult {
  if (workingWeightKg === null || workingWeightKg === 0) {
    return { ok: false, reason: 'NO_WORKING_WEIGHT' };
  }
  if (workingWeightKg > 0) {
    return {
      ok: true,
      sets: WARMUP_RAMP.map((step) => ({
        reps: step.reps,
        weightKg: roundToPlate(workingWeightKg * step.fraction),
        restTimeSeconds: step.restTimeSeconds,
      })),
    };
  }
  if (bodyWeightKg === null || bodyWeightKg <= 0 || bodyWeightKg + workingWeightKg <= 0) {
    return { ok: false, reason: 'NEEDS_BODY_WEIGHT' };
  }
  const load = bodyWeightKg + workingWeightKg;
  return {
    ok: true,
    sets: WARMUP_RAMP.map((step) => ({
      reps: step.reps,
      weightKg: roundToPlate(load * step.fraction - bodyWeightKg),
      restTimeSeconds: step.restTimeSeconds,
    })),
  };
}
