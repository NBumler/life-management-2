/**
 * documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" (backlog/168) — the time a stretching plan
 * takes. Shared by the template editor's total, the list row and (backlog/170) the "~N perc" offer.
 * The live session (backlog/169) builds its timeline from the same per-item rule.
 */

/** Seconds of "get ready / switch side" between two holds (and before the first one). */
export const STRETCH_TRANSITION_SECONDS = 5;

export interface StretchTimingItem {
  holdSeconds: number;
  perSide: boolean;
  repetitions: number;
}

/** Number of holds an item runs: `repetitions`, doubled when it goes left then right. */
export function stretchItemHolds(item: StretchTimingItem): number {
  return Math.max(1, item.repetitions) * (item.perSide ? 2 : 1);
}

/** Pure holding time of one item, without transitions. */
export function stretchItemSeconds(item: StretchTimingItem): number {
  return Math.max(0, item.holdSeconds) * stretchItemHolds(item);
}

/** Whole plan: every hold, plus one transition before each hold. 0 for an empty plan. */
export function stretchPlanDurationSeconds(items: readonly StretchTimingItem[]): number {
  return items.reduce((total, item) => total + stretchItemSeconds(item) + stretchItemHolds(item) * STRETCH_TRANSITION_SECONDS, 0);
}

/** Rounded up to whole minutes, at least 1 for a non-empty plan ("~N perc"). */
export function stretchPlanDurationMinutes(items: readonly StretchTimingItem[]): number {
  const seconds = stretchPlanDurationSeconds(items);
  return seconds === 0 ? 0 : Math.max(1, Math.ceil(seconds / 60));
}
