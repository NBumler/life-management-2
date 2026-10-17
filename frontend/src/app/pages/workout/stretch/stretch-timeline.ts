/**
 * documentation/Subfeatures/Nyújtás.md "Élő, vezetett nézet" (backlog/169) — pure TS, no Angular.
 * Turns a session's stretches into a flat list of timed phases the live view steps through:
 * before every hold a short "get ready / switch side" transition, then the hold itself. A per-side
 * stretch runs left, then right; `repetitions` repeats that.
 */
import { STRETCH_TRANSITION_SECONDS, StretchTimingItem } from './stretch-timing';

export type StretchSide = 'LEFT' | 'RIGHT';

export interface StretchPhase {
  /** Index of the stretch in the session's item list. */
  itemIndex: number;
  /** 1-based repetition of the stretch. */
  rep: number;
  side: StretchSide | null;
  kind: 'TRANSITION' | 'HOLD';
  seconds: number;
}

export function buildTimeline(items: readonly StretchTimingItem[]): StretchPhase[] {
  const phases: StretchPhase[] = [];
  items.forEach((item, itemIndex) => {
    const sides: (StretchSide | null)[] = item.perSide ? ['LEFT', 'RIGHT'] : [null];
    for (let rep = 1; rep <= Math.max(1, item.repetitions); rep++) {
      for (const side of sides) {
        phases.push({ itemIndex, rep, side, kind: 'TRANSITION', seconds: STRETCH_TRANSITION_SECONDS });
        phases.push({ itemIndex, rep, side, kind: 'HOLD', seconds: Math.max(1, item.holdSeconds) });
      }
    }
  });
  return phases;
}

/** The first phase of the item after the one `phaseIndex` belongs to, or `timeline.length` when it was the last. */
export function nextItemStart(timeline: readonly StretchPhase[], phaseIndex: number): number {
  const current = timeline[phaseIndex]?.itemIndex;
  const next = timeline.findIndex((phase, index) => index > phaseIndex && phase.itemIndex !== current);
  return next === -1 ? timeline.length : next;
}

/** The first phase of the item `phaseIndex` belongs to — or, when already there, of the previous item. */
export function previousItemStart(timeline: readonly StretchPhase[], phaseIndex: number): number {
  const current = timeline[phaseIndex]?.itemIndex ?? 0;
  const start = timeline.findIndex((phase) => phase.itemIndex === current);
  if (start < phaseIndex) {
    return start;
  }
  const previous = timeline.findIndex((phase) => phase.itemIndex === current - 1);
  return previous === -1 ? 0 : previous;
}

/**
 * Which stretches were held to the end: every HOLD phase of the item was reached and passed
 * (`reachedPhase` = the first phase not yet finished; `timeline.length` = all done) and the item was not
 * skipped.
 */
export function completedItems(
  timeline: readonly StretchPhase[],
  itemCount: number,
  reachedPhase: number,
  skippedItems: ReadonlySet<number>,
): boolean[] {
  const result: boolean[] = [];
  for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
    const lastHold = timeline.reduce((last, phase, index) => (phase.itemIndex === itemIndex && phase.kind === 'HOLD' ? index : last), -1);
    result.push(lastHold !== -1 && lastHold < reachedPhase && !skippedItems.has(itemIndex));
  }
  return result;
}
