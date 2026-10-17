import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { StretchSessionItem } from '../../api/model/stretchSessionItem';

/**
 * documentation/Subfeatures/Nyújtás.md "Draft" (backlog/169) — the one in-progress live stretching
 * session. Like `WorkoutDraftService` it is not an outbox row: only "Befejezés" turns it into a
 * `StretchSessionDraft` and saves it. Device-local (`@capacitor/preferences`) so it survives an app kill.
 * Written on every phase change / pause, never per tick. Independent of the strength-workout draft.
 */
export interface ActiveStretchItemDraft {
  id: string;
  stretchExerciseId: string | null;
  stretchName: string;
  stretchCategory: StretchSessionItem.StretchCategoryEnum;
  holdSeconds: number;
  perSide: boolean;
  repetitions: number;
  /** Display-only cue from the template item / the exercise's description; never saved. */
  hint?: string | null;
}

export interface ActiveStretchDraft {
  /** Client UUID v4 generated at start; reused as the session id on finish. */
  sessionId: string;
  /** `Date.now()` at start — the session's wall-clock base. */
  startedAtMs: number;
  /** `today()` captured at start. */
  date: string;
  stretchPlanId: string | null;
  /** backlog/170 — the strength session this stretch follows (null = standalone). */
  workoutSessionId: string | null;
  items: ActiveStretchItemDraft[];
  /** Index into the timeline built from `items` (`stretch-timeline.ts`). */
  phaseIndex: number;
  /** Seconds left of the current phase when the draft was written. */
  phaseRemainingSeconds: number;
  /** Indexes of the stretches skipped with "Kihagyás" — saved as `completed = false`. */
  skippedItems: number[];
}

const PREFERENCES_KEY = 'lm2_stretch_draft';

@Injectable({ providedIn: 'root' })
export class StretchDraftService {
  readonly draft = signal<ActiveStretchDraft | null>(null);
  readonly hasDraft = computed(() => this.draft() !== null);

  async refresh(): Promise<void> {
    const stored = await Preferences.get({ key: PREFERENCES_KEY });
    this.draft.set(stored.value ? (JSON.parse(stored.value) as ActiveStretchDraft) : null);
  }

  async write(draft: ActiveStretchDraft): Promise<void> {
    this.draft.set(draft);
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(draft) });
  }

  async clear(): Promise<void> {
    this.draft.set(null);
    await Preferences.remove({ key: PREFERENCES_KEY });
  }
}
