/**
 * documentation/Features/Úszás napló.md — pure TS helpers for a swim log: MET kcal and the
 * pool-length × lap-count distance. No DOM, no Angular. The MET constants are the canonical ones
 * from documentation/Features/Tápérték kalkulátor.md; `core/data/activity-kcal.ts` sums `swimKcal`
 * over a day for the Étkezés dashboard's `activityExtraKcal`.
 */
import { SwimLog } from '../../../api/model/swimLog';

/** documentation/Features/Úszás napló.md "Kalória (kanonikus)": MET per intensity. */
export const SWIM_MET: Record<SwimLog.IntensityEnum, number> = {
  [SwimLog.IntensityEnum.Casual]: 5.5,
  [SwimLog.IntensityEnum.Breaststroke]: 5.5,
  [SwimLog.IntensityEnum.Backstroke]: 7.0,
  [SwimLog.IntensityEnum.CrawlFreestyle]: 8.0,
  [SwimLog.IntensityEnum.OpenWater]: 9.5,
  [SwimLog.IntensityEnum.Butterfly]: 11.0,
  [SwimLog.IntensityEnum.Vigorous]: 11.0,
  [SwimLog.IntensityEnum.Mixed]: 5.5,
};

/** Fixed picker order — casual → strokes by effort → open water → mixed. */
export const SWIM_INTENSITIES: readonly SwimLog.IntensityEnum[] = [
  SwimLog.IntensityEnum.Casual,
  SwimLog.IntensityEnum.Breaststroke,
  SwimLog.IntensityEnum.Backstroke,
  SwimLog.IntensityEnum.CrawlFreestyle,
  SwimLog.IntensityEnum.Butterfly,
  SwimLog.IntensityEnum.Vigorous,
  SwimLog.IntensityEnum.OpenWater,
  SwimLog.IntensityEnum.Mixed,
];

export function isOpenWater(intensity: SwimLog.IntensityEnum): boolean {
  return intensity === SwimLog.IntensityEnum.OpenWater;
}

/**
 * documentation/Features/Úszás napló.md canonical: kcal = MET(intensity) × m × durationMinutes / 60.
 * `m` is the CURRENT profile weight, never frozen into the log. Returns 0 when weight is
 * missing/non-positive or the duration is 0/negative.
 */
export function swimKcal(
  log: Pick<SwimLog, 'intensity' | 'durationMinutes'>,
  bodyWeightKg: number | null,
): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  if (log.durationMinutes == null || log.durationMinutes <= 0) {
    return 0;
  }
  return SWIM_MET[log.intensity] * bodyWeightKg * (log.durationMinutes / 60);
}

/**
 * documentation/Features/Úszás napló.md: `distanceMeters` = `poolLengthMeters × lapCount` when both
 * are present; otherwise the stored value (an optional manual open-water distance); otherwise null.
 */
export function swimDistanceMeters(
  log: Pick<SwimLog, 'poolLengthMeters' | 'lapCount' | 'distanceMeters'>,
): number | null {
  if (log.poolLengthMeters != null && log.poolLengthMeters > 0 && log.lapCount != null && log.lapCount > 0) {
    return log.poolLengthMeters * log.lapCount;
  }
  return log.distanceMeters ?? null;
}
