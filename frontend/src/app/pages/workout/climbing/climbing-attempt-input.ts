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
import { ClimbingSession } from '../../../api/model/climbingSession';

import { ClimbingAttemptInput, ClimbingKcalInput } from './climbing-metrics';

/** Mászónapló.md "Relatív nehézség" — how far back the climber's boulder reference level looks. */
export const BOULDER_REFERENCE_WINDOW_DAYS = 90;

export function climbingAttemptInput(attempt: AscentAttempt): ClimbingAttemptInput {
  const pitches = (attempt.pitches ?? []).filter((pitch) => !pitch.deleted);
  return {
    isSuccess: attempt.isSuccess,
    absoluteDifficultyIndex: attempt.absoluteDifficultyIndex ?? null,
    attemptCount: attempt.attemptCount ?? null,
    safetyStyle: attempt.safetyStyle ?? null,
    lengthInMeters: attempt.lengthInMeters ?? null,
    pitches:
      pitches.length > 0
        ? pitches.map((pitch) => ({ isLead: pitch.isLead, lengthInMeters: pitch.lengthInMeters ?? null }))
        : null,
  };
}

/**
 * Mászónapló.md "Relatív nehézség" — the climber's boulder level on `date`: the highest
 * `absoluteDifficultyIndex` of a live, successful attempt in any live BOULDER session (indoor or
 * outdoor) dated within the {@link BOULDER_REFERENCE_WINDOW_DAYS} days up to and including `date`.
 * `excludeSessionId` leaves out the session being scored (its own sends are added by the model).
 * `null` when there is none — the model then falls back to its default reference.
 */
export function boulderReferenceIndex(
  sessions: readonly ClimbingSession[],
  date: string,
  excludeSessionId?: string | null,
): number | null {
  const from = shiftIsoDate(date, -BOULDER_REFERENCE_WINDOW_DAYS);
  let best: number | null = null;
  for (const session of sessions) {
    if (session.deleted || session.discipline !== ClimbingSession.DisciplineEnum.Boulder || session.id === excludeSessionId) {
      continue;
    }
    if (session.date < from || session.date > date) {
      continue;
    }
    for (const attempt of session.attempts) {
      const index = attempt.absoluteDifficultyIndex;
      if (!attempt.deleted && attempt.isSuccess && index != null && (best === null || index > best)) {
        best = index;
      }
    }
  }
  return best;
}

/**
 * The full `climbingKcal` input of a stored session — attempts through {@link climbingAttemptInput},
 * the boulder reference level from `allSessions` — so the daily total, the session list and the
 * stats all score a session identically.
 */
export function climbingSessionKcalInput(session: ClimbingSession, allSessions: readonly ClimbingSession[]): ClimbingKcalInput {
  return {
    discipline: session.discipline,
    totalSessionDurationMinutes: session.totalSessionDurationMinutes ?? null,
    pumpRating: session.pumpRating ?? null,
    attempts: session.attempts.filter((attempt) => !attempt.deleted).map(climbingAttemptInput),
    referenceDifficultyIndex:
      session.discipline === ClimbingSession.DisciplineEnum.Boulder ? boulderReferenceIndex(allSessions, session.date, session.id) : null,
  };
}

function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}
