import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../api/model/workoutSetEntry';

/**
 * documentation/Subfeatures/Edzésnapló.md "Élő vs utólagos mód / Draft" — the one in-progress live
 * session. It is **not** an outbox row: only "Befejezés" turns it into a `WorkoutSessionDraft` and
 * enqueues it (`WorkoutSessionRepository.save`). Until then it is device-local state that has to
 * survive an app kill / tab switch.
 *
 * Stored via `@capacitor/preferences` (localStorage on web, native prefs on device) under a single
 * key — the same "small device-local state" mechanism `ThemeService` / `LanguageService` already use,
 * and lighter than a dedicated SQLite table + storage-backend surface for a value there is only ever
 * one of. The blob is a superset of the persisted session fields plus the live-only stopwatch base.
 */
export interface ActiveSetDraft {
  id: string;
  setType: WorkoutSetEntry.SetTypeEnum;
  reps: number | null;
  weightKg: number | null;
  holdTimeSeconds: number | null;
  edgeSizeMm: number | null;
  distanceMeters: number | null;
  restTimeSeconds: number | null;
  isCompleted: boolean;
}

export interface ActiveExerciseDraft {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum;
  exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum;
  supersetGroup: number | null;
  /** Snapshot of the catalog row's `defaultRestTimeSeconds` at add time — the rest-timer fallback. */
  defaultRestTimeSeconds: number | null;
  sets: ActiveSetDraft[];
}

export interface ActiveWorkoutDraft {
  /** Client UUID v4 generated when the live session starts; reused as the session id on finish. */
  sessionId: string;
  /** `Date.now()` at start — the stopwatch base, so elapsed time is correct after an app kill. */
  startedAtMs: number;
  /** `today()` (client calendar day) captured at start. */
  date: string;
  workoutType: WorkoutSession.WorkoutTypeEnum;
  title: string | null;
  location: WorkoutSession.LocationEnum | null;
  notes: string | null;
  planId: string | null;
  /** `HIIT_CIRCUIT` only — target round count. */
  roundsCount: number | null;
  /** `HIIT_CIRCUIT` only — which round the UI is on (advanced by "Következő kör"). */
  currentRound: number;
  exercises: ActiveExerciseDraft[];
}

const PREFERENCES_KEY = 'lm2_workout_draft';

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over the draft store. */
@Injectable({ providedIn: 'root' })
export class WorkoutDraftService {
  /** The current live draft, or null. Kept in sync with Preferences by every method below. */
  readonly draft = signal<ActiveWorkoutDraft | null>(null);
  readonly hasDraft = computed(() => this.draft() !== null);

  /** Re-reads the persisted draft into the signal — call on entry to any screen that shows it. */
  async refresh(): Promise<void> {
    const stored = await Preferences.get({ key: PREFERENCES_KEY });
    this.draft.set(stored.value ? (JSON.parse(stored.value) as ActiveWorkoutDraft) : null);
  }

  /** Persists the draft and updates the signal. Called after every live-session mutation. */
  async write(draft: ActiveWorkoutDraft): Promise<void> {
    this.draft.set(draft);
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(draft) });
  }

  /** Drops the draft (on "Befejezés" after the enqueue, or on "Elvetés"). */
  async clear(): Promise<void> {
    this.draft.set(null);
    await Preferences.remove({ key: PREFERENCES_KEY });
  }
}
