/**
 * documentation/Features/Tápérték kalkulátor.md "Edzéskalória — univerzális MET" (backlog/164) — the
 * ACSM net-energy convention every activity log charges with. 1 MET ≈ the resting metabolic rate, and
 * `maintenanceKcal = BMR × 1.2` already counts rest for the whole 24 h, so `activityExtraKcal` may only
 * add energy **above rest**: `(grossMET − RESTING_MET) × m × hours`. The MET tables stay gross (as the
 * Compendium publishes them); this is the single place the resting MET is subtracted.
 */
export const RESTING_MET = 1.0;

export function netMet(grossMet: number): number {
  return Math.max(0, grossMet - RESTING_MET);
}
