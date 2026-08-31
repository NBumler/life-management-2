/**
 * documentation/Features/Mászónapló.md "Kalória (kanonikus)" / "Volumen" — the one adapter from the
 * generated `AscentAttempt` model to a `climbing-metrics` / `climbing-stats` input. Carries the
 * resolved grade index, safety style, single-pitch length AND the live pitch list (pitch lengths
 * win over `lengthInMeters` in both the kcal and the volume model).
 *
 * `climbing-metrics.ts` stays API-model-free on purpose (pure numeric model, parity-tested); this is
 * the single place that knows the `AscentAttempt` / `PitchLog` shape, so the daily kcal sum
 * (`core/data/activity-kcal.ts`), the stats screen (`climbing-stats.ts`) and the per-context session
 * list (`naplo/climbing-session-list.page.ts`) all feed the model identically. Callers drop
 * soft-deleted attempts themselves: `attempts.filter((a) => !a.deleted).map(climbingAttemptInput)`.
 */
import { AscentAttempt } from '../../../api/model/ascentAttempt';

import { ClimbingAttemptInput } from './climbing-metrics';

export function climbingAttemptInput(attempt: AscentAttempt): ClimbingAttemptInput {
  const pitches = (attempt.pitches ?? []).filter((pitch) => !pitch.deleted);
  return {
    isSuccess: attempt.isSuccess,
    absoluteDifficultyIndex: attempt.absoluteDifficultyIndex ?? null,
    safetyStyle: attempt.safetyStyle ?? null,
    lengthInMeters: attempt.lengthInMeters ?? null,
    pitches:
      pitches.length > 0
        ? pitches.map((pitch) => ({ isLead: pitch.isLead, lengthInMeters: pitch.lengthInMeters ?? null }))
        : null,
  };
}
