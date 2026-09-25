/**
 * documentation/Features/Mászónapló.md "Kalória (kanonikus)" + "Volumen" — pure TS climbing energy
 * and volume model. No DOM, no Angular. The session stores no `calculatedCalories` (unlike Úszás /
 * Edzésnapló); `core/data/activity-kcal.ts` sums `climbingKcal` per day for the Étkezés dashboard's
 * `activityExtraKcal`, and the log form shows a live preview with the same function.
 *
 * The model is NOT `duration × MET`. Each logged attempt contributes an *active* zone (seconds that
 * depend on discipline / safety style / lead-or-second, and for boulder on the go count and on the
 * grade relative to the climber's own level); whatever is left of the session duration is a *rest*
 * zone (belaying at the crag, or moving / recovering between boulder problems). `totalSessionDurationMinutes`, when missing or
 * non-positive, is replaced by a per-discipline fallback derived from the number of logged attempt
 * rows.
 *
 * Every zone is charged at **net METs** — `(grossMET − 1)`, the ACSM convention — because this figure
 * feeds `activityExtraKcal`, which is ADDED on top of the day's TDEE (TDEE already counts the resting
 * metabolic rate for all 24 h). Charging the gross MET would double-count ~1 MET over the whole
 * session; the rest zone in particular (gross 2.0 → net 1.0) is the part that used to look
 * surprisingly large.
 */
import { ClimbingDiscipline } from '../../../shared/climbing/grade-scale';

export type { ClimbingDiscipline };
export type ClimbingSafetyStyle = 'TOPROPE' | 'LEAD' | 'TRAD';

/**
 * Mászónapló.md "MET" table — **gross** METs, aligned with the 2024 Adult Compendium of Physical
 * Activities (Herrmann et al. 2024), Sports: 15537 "ascending or traversing rock, low-to-moderate
 * difficulty" 5.8; 15534 "free boulder" 8.8; 15535 "ascending rock, high difficulty" 7.3; standing /
 * belaying ≈ 2.0. A boulder go is charged by its difficulty *relative to the climber's own level*
 * (backlog/130): 5.8 well below the limit → 9.5 at the limit (between 15534 and the ~10 MET peak
 * measured in competitive bouldering). Rope lead is unchanged.
 */
export const CLIMBING_MET = {
  ACTIVE_BOULDER_EASY: 5.8,
  ACTIVE_BOULDER_LIMIT: 9.5,
  /** A go whose grade (or the climber's reference level) can't be resolved — Compendium 15534. */
  ACTIVE_BOULDER_UNGRADED: 8.8,
  ACTIVE_ROPE_LEAD: 7.0,
  /** Rope rest: belaying / standing at the crag. */
  REST: 2.0,
  /** Boulder rest: walking between problems, spotting, brushing, unlogged warm-up goes and the
   *  2–4 min of elevated cardiorespiratory recovery after each effort (backlog/130). */
  REST_BOULDER: 3.0,
  /** Applied to a following climber's *both* active seconds and active MET (Mászónapló.md — the
   *  deliberate double 0.8, ≈0.64× the leader). */
  SECOND_CLIMBER_FACTOR: 0.8,
} as const;

/**
 * 1 MET ≈ the resting metabolic rate. Every zone is charged `(grossMET − RESTING_MET)` so the result
 * is energy **above rest** — the correct thing to add to a TDEE that already includes 24 h of RMR.
 */
export const RESTING_MET = 1.0;

function netMet(grossMet: number): number {
  return Math.max(0, grossMet - RESTING_MET);
}

/** Mászónapló.md "Aktív idő" — 45 s per boulder go: the row's `attemptCount` (≥ 1) × this. */
export const BOULDER_SECONDS_PER_GO = 45;

/**
 * Mászónapló.md "Relatív nehézség" — the index band (4 V-grades: V steps are 2 index apart) over which
 * a boulder go ramps from `ACTIVE_BOULDER_EASY` (at or below `reference − band`) to
 * `ACTIVE_BOULDER_LIMIT` (at or above the reference).
 */
export const BOULDER_RELATIVE_BAND = 8;

/** Reference level used when the climber has no successful boulder in the look-back window (V5). */
export const DEFAULT_BOULDER_REFERENCE_INDEX = 20;

/** Mászónapló.md "Aktív idő" — rope active seconds per climbed metre, by safety style. */
export const ROPE_ACTIVE_SECONDS_PER_METER: Record<ClimbingSafetyStyle, number> = {
  TOPROPE: 25,
  LEAD: 45,
  TRAD: 60,
};

/** Mászónapló.md — TRAD adds ~6 kg of hardware to the *active* rope branch (rest stays at m). */
export const TRAD_HARDWARE_KG = 6;

export interface ClimbingPitchInput {
  readonly isLead: boolean;
  readonly lengthInMeters: number | null;
}

export interface ClimbingAttemptInput {
  readonly isSuccess: boolean;
  /** From the matrix; `null` when the grade could not be resolved (still counts for duration/time). */
  readonly absoluteDifficultyIndex: number | null;
  /** Boulder only: goes on this problem in the session; missing / < 1 → 1. Ignored for rope. */
  readonly attemptCount?: number | null;
  /** Rope only; defaults to `LEAD` when absent. */
  readonly safetyStyle?: ClimbingSafetyStyle | null;
  /** Rope single-pitch climbed length; ignored when `pitches` is non-empty. */
  readonly lengthInMeters?: number | null;
  /** Outdoor multi-pitch; when present its pitch lengths replace `lengthInMeters`. */
  readonly pitches?: readonly ClimbingPitchInput[] | null;
}

export interface ClimbingKcalInput {
  readonly discipline: ClimbingDiscipline;
  readonly totalSessionDurationMinutes: number | null;
  readonly pumpRating: number | null;
  readonly attempts: readonly ClimbingAttemptInput[];
  /**
   * Boulder only: the climber's level before this session — the highest successful boulder index in
   * the look-back window (`boulderReferenceIndex` in climbing-attempt-input.ts). `null` / missing →
   * `DEFAULT_BOULDER_REFERENCE_INDEX`. The session's own best send always raises it.
   */
  readonly referenceDifficultyIndex?: number | null;
}

/**
 * Mászónapló.md `pumpRating` multiplier on the *active* MET: piecewise-linear through
 * (1 → 0.8), (3 → 1.0), (5 → 1.3). Missing rating → 1.0. Input is clamped to [1, 5].
 */
export function pumpMultiplier(pumpRating: number | null | undefined): number {
  if (pumpRating == null || !Number.isFinite(pumpRating)) {
    return 1.0;
  }
  const r = Math.min(5, Math.max(1, pumpRating));
  return r <= 3 ? 0.8 + ((r - 1) / 2) * 0.2 : 1.0 + ((r - 3) / 2) * 0.3;
}

/**
 * Mászónapló.md "Duration fallback": logged attempt rows × 5 min (boulder) or × 15 min (rope).
 * This is the count of `AscentAttempt` rows, NOT the sum of their `attemptCount`.
 */
export function durationFallbackMinutes(
  discipline: ClimbingDiscipline,
  loggedAttemptCount: number,
): number {
  const perAttempt = discipline === 'BOULDER' ? 5 : 15;
  return Math.max(0, loggedAttemptCount) * perAttempt;
}

/** The session duration actually used by the model: the stored value if `> 0`, else the fallback. */
export function resolveSessionDurationMinutes(input: ClimbingKcalInput): number {
  const stored = input.totalSessionDurationMinutes;
  if (stored != null && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  return durationFallbackMinutes(input.discipline, input.attempts.length);
}

function ropeClimbedMeters(attempt: ClimbingAttemptInput): number {
  if (attempt.pitches && attempt.pitches.length > 0) {
    return attempt.pitches.reduce((sum, pitch) => sum + Math.max(0, pitch.lengthInMeters ?? 0), 0);
  }
  return Math.max(0, attempt.lengthInMeters ?? 0);
}

interface AttemptEnergy {
  readonly activeMinutes: number;
  readonly activeKcal: number;
}

/**
 * Mászónapló.md "Relatív nehézség" — the level a boulder go is measured against: the stored
 * reference (or the V5 default), raised to the session's own best send.
 */
export function resolveBoulderReferenceIndex(input: ClimbingKcalInput): number {
  let reference = input.referenceDifficultyIndex ?? DEFAULT_BOULDER_REFERENCE_INDEX;
  for (const attempt of input.attempts) {
    const index = attempt.absoluteDifficultyIndex;
    if (attempt.isSuccess && index != null && index > reference) {
      reference = index;
    }
  }
  return reference;
}

/** Gross active MET of one boulder go: linear from EASY (≤ reference − band) to LIMIT (≥ reference). */
export function boulderActiveMet(absoluteDifficultyIndex: number | null, referenceIndex: number): number {
  if (absoluteDifficultyIndex == null || absoluteDifficultyIndex <= 0) {
    return CLIMBING_MET.ACTIVE_BOULDER_UNGRADED;
  }
  const relative = (absoluteDifficultyIndex - (referenceIndex - BOULDER_RELATIVE_BAND)) / BOULDER_RELATIVE_BAND;
  const r = Math.min(1, Math.max(0, relative));
  return CLIMBING_MET.ACTIVE_BOULDER_EASY + r * (CLIMBING_MET.ACTIVE_BOULDER_LIMIT - CLIMBING_MET.ACTIVE_BOULDER_EASY);
}

/** A boulder row's go count: `attemptCount` when it is a positive number, else 1. */
export function boulderGoCount(attempt: ClimbingAttemptInput): number {
  const count = attempt.attemptCount;
  return count != null && Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1;
}

function attemptEnergy(
  attempt: ClimbingAttemptInput,
  discipline: ClimbingDiscipline,
  pump: number,
  bodyWeightKg: number,
  boulderReferenceIndex: number,
): AttemptEnergy {
  if (discipline === 'BOULDER') {
    const activeMinutes = (boulderGoCount(attempt) * BOULDER_SECONDS_PER_GO) / 60;
    const met = boulderActiveMet(attempt.absoluteDifficultyIndex, boulderReferenceIndex);
    const activeKcal = netMet(met * pump) * bodyWeightKg * (activeMinutes / 60);
    return { activeMinutes, activeKcal };
  }

  const safety: ClimbingSafetyStyle = attempt.safetyStyle ?? 'LEAD';
  const secondsPerMeter = ROPE_ACTIVE_SECONDS_PER_METER[safety];
  const activeWeightKg = safety === 'TRAD' ? bodyWeightKg + TRAD_HARDWARE_KG : bodyWeightKg;

  if (attempt.pitches && attempt.pitches.length > 0) {
    let activeMinutes = 0;
    let activeKcal = 0;
    for (const pitch of attempt.pitches) {
      const meters = Math.max(0, pitch.lengthInMeters ?? 0);
      const secondFactor = pitch.isLead ? 1 : CLIMBING_MET.SECOND_CLIMBER_FACTOR;
      const pitchMinutes = (meters * secondsPerMeter * secondFactor) / 60;
      const met = pitch.isLead
        ? CLIMBING_MET.ACTIVE_ROPE_LEAD
        : CLIMBING_MET.ACTIVE_ROPE_LEAD * CLIMBING_MET.SECOND_CLIMBER_FACTOR;
      activeMinutes += pitchMinutes;
      activeKcal += netMet(met * pump) * activeWeightKg * (pitchMinutes / 60);
    }
    return { activeMinutes, activeKcal };
  }

  const activeMinutes = (ropeClimbedMeters(attempt) * secondsPerMeter) / 60;
  const activeKcal = netMet(CLIMBING_MET.ACTIVE_ROPE_LEAD * pump) * activeWeightKg * (activeMinutes / 60);
  return { activeMinutes, activeKcal };
}

/**
 * Mászónapló.md canonical climbing kcal: Σ per-attempt active energy + a single rest term at
 * net MET (rope `2.0 − 1.0`, boulder `3.0 − 1.0`) over `max(0, sessionDuration − Σ activeMinutes)`. Body weight `m` is the
 * CURRENT profile weight, never frozen. Returns 0 when weight is missing / non-positive.
 */
export function climbingKcal(input: ClimbingKcalInput, bodyWeightKg: number | null): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  const pump = pumpMultiplier(input.pumpRating);
  const reference = input.discipline === 'BOULDER' ? resolveBoulderReferenceIndex(input) : 0;

  let totalActiveMinutes = 0;
  let activeKcal = 0;
  for (const attempt of input.attempts) {
    const energy = attemptEnergy(attempt, input.discipline, pump, bodyWeightKg, reference);
    totalActiveMinutes += energy.activeMinutes;
    activeKcal += energy.activeKcal;
  }

  const restMinutes = Math.max(0, resolveSessionDurationMinutes(input) - totalActiveMinutes);
  const restMet = input.discipline === 'BOULDER' ? CLIMBING_MET.REST_BOULDER : CLIMBING_MET.REST;
  const restKcal = netMet(restMet) * bodyWeightKg * (restMinutes / 60);
  return activeKcal + restKcal;
}

export interface ClimbingVolumeInput {
  readonly discipline: ClimbingDiscipline;
  readonly attempts: readonly ClimbingAttemptInput[];
}

/**
 * Mászónapló.md "Volumen" — summed over *successful* attempts, each carrying its own
 * `absoluteDifficultyIndex`:
 *  - Rope: Σ climbedMeters_i × I_i  (climbedMeters = `lengthInMeters` or the pitch-length sum)
 *  - Boulder: Σ 4 m × I_i
 * Attempts with an unresolved (`null` / non-positive) index are skipped.
 */
export function climbingVolume(input: ClimbingVolumeInput): number {
  let volume = 0;
  for (const attempt of input.attempts) {
    if (!attempt.isSuccess) {
      continue;
    }
    const index = attempt.absoluteDifficultyIndex;
    if (index == null || index <= 0) {
      continue;
    }
    volume += input.discipline === 'BOULDER' ? 4 * index : ropeClimbedMeters(attempt) * index;
  }
  return volume;
}
