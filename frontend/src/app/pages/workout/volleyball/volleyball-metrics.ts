/**
 * documentation/Features/Röplabda napló.md — pure TS helpers for a volleyball log. No DOM, no Angular.
 * `core/data/activity-kcal.ts` sums `volleyballKcal` over a day for the Étkezés dashboard's
 * `activityExtraKcal`.
 *
 * backlog/163 "soha ne becsüljön felül": unlike swim / bike there is NO intensity → MET table. One
 * fixed NET MET (gross − the 1 MET resting burn already covered by `maintenanceKcal = BMR × 1.2`):
 * 2.0 net = 3.0 gross = the 2024 Compendium's lowest volleyball value (non-competitive). Measured match
 * values (≈4.5–5.5 gross) and "competitive, gym" (6.0) all sit above it, so a self-rating mistake can't
 * inflate the allowance — a hard match is simply under-counted.
 */
import { VolleyballLog } from '../../../api/model/volleyballLog';

/** documentation/Features/Röplabda napló.md "Kalória (kanonikus)": the one fixed net MET. */
export const VOLLEYBALL_NET_MET = 2.0;

/** On-court minutes cap (backend `VolleyballLogService.MAX_DURATION_MINUTES`) — a typo can't inflate the day. */
export const VOLLEYBALL_MAX_DURATION_MINUTES = 240;

/** Fixed picker order for the optional, statistics-only self-rating. */
export const VOLLEYBALL_INTENSITIES: readonly VolleyballLog.IntensityEnum[] = [
  VolleyballLog.IntensityEnum.Light,
  VolleyballLog.IntensityEnum.Moderate,
  VolleyballLog.IntensityEnum.Hard,
];

/**
 * documentation/Features/Röplabda napló.md canonical: kcal = VOLLEYBALL_NET_MET × m × durationMinutes / 60.
 * `intensity` is deliberately NOT an input (only `durationMinutes` is picked). `m` is the CURRENT
 * profile weight, never frozen into the log. The duration is clamped to the cap so a stale over-cap
 * row can't inflate the day either. Returns 0 when weight is missing/non-positive or the duration is
 * 0/negative.
 */
export function volleyballKcal(
  log: Pick<VolleyballLog, 'durationMinutes'>,
  bodyWeightKg: number | null,
): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  if (log.durationMinutes == null || log.durationMinutes <= 0) {
    return 0;
  }
  const minutes = Math.min(log.durationMinutes, VOLLEYBALL_MAX_DURATION_MINUTES);
  return VOLLEYBALL_NET_MET * bodyWeightKg * (minutes / 60);
}
