/**
 * documentation/Subfeatures/Heti terv.md "Indítás és adherence" — pure helpers for the weekly
 * dashboard. No Angular: the "Teljesítve" rule and the Monday-anchored date math are unit-testable
 * on their own, and shared by the page + any future summary widget.
 */
import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WorkoutSession } from '../../../api/model/workoutSession';

/** Monday…Sunday, in the order the dashboard renders them; index 0 = Monday, matching `Date#getDay()` shifted. */
export const WEEK_DAYS: readonly WeeklyPlanSlot.DayOfWeekEnum[] = [
  WeeklyPlanSlot.DayOfWeekEnum.Monday,
  WeeklyPlanSlot.DayOfWeekEnum.Tuesday,
  WeeklyPlanSlot.DayOfWeekEnum.Wednesday,
  WeeklyPlanSlot.DayOfWeekEnum.Thursday,
  WeeklyPlanSlot.DayOfWeekEnum.Friday,
  WeeklyPlanSlot.DayOfWeekEnum.Saturday,
  WeeklyPlanSlot.DayOfWeekEnum.Sunday,
];

/** `YYYY-MM-DD` + integer day offset → `YYYY-MM-DD`, computed on the local calendar (DST-safe via noon). */
export function addLocalDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day + days, 12, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The Monday of the ISO week that `dateStr` (`YYYY-MM-DD`) falls in. */
export function mondayOf(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const dow = date.getDay(); // 0 = Sunday
  const backToMonday = dow === 0 ? 6 : dow - 1;
  return addLocalDays(dateStr, -backToMonday);
}

/** The seven `YYYY-MM-DD` dates of the week starting at `weekStart` (assumed a Monday). */
export function weekDates(weekStart: string): string[] {
  return WEEK_DAYS.map((_, index) => addLocalDays(weekStart, index));
}

/**
 * "Teljesítve": there is at least one non-deleted `WorkoutSession` with `planId === slotPlanId` whose
 * `date` falls inside the week `[weekStart, weekStart + 6]`. No content match — just presence.
 */
export function isSlotCompleted(sessions: readonly WorkoutSession[], weekStart: string, slotPlanId: string): boolean {
  const weekEnd = addLocalDays(weekStart, 6);
  return sessions.some(
    (session) =>
      !session.deleted && session.planId === slotPlanId && session.date >= weekStart && session.date <= weekEnd,
  );
}
