/**
 * documentation/Subfeatures/Edzésnapló.md — pure TS metrics for a workout session: MET kcal, Epley
 * 1RM, per-exercise volume, PR detection, and "ghost values" (last time for the same exercise).
 * No DOM, no Angular — a plain function module so every rule has a direct unit test.
 *
 * The MET constants are the canonical ones from documentation/Features/Tápérték kalkulátor.md; the
 * activity-kcal producer that feeds the Étkezés dashboard (A4) will import `sessionKcal` from here.
 */
import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import { normalizeName } from '../../../shared/name-normalization';

/** documentation/Features/Tápérték kalkulátor.md "Erőedzés": MET per workoutType. */
export const WORKOUT_MET: Record<WorkoutSession.WorkoutTypeEnum, number> = {
  [WorkoutSession.WorkoutTypeEnum.GeneralWeights]: 5.0,
  [WorkoutSession.WorkoutTypeEnum.HiitCircuit]: 8.0,
};

/** documentation/Subfeatures/Edzésnapló.md "Hiányzó időtartam fallback": szettek száma × 3 perc. */
export const SET_ESTIMATE_MINUTES = 3;

const EPLEY_MIN_REPS = 1;
const EPLEY_MAX_REPS = 12;

/** documentation/Subfeatures/Edzésnapló.md "Volumen és PR": WARMUP + REST_PAUSE kizárva. */
const VOLUME_SET_TYPES: ReadonlySet<WorkoutSetEntry.SetTypeEnum> = new Set<WorkoutSetEntry.SetTypeEnum>([
  WorkoutSetEntry.SetTypeEnum.Working,
  WorkoutSetEntry.SetTypeEnum.Dropset,
  WorkoutSetEntry.SetTypeEnum.Failure,
]);

export function liveExercises(session: WorkoutSession): WorkoutExerciseEntry[] {
  return session.exercises.filter((exercise) => !exercise.deleted).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function liveSets(exercise: WorkoutExerciseEntry): WorkoutSetEntry[] {
  return exercise.sets.filter((set) => !set.deleted).sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Total live set count across every live exercise — the fallback-duration basis. */
export function totalSetCount(session: WorkoutSession): number {
  return liveExercises(session).reduce((sum, exercise) => sum + liveSets(exercise).length, 0);
}

function minutesBetween(startTime: string | null | undefined, endTime: string | null | undefined): number | null {
  if (!startTime || !endTime) {
    return null;
  }
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

/**
 * documentation/Subfeatures/Edzésnapló.md "durationMinutes": the manual override wins; otherwise
 * endTime − startTime; otherwise the set-count estimate. 0 when nothing is available (no sets, no
 * times) — callers treat that as "no kcal contribution".
 */
export function effectiveDurationMinutes(session: WorkoutSession): number {
  if (session.durationMinutes != null && session.durationMinutes > 0) {
    return session.durationMinutes;
  }
  const fromTimes = minutesBetween(session.startTime, session.endTime);
  if (fromTimes !== null) {
    return fromTimes;
  }
  return totalSetCount(session) * SET_ESTIMATE_MINUTES;
}

/**
 * documentation/Features/Tápérték kalkulátor.md canonical: kcal = MET(workoutType) × m ×
 * durationMinutes / 60. `m` is the CURRENT profile weight, never frozen into the session. Returns 0
 * when weight is missing/non-positive or the effective duration is 0.
 */
export function sessionKcal(session: WorkoutSession, bodyWeightKg: number | null): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  const minutes = effectiveDurationMinutes(session);
  if (minutes <= 0) {
    return 0;
  }
  return WORKOUT_MET[session.workoutType] * bodyWeightKg * (minutes / 60);
}

/**
 * documentation/Subfeatures/Edzésnapló.md "1RM becslés (Epley)": w × (1 + r/30), only valid for
 * r ∈ [1, 12]. Returns null outside that range or when weight/reps are missing or non-positive.
 */
export function epley1Rm(weightKg: number | null | undefined, reps: number | null | undefined): number | null {
  if (weightKg == null || reps == null || weightKg <= 0 || reps < EPLEY_MIN_REPS || reps > EPLEY_MAX_REPS) {
    return null;
  }
  return weightKg * (1 + reps / 30);
}

/** documentation/Subfeatures/Edzésnapló.md "Volumen": Σ(reps × weightKg) over WORKING/DROPSET/FAILURE live sets. */
export function exerciseVolume(exercise: WorkoutExerciseEntry): number {
  return liveSets(exercise)
    .filter((set) => VOLUME_SET_TYPES.has(set.setType))
    .reduce((sum, set) => sum + (set.reps ?? 0) * (set.weightKg ?? 0), 0);
}

export function sessionVolume(session: WorkoutSession): number {
  return liveExercises(session).reduce((sum, exercise) => sum + exerciseVolume(exercise), 0);
}

export interface ExercisePrValues {
  /** Best Epley 1RM across the exercise's counted sets, or null when no set qualifies. */
  best1Rm: number | null;
  /** Heaviest weightKg across the counted sets (assist/negative ignored), or null. */
  maxWeightKg: number | null;
  /** Σ(reps × weightKg) for this one exercise entry. */
  volume: number;
}

/** PR-relevant aggregates for one exercise entry, over its WORKING/DROPSET/FAILURE live sets. */
export function exercisePrValues(exercise: WorkoutExerciseEntry): ExercisePrValues {
  const countedSets = liveSets(exercise).filter((set) => VOLUME_SET_TYPES.has(set.setType));
  let best1Rm: number | null = null;
  let maxWeightKg: number | null = null;
  for (const set of countedSets) {
    const oneRm = epley1Rm(set.weightKg, set.reps);
    if (oneRm !== null && (best1Rm === null || oneRm > best1Rm)) {
      best1Rm = oneRm;
    }
    if (set.weightKg != null && set.weightKg > 0 && (maxWeightKg === null || set.weightKg > maxWeightKg)) {
      maxWeightKg = set.weightKg;
    }
  }
  return { best1Rm, maxWeightKg, volume: exerciseVolume(exercise) };
}

export interface PrFlags {
  new1Rm: boolean;
  newMaxWeight: boolean;
  newMaxVolume: boolean;
}

function matchesExercise(entry: WorkoutExerciseEntry, exerciseId: string | null, exerciseName: string): boolean {
  if (exerciseId !== null && entry.exerciseId != null) {
    return entry.exerciseId === exerciseId;
  }
  return normalizeName(entry.exerciseName) === normalizeName(exerciseName);
}

/**
 * Every prior live entry for the same exercise (matched by `exerciseId`, or normalized name for
 * ad-hoc), newest session first, excluding `exceptSessionId` (the one being edited). `priorSessions`
 * may include the session under edit — it's filtered out here.
 */
function priorEntriesFor(
  priorSessions: readonly WorkoutSession[],
  exerciseId: string | null,
  exerciseName: string,
  exceptSessionId?: string,
): { session: WorkoutSession; entry: WorkoutExerciseEntry }[] {
  const sessions = priorSessions
    .filter((session) => !session.deleted && session.id !== exceptSessionId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const result: { session: WorkoutSession; entry: WorkoutExerciseEntry }[] = [];
  for (const session of sessions) {
    for (const entry of liveExercises(session)) {
      if (matchesExercise(entry, exerciseId, exerciseName)) {
        result.push({ session, entry });
      }
    }
  }
  return result;
}

/**
 * documentation/Subfeatures/Edzésnapló.md "PR típusok": is the current entry a new best on any of
 * calculated 1RM / max weight / max volume, versus every prior session's entry for the same exercise?
 * With no history, nothing is a PR (a first-ever entry is not a "megdöntés").
 */
export function detectPrs(
  priorSessions: readonly WorkoutSession[],
  current: WorkoutExerciseEntry,
  exceptSessionId?: string,
): PrFlags {
  const history = priorEntriesFor(priorSessions, current.exerciseId ?? null, current.exerciseName, exceptSessionId);
  if (history.length === 0) {
    return { new1Rm: false, newMaxWeight: false, newMaxVolume: false };
  }
  const currentPrs = exercisePrValues(current);
  // Only a metric the history actually has a comparable value for can be "megdöntve" — a first-ever
  // measurable 1RM / weight / volume is not a PR against a blank record.
  let priorBest1Rm: number | null = null;
  let priorBestWeight: number | null = null;
  let priorBestVolume: number | null = null;
  for (const { entry } of history) {
    const prs = exercisePrValues(entry);
    if (prs.best1Rm !== null) {
      priorBest1Rm = Math.max(priorBest1Rm ?? 0, prs.best1Rm);
    }
    if (prs.maxWeightKg !== null) {
      priorBestWeight = Math.max(priorBestWeight ?? 0, prs.maxWeightKg);
    }
    if (prs.volume > 0) {
      priorBestVolume = Math.max(priorBestVolume ?? 0, prs.volume);
    }
  }
  return {
    new1Rm: priorBest1Rm !== null && currentPrs.best1Rm !== null && currentPrs.best1Rm > priorBest1Rm,
    newMaxWeight: priorBestWeight !== null && currentPrs.maxWeightKg !== null && currentPrs.maxWeightKg > priorBestWeight,
    newMaxVolume: priorBestVolume !== null && currentPrs.volume > priorBestVolume,
  };
}

export interface GhostSet {
  weightKg: number | null;
  reps: number | null;
  holdTimeSeconds: number | null;
}

export interface GhostValue {
  sessionDate: string;
  /** The most telling set of that entry — heaviest counted set, else the top set by reps / hold time. */
  topSet: GhostSet | null;
}

function pickTopSet(entry: WorkoutExerciseEntry): GhostSet | null {
  const sets = liveSets(entry);
  if (sets.length === 0) {
    return null;
  }
  const counted = sets.filter((set) => VOLUME_SET_TYPES.has(set.setType));
  const pool = counted.length > 0 ? counted : sets;
  const best = pool.reduce((a, b) => {
    const aw = a.weightKg ?? -Infinity;
    const bw = b.weightKg ?? -Infinity;
    if (aw !== bw) {
      return aw > bw ? a : b;
    }
    const ar = (a.reps ?? 0) + (a.holdTimeSeconds ?? 0);
    const br = (b.reps ?? 0) + (b.holdTimeSeconds ?? 0);
    return br > ar ? b : a;
  });
  return { weightKg: best.weightKg ?? null, reps: best.reps ?? null, holdTimeSeconds: best.holdTimeSeconds ?? null };
}

/**
 * documentation/Subfeatures/Edzésnapló.md "Statisztika: ghost values" — the last time this exercise
 * was done (a prior session), with its top set for the "80 kg × 8" hint. Null when there is no
 * history.
 */
export function ghostForExercise(
  priorSessions: readonly WorkoutSession[],
  exerciseId: string | null,
  exerciseName: string,
  exceptSessionId?: string,
): GhostValue | null {
  const [mostRecent] = priorEntriesFor(priorSessions, exerciseId, exerciseName, exceptSessionId);
  if (!mostRecent) {
    return null;
  }
  return { sessionDate: mostRecent.session.date, topSet: pickTopSet(mostRecent.entry) };
}
