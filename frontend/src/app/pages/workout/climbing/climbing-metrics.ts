/**
 * documentation/Features/Mászónapló.md "Kalória (kanonikus)" + "Volumen" — pure TS climbing energy
 * and volume model. No DOM, no Angular. The session stores no `calculatedCalories` (unlike Úszás /
 * Edzésnapló); `core/data/activity-kcal.ts` sums `climbingKcal` per day for the Étkezés dashboard's
 * `activityExtraKcal`, and the log form shows a live preview with the same function.
 *
 * The model is NOT `duration × MET`. Each logged attempt contributes an *active* zone (seconds that
 * depend on discipline / safety style / lead-or-second); whatever is left of the session duration is
 * a *rest* zone at MET 2.0. `totalSessionDurationMinutes`, when missing or non-positive, is replaced
 * by a per-discipline fallback derived from the number of logged attempt rows.
 */
import { ClimbingDiscipline } from '../../../shared/climbing/grade-scale';

export type { ClimbingDiscipline };
export type ClimbingSafetyStyle = 'TOPROPE' | 'LEAD' | 'TRAD';

/** Mászónapló.md "MET" table. */
export const CLIMBING_MET = {
  ACTIVE_BOULDER: 8.0,
  ACTIVE_ROPE_LEAD: 7.0,
  REST: 2.0,
  /** Applied to a following climber's *both* active seconds and active MET (Mászónapló.md — the
   *  deliberate double 0.8, ≈0.64× the leader). */
  SECOND_CLIMBER_FACTOR: 0.8,
} as const;

/** Mászónapló.md "Aktív idő" — fixed 60 s per logged boulder attempt (successful or not). */
export const BOULDER_ACTIVE_SECONDS = 60;

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

function attemptEnergy(
  attempt: ClimbingAttemptInput,
  discipline: ClimbingDiscipline,
  pump: number,
  bodyWeightKg: number,
): AttemptEnergy {
  if (discipline === 'BOULDER') {
    const activeMinutes = BOULDER_ACTIVE_SECONDS / 60;
    const activeKcal = CLIMBING_MET.ACTIVE_BOULDER * pump * bodyWeightKg * (activeMinutes / 60);
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
      activeKcal += met * pump * activeWeightKg * (pitchMinutes / 60);
    }
    return { activeMinutes, activeKcal };
  }

  const activeMinutes = (ropeClimbedMeters(attempt) * secondsPerMeter) / 60;
  const activeKcal = CLIMBING_MET.ACTIVE_ROPE_LEAD * pump * activeWeightKg * (activeMinutes / 60);
  return { activeMinutes, activeKcal };
}

/**
 * Mászónapló.md canonical climbing kcal: Σ per-attempt active energy + a single rest term at
 * MET 2.0 over `max(0, sessionDuration − Σ activeMinutes)`. Body weight `m` is the CURRENT profile
 * weight, never frozen. Returns 0 when weight is missing / non-positive.
 */
export function climbingKcal(input: ClimbingKcalInput, bodyWeightKg: number | null): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  const pump = pumpMultiplier(input.pumpRating);

  let totalActiveMinutes = 0;
  let activeKcal = 0;
  for (const attempt of input.attempts) {
    const energy = attemptEnergy(attempt, input.discipline, pump, bodyWeightKg);
    totalActiveMinutes += energy.activeMinutes;
    activeKcal += energy.activeKcal;
  }

  const restMinutes = Math.max(0, resolveSessionDurationMinutes(input) - totalActiveMinutes);
  const restKcal = CLIMBING_MET.REST * bodyWeightKg * (restMinutes / 60);
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
