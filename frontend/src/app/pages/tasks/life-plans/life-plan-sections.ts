import { LifePlan } from '../../../api/model/lifePlan';

/**
 * documentation/Subfeatures/Élet tervek.md "Céldátum (lista, nem naptár)": lejárt = élő,
 * status ≠ DONE, van targetDate, targetDate < ma. DONE soha nem lejárt, még múltbeli targetDate
 * mellett sem.
 */
export function isLifePlanOverdue(plan: Pick<LifePlan, 'status' | 'targetDate'>, today: string): boolean {
  return plan.status !== LifePlan.StatusEnum.Done && plan.targetDate != null && plan.targetDate < today;
}

/** Whole calendar days between `targetDate` and `today` (both `YYYY-MM-DD`, no time zone). */
export function lifePlanLagDays(targetDate: string, today: string): number {
  const target = Date.parse(`${targetDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  return Math.round((now - target) / 86_400_000);
}

export interface LifePlanSections {
  inProgress: LifePlan[];
  planned: LifePlan[];
  done: LifePlan[];
}

/**
 * documentation/Subfeatures/Élet tervek.md "Lista": szekciók Folyamatban / Terv / Kész.
 * Folyamatban / Terv rendezés: lejárt elöl, majd targetDate növekvő, dátum nélküli a szekció végén,
 * majd title. Kész rendezés: completedAt csökkenő (újabb elöl), majd title.
 */
export function groupLifePlans(plans: LifePlan[], today: string): LifePlanSections {
  const byStatus = (status: LifePlan.StatusEnum): LifePlan[] => plans.filter((plan) => plan.status === status);
  return {
    inProgress: byStatus(LifePlan.StatusEnum.InProgress).sort((a, b) => compareActive(a, b, today)),
    planned: byStatus(LifePlan.StatusEnum.Planned).sort((a, b) => compareActive(a, b, today)),
    done: byStatus(LifePlan.StatusEnum.Done).sort(compareDone),
  };
}

function compareActive(a: LifePlan, b: LifePlan, today: string): number {
  const aOverdue = isLifePlanOverdue(a, today);
  const bOverdue = isLifePlanOverdue(b, today);
  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1;
  }
  const aDate = a.targetDate ?? null;
  const bDate = b.targetDate ?? null;
  if (aDate !== bDate) {
    if (aDate === null) {
      return 1;
    }
    if (bDate === null) {
      return -1;
    }
    return aDate < bDate ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}

function compareDone(a: LifePlan, b: LifePlan): number {
  const aCompleted = a.completedAt ?? '';
  const bCompleted = b.completedAt ?? '';
  if (aCompleted !== bCompleted) {
    return aCompleted > bCompleted ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}
