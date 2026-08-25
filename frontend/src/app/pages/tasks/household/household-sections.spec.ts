import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';
import { groupHouseholdTasks, householdTaskLagDays } from './household-sections';

function task(overrides: Partial<HouseholdTask> = {}): HouseholdTask {
  return {
    id: 't1',
    roomId: 'r1',
    name: 'Mosogatás',
    energyLevel: HouseholdTask.EnergyLevelEnum.Low,
    estimatedMinutes: 10,
    intervalDays: 1,
    nextDue: '2026-06-01',
    lastCompletedAt: null,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

function room(id: string, sortOrder: number): HouseholdRoom {
  return { id, name: id, sortOrder, deleted: false };
}

describe('groupHouseholdTasks', () => {
  const today = '2026-06-01';

  it('splits into overdue / today / later by nextDue', () => {
    const tasks = [
      task({ id: 'a', nextDue: '2026-05-01' }),
      task({ id: 'b', nextDue: '2026-06-01' }),
      task({ id: 'c', nextDue: '2026-07-01' }),
    ];

    const sections = groupHouseholdTasks(tasks, [], today);

    expect(sections.overdue.map((t) => t.id)).toEqual(['a']);
    expect(sections.today.map((t) => t.id)).toEqual(['b']);
    expect(sections.later.map((t) => t.id)).toEqual(['c']);
  });

  it('orders within a section by nextDue, then room sortOrder, then name', () => {
    const rooms = [room('kitchen', 1), room('bathroom', 0)];
    const tasks = [
      task({ id: 'kitchen-b', roomId: 'kitchen', name: 'Zulu', nextDue: today }),
      task({ id: 'bathroom-a', roomId: 'bathroom', name: 'Alfa', nextDue: today }),
      task({ id: 'kitchen-a', roomId: 'kitchen', name: 'Alfa', nextDue: today }),
    ];

    const sections = groupHouseholdTasks(tasks, rooms, today);

    expect(sections.today.map((t) => t.id)).toEqual(['bathroom-a', 'kitchen-a', 'kitchen-b']);
  });

  it('hides nothing but returns empty arrays for sections with no tasks', () => {
    const sections = groupHouseholdTasks([], [], today);

    expect(sections).toEqual({ overdue: [], today: [], later: [] });
  });
});

describe('householdTaskLagDays', () => {
  it('counts whole days a task is overdue', () => {
    expect(householdTaskLagDays('2026-05-28', '2026-06-01')).toBe(4);
  });
});
