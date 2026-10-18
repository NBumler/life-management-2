/**
 * documentation/Subfeatures/Edzésnapló.md — pure TS metrics for a workout session: MET kcal, Epley
 * 1RM, per-exercise volume, PR detection, and "ghost values" (last time for the same exercise).
 * No DOM, no Angular — a plain function module so every rule has a direct unit test.
 *
 * The MET constants are the canonical ones from documentation/Features/Tápérték kalkulátor.md; the
 * activity-kcal producer that feeds the Étkezés dashboard (A4) will import `sessionKcal` from here.
 *
 * backlog/173: a GENERAL_WEIGHTS session with sets is charged as time under load (reps × 3 s or the
 * hold time, at a muscle-group MET, RPE-scaled) plus rest. Every set opens a 2.5-minute recovery
 * window at an elevated rest MET; rest beyond the windows drops to the idle 1.5 (same shape as the
 * climbing rest model, backlog/171). The window equals the fallback 3 min/set minus a typical 30 s
 * set, so a fallback-duration session is never thinned.
 */
import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import { normalizeName } from '../../../shared/name-normalization';
import { netMet } from '../../../shared/net-met';

/**
 * documentation/Features/Tápérték kalkulátor.md "Erőedzés": **gross** flat MET per workoutType (charged
 * net, backlog/164). GENERAL_WEIGHTS only uses it for a session without sets (backlog/173).
 */
export const WORKOUT_MET: Record<WorkoutSession.WorkoutTypeEnum, number> = {
  [WorkoutSession.WorkoutTypeEnum.GeneralWeights]: 4.0,
  [WorkoutSession.WorkoutTypeEnum.HiitCircuit]: 8.0,
};

/** backlog/173 — muscle-mass class of an exercise; drives the in-set and the recovery MET. */
export type MuscleClass = 'LARGE' | 'MEDIUM' | 'SMALL' | 'CARDIO';

/** backlog/173 — gross MET under load / in the recovery window, per muscle class. */
export const SET_MET: Record<MuscleClass, { active: number; recovery: number }> = {
  LARGE: { active: 8.0, recovery: 3.0 },
  MEDIUM: { active: 6.0, recovery: 2.5 },
  SMALL: { active: 5.0, recovery: 2.5 },
  CARDIO: { active: 7.0, recovery: 3.0 },
};

/** backlog/173 — gross MET of rest beyond every recovery window (standing / chatting in the gym). */
export const IDLE_MET = 1.5;

/** backlog/173 — recovery window opened by each set. */
export const RECOVERY_MINUTES_PER_SET = 2.5;

/** backlog/173 — time under load per repetition (≈ 1 s concentric + 2 s eccentric). */
export const REP_SECONDS = 3;

/** backlog/173 — time under load of a set without reps / hold time (≈ 10 reps; a hangboard hang ≈ 10 s). */
const DEFAULT_SET_SECONDS = 30;
const DEFAULT_HANG_SECONDS = 10;

/** backlog/173 — RPE scales the in-set MET by ±5 % per point around RPE 8 (6 → 0.9, 10 → 1.1). */
const RPE_NEUTRAL = 8;
const RPE_STEP = 0.05;

const CATEGORY_CLASS: Record<WorkoutExerciseEntry.ExerciseCategoryEnum, MuscleClass> = {
  LEGS: 'LARGE',
  BACK: 'LARGE',
  FULL_BODY: 'LARGE',
  HIPS: 'LARGE',
  CHEST: 'MEDIUM',
  SHOULDERS: 'MEDIUM',
  LOWER_BACK: 'MEDIUM',
  BICEPS: 'SMALL',
  TRICEPS: 'SMALL',
  ABS: 'SMALL',
  OBLIQUES: 'SMALL',
  NECK: 'SMALL',
  FOREARM_FINGERS: 'SMALL',
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

/** backlog/173 — the muscle class of an exercise: cardio / hangboard by kind, otherwise by category. */
export function muscleClass(exercise: WorkoutExerciseEntry): MuscleClass {
  if (exercise.exerciseKind === WorkoutExerciseEntry.ExerciseKindEnum.CardioTimeDist) {
    return 'CARDIO';
  }
  if (exercise.exerciseKind === WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch) {
    return 'SMALL';
  }
  return CATEGORY_CLASS[exercise.exerciseCategory] ?? 'MEDIUM';
}

/** backlog/173 — seconds under load: hold time (× reps for repeaters), else reps × 3 s, else a default. */
export function setLoadSeconds(exercise: WorkoutExerciseEntry, set: WorkoutSetEntry): number {
  const reps = set.reps != null && set.reps > 0 ? set.reps : null;
  if (set.holdTimeSeconds != null && set.holdTimeSeconds > 0) {
    return set.holdTimeSeconds * (reps ?? 1);
  }
  if (reps !== null) {
    return reps * REP_SECONDS;
  }
  return exercise.exerciseKind === WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch
    ? DEFAULT_HANG_SECONDS
    : DEFAULT_SET_SECONDS;
}

/** backlog/173 — RPE multiplier on the in-set MET; 1 without RPE and for warm-up sets. */
export function rpeFactor(set: WorkoutSetEntry): number {
  if (set.rpe == null || set.setType === WorkoutSetEntry.SetTypeEnum.Warmup) {
    return 1;
  }
  return 1 + (set.rpe - RPE_NEUTRAL) * RPE_STEP;
}

/**
 * backlog/173 — net MET-minutes of a GENERAL_WEIGHTS session with sets: Σ load minutes × net in-set
 * MET, plus rest = duration − Σ load at the idle level, plus each set's recovery window
 * (recovery − idle). When the windows exceed the rest they are scaled down proportionally.
 */
function setBasedNetMetMinutes(session: WorkoutSession, minutes: number): number {
  const sets = liveExercises(session).reduce<{ set: WorkoutSetEntry; cls: MuscleClass; loadMinutes: number }[]>(
    (acc, exercise) =>
      acc.concat(
        liveSets(exercise).map((set) => ({ set, cls: muscleClass(exercise), loadMinutes: setLoadSeconds(exercise, set) / 60 })),
      ),
    [],
  );
  const rawLoadMinutes = sets.reduce((sum, { loadMinutes }) => sum + loadMinutes, 0);
  // Never charge more time under load than the session lasted.
  const loadScale = rawLoadMinutes > minutes ? minutes / rawLoadMinutes : 1;
  const active = sets.reduce(
    (sum, { set, cls, loadMinutes }) => sum + loadMinutes * loadScale * netMet(SET_MET[cls].active * rpeFactor(set)),
    0,
  );
  const restMinutes = minutes - rawLoadMinutes * loadScale;
  if (restMinutes <= 0) {
    return active;
  }
  const windowScale = Math.min(1, restMinutes / (sets.length * RECOVERY_MINUTES_PER_SET));
  const recoveryExtra = sets.reduce(
    (sum, { cls }) => sum + RECOVERY_MINUTES_PER_SET * windowScale * (SET_MET[cls].recovery - IDLE_MET),
    0,
  );
  return active + restMinutes * netMet(IDLE_MET) + recoveryExtra;
}

/**
 * documentation/Features/Tápérték kalkulátor.md canonical, net MET (`shared/net-met.ts`,
 * backlog/164). GENERAL_WEIGHTS with sets: the set-based model (backlog/173); otherwise
 * (MET(workoutType) − 1) × m × durationMinutes / 60. `m` is the CURRENT profile weight, never frozen
 * into the session. Returns 0 when weight is missing/non-positive or the effective duration is 0.
 */
export function sessionKcal(session: WorkoutSession, bodyWeightKg: number | null): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  const minutes = effectiveDurationMinutes(session);
  if (minutes <= 0) {
    return 0;
  }
  if (session.workoutType === WorkoutSession.WorkoutTypeEnum.GeneralWeights && totalSetCount(session) > 0) {
    return (setBasedNetMetMinutes(session, minutes) * bodyWeightKg) / 60;
  }
  return netMet(WORKOUT_MET[session.workoutType]) * bodyWeightKg * (minutes / 60);
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

export interface LastSet extends GhostSet {
  setType: WorkoutSetEntry.SetTypeEnum;
  /** backlog/134 — the hand of a one-sided set; null = both. */
  side?: WorkoutSetEntry.SideEnum | null;
  /** backlog/135 — the logged RPE, when recorded. */
  rpe?: number | null;
}

export interface LastPerformance {
  sessionDate: string;
  /** The counted (WORKING / DROPSET / FAILURE) sets of that entry in order; every live set if none is counted. */
  sets: LastSet[];
}

/**
 * backlog/131 — the Active Workout "Legutóbb" line: the most recent prior entry for the same exercise
 * with all of its counted sets (not just the top one, so "3 × 5 @ 22.5 kg" is visible at a glance).
 */
export function lastPerformance(
  priorSessions: readonly WorkoutSession[],
  exerciseId: string | null,
  exerciseName: string,
  exceptSessionId?: string,
): LastPerformance | null {
  const [mostRecent] = priorEntriesFor(priorSessions, exerciseId, exerciseName, exceptSessionId);
  if (!mostRecent) {
    return null;
  }
  const sets = liveSets(mostRecent.entry);
  const counted = sets.filter((set) => VOLUME_SET_TYPES.has(set.setType));
  const pool = counted.length > 0 ? counted : sets;
  if (pool.length === 0) {
    return null;
  }
  return {
    sessionDate: mostRecent.session.date,
    sets: pool.map((set) => ({
      setType: set.setType,
      weightKg: set.weightKg ?? null,
      reps: set.reps ?? null,
      holdTimeSeconds: set.holdTimeSeconds ?? null,
      side: set.side ?? null,
      rpe: set.rpe ?? null,
    })),
  };
}

function formatKg(value: number): string {
  return `${Math.round(value * 100) / 100}`;
}

function setToken(set: GhostSet & { side?: string | null }): string {
  const parts: string[] = [];
  if (set.side === 'LEFT' || set.side === 'RIGHT') {
    parts.push(set.side === 'LEFT' ? '◀' : '▶');
  }
  if (set.reps !== null) {
    parts.push(`${set.reps}`);
  }
  if (set.holdTimeSeconds !== null) {
    parts.push(`${set.holdTimeSeconds} s`);
  }
  if (set.weightKg !== null && set.weightKg !== 0) {
    parts.push(`@ ${formatKg(set.weightKg)} kg`);
  }
  return parts.join(' ');
}

/**
 * backlog/131 — compact set summary: identical sets collapse to "3 × 5 @ 22.5 kg"; otherwise the sets
 * are listed "5 @ 22.5 kg · 4 @ 22.5 kg". Units are the model's fixed kg / s (no localisation needed).
 */
export function formatSetSummary(sets: readonly (GhostSet & { side?: string | null })[]): string {
  const tokens = sets.map(setToken).filter((token) => token !== '');
  if (tokens.length === 0) {
    return '';
  }
  if (tokens.length > 1 && tokens.every((token) => token === tokens[0])) {
    return `${tokens.length} × ${tokens[0]}`;
  }
  return tokens.join(' · ');
}

/** backlog/131 — the double-progression step (dumbbell / belt plate). */
export const PROGRESSION_STEP_KG = 2.5;

/** backlog/135 — an RPE at or above this means the set went to the limit: no weight increase next time. */
export const PROGRESSION_MAX_RPE = 10;

/**
 * backlog/131 "double progression": when every WORKING set last time reached the top of the target
 * rep range, suggest the last working weight + 2.5 kg (for an assisted, negative weight that means
 * 2.5 kg less assistance). Null without a range target, without WORKING sets, when any of them fell
 * short or had no weight, or (backlog/135) when any was logged at RPE 10. `side` (backlog/134)
 * narrows the judgement to that hand's WORKING sets (`null` = the both-hands sets).
 */
export function progressionSuggestion(
  last: LastPerformance | null,
  repsMax: number | null,
  side: WorkoutSetEntry.SideEnum | null = null,
): number | null {
  if (last === null || repsMax === null) {
    return null;
  }
  const working = last.sets.filter(
    (set) => set.setType === WorkoutSetEntry.SetTypeEnum.Working && (set.side ?? null) === side,
  );
  if (
    working.length === 0 ||
    working.some(
      (set) => set.reps === null || set.reps < repsMax || set.weightKg === null || (set.rpe ?? 0) >= PROGRESSION_MAX_RPE,
    )
  ) {
    return null;
  }
  const base = Math.max(...working.map((set) => set.weightKg as number));
  const next = Math.round((base + PROGRESSION_STEP_KG) * 100) / 100;
  return next === 0 ? 0 : next;
}
