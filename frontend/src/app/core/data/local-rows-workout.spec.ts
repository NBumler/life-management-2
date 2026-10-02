import { WeeklyPlanSlot } from '../../api/model/weeklyPlanSlot';
import { WorkoutPlanExercise } from '../../api/model/workoutPlanExercise';
import { WorkoutPlanSet } from '../../api/model/workoutPlanSet';
import { WorkoutSetEntry } from '../../api/model/workoutSetEntry';
import { SqlTask } from '../storage/local-database.service';
import {
  WeeklyPlanSlotRow,
  weeklyPlanSlotLocalWriteTask,
  weeklyPlanSlotRowToDto,
  weeklyPlanSlotServerApplyTask,
  workoutPlanExerciseLocalWriteTask,
  workoutPlanExerciseServerApplyTask,
  workoutPlanSetLocalWriteTask,
  workoutPlanSetServerApplyTask,
  workoutSetEntryLocalWriteTask,
  workoutSetEntryServerApplyTask,
} from './local-rows';

/** The `?` placeholders of the INSERT's VALUES list — they must line up 1:1 with the bound values. */
function placeholderCount(task: SqlTask): number {
  const values = /VALUES \(([^)]*)\)/.exec(task.statement)?.[1] ?? '';
  return values.split(',').filter((part) => part.trim() === '?').length;
}

/** backlog/133–135 — the columns added in SCHEMA_V46 are written and bound in the right slots. */
describe('workout local-rows SQL tasks (backlog/133–135)', () => {
  const planSet: WorkoutPlanSet = {
    id: 's1',
    planExerciseId: 'e1',
    setType: WorkoutPlanSet.SetTypeEnum.Working,
    reps: 2,
    repsMax: 3,
    weightKg: -20,
    restTimeSeconds: 180,
    side: WorkoutPlanSet.SideEnum.Left,
    rpe: 8.5,
    orderIndex: 0,
    deleted: false,
  };
  const setEntry: WorkoutSetEntry = {
    id: 'se1',
    exerciseEntryId: 'e1',
    setNumber: 1,
    setType: WorkoutSetEntry.SetTypeEnum.Working,
    reps: 2,
    weightKg: -20,
    side: WorkoutSetEntry.SideEnum.Right,
    rpe: 9,
    isCompleted: true,
    orderIndex: 0,
    deleted: false,
  };
  const planExercise: Omit<WorkoutPlanExercise, 'targetSets'> = {
    id: 'e1',
    planId: 'p1',
    exerciseId: 'x1',
    exerciseName: 'Negatív egykezes',
    exerciseCategory: WorkoutPlanExercise.ExerciseCategoryEnum.Back,
    exerciseKind: WorkoutPlanExercise.ExerciseKindEnum.BodyweightReps,
    orderIndex: 0,
    supersetGroup: null,
    notes: 'szék: 5',
    deleted: false,
  };

  for (const [name, task, expected] of [
    ['plan set local write', workoutPlanSetLocalWriteTask(planSet), ['LEFT', 8.5]],
    ['plan set server apply', workoutPlanSetServerApplyTask(planSet), ['LEFT', 8.5]],
    ['set entry local write', workoutSetEntryLocalWriteTask(setEntry), ['RIGHT', 9]],
    ['set entry server apply', workoutSetEntryServerApplyTask(setEntry), ['RIGHT', 9]],
  ] as const) {
    it(`${name}: binds side + rpe right after rest_time_seconds`, () => {
      expect(placeholderCount(task)).toBe(task.values!.length);
      const columns = /\(([^)]*)\)/.exec(task.statement)![1].split(',').map((column) => column.trim());
      const sideIndex = columns.indexOf('side');
      expect(sideIndex).toBe(columns.indexOf('rest_time_seconds') + 1);
      expect([task.values![sideIndex], task.values![sideIndex + 1]]).toEqual([...expected]);
      expect(task.statement).toContain('side = excluded.side, rpe = excluded.rpe');
    });
  }

  for (const [name, task] of [
    ['plan exercise local write', workoutPlanExerciseLocalWriteTask(planExercise)],
    ['plan exercise server apply', workoutPlanExerciseServerApplyTask(planExercise)],
  ] as const) {
    it(`${name}: binds notes`, () => {
      expect(placeholderCount(task)).toBe(task.values!.length);
      const columns = /\(([^)]*)\)/.exec(task.statement)![1].split(',').map((column) => column.trim());
      expect(task.values![columns.indexOf('notes')]).toBe('szék: 5');
    });
  }
});

/** backlog/144 — a REST override has no template: `plan_id` is `''` on-device (NOT NULL column), `null` on the DTO. */
describe('weekly plan slot local-rows (backlog/144)', () => {
  const rest: WeeklyPlanSlot = {
    id: 'sl',
    weeklyPlanId: 'w',
    dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum.Tuesday,
    kind: WeeklyPlanSlot.KindEnum.Rest,
    planId: null,
    deleted: false,
  };

  for (const [name, task] of [
    ['local write', weeklyPlanSlotLocalWriteTask(rest)],
    ['server apply', weeklyPlanSlotServerApplyTask(rest)],
  ] as const) {
    it(`${name}: binds kind and stores a REST slot's planId as ''`, () => {
      expect(placeholderCount(task)).toBe(task.values!.length);
      const columns = /\(([^)]*)\)/.exec(task.statement)![1].split(',').map((column) => column.trim());
      expect(task.values![columns.indexOf('kind')]).toBe('REST');
      expect(task.values![columns.indexOf('plan_id')]).toBe('');
    });
  }

  it("reads plan_id '' back as a null planId", () => {
    const row = { id: 'sl', weekly_plan_id: 'w', day_of_week: 'TUESDAY', kind: 'REST', plan_id: '', deleted: 0 } as WeeklyPlanSlotRow;
    expect(weeklyPlanSlotRowToDto(row)).toEqual(jasmine.objectContaining({ kind: 'REST', planId: null }));
  });
});
