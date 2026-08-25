import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';

export interface HouseholdSections {
  overdue: HouseholdTask[];
  today: HouseholdTask[];
  later: HouseholdTask[];
}

/**
 * documentation/Subfeatures/Háztartási feladatok.md "Lista (alapnézet)": szekciók Lejárt
 * (nextDue < ma) / Ma (nextDue = ma) / Később (nextDue > ma). Szekción belül: nextDue növekvő, majd
 * helyiség sortOrder, majd feladatnév.
 */
export function groupHouseholdTasks(tasks: HouseholdTask[], rooms: HouseholdRoom[], today: string): HouseholdSections {
  const roomSortOrder = new Map(rooms.map((room) => [room.id, room.sortOrder]));
  const compare = (a: HouseholdTask, b: HouseholdTask): number => {
    if (a.nextDue !== b.nextDue) {
      return a.nextDue < b.nextDue ? -1 : 1;
    }
    const roomA = roomSortOrder.get(a.roomId) ?? 0;
    const roomB = roomSortOrder.get(b.roomId) ?? 0;
    if (roomA !== roomB) {
      return roomA - roomB;
    }
    return a.name.localeCompare(b.name);
  };

  return {
    overdue: tasks.filter((task) => task.nextDue < today).sort(compare),
    today: tasks.filter((task) => task.nextDue === today).sort(compare),
    later: tasks.filter((task) => task.nextDue > today).sort(compare),
  };
}

/** Whole calendar days between `nextDue` and `today` (both `YYYY-MM-DD`, no time zone). */
export function householdTaskLagDays(nextDue: string, today: string): number {
  const due = Date.parse(`${nextDue}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  return Math.round((now - due) / 86_400_000);
}
