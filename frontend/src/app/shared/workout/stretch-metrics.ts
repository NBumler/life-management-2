/**
 * documentation/Subfeatures/Nyújtás.md "Kalória" (backlog/169) — pure TS, no DOM, no Angular.
 * `core/data/activity-kcal.ts` sums `stretchKcal` over a day for `activityExtraKcal`.
 *
 * One fixed NET MET, the same convention as the volleyball log (gross − the 1 MET resting burn already
 * covered by `maintenanceKcal = BMR × 1.2`): the 2024 Compendium's mild stretching is 2.3 gross → 1.3 net.
 */
import { StretchSession } from '../../api/model/stretchSession';

export const STRETCH_NET_MET = 1.3;

/** Duration cap (backend `stretch_session.duration_minutes` CHECK) — a typo can't inflate the day. */
export const STRETCH_MAX_DURATION_MINUTES = 240;

/**
 * kcal = STRETCH_NET_MET × m × durationMinutes / 60, `m` the CURRENT profile weight (never frozen into the
 * session). 0 when the weight is missing / non-positive or the duration is 0 / negative.
 */
export function stretchKcal(session: Pick<StretchSession, 'durationMinutes'>, bodyWeightKg: number | null): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0 || session.durationMinutes == null || session.durationMinutes <= 0) {
    return 0;
  }
  const minutes = Math.min(session.durationMinutes, STRETCH_MAX_DURATION_MINUTES);
  return STRETCH_NET_MET * bodyWeightKg * (minutes / 60);
}
