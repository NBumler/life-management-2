import { StretchExercise } from '../../api/model/stretchExercise';
import { StretchPlanItem } from '../../api/model/stretchPlanItem';
import { SqlTask } from '../storage/local-database.service';
import {
  StretchExerciseRow,
  WeeklyPlanSlotRow,
  stretchPlanItemLocalWriteTask,
  stretchPlanItemRowToDto,
  stretchPlanItemServerApplyTask,
  stretchPlanLocalWriteTask,
  stretchPlanServerApplyTask,
  stretchSessionItemLocalWriteTask,
  stretchSessionLocalWriteTask,
  stretchSessionServerApplyTask,
  weeklyPlanSlotLocalWriteTask,
  weeklyPlanSlotRowToDto,
  stretchExerciseLocalWriteTask,
  stretchExerciseRowToDto,
  stretchExerciseServerApplyTask,
  stretchExerciseTombstoneTask,
} from './local-rows';

/** The `?` placeholders of the INSERT's VALUES list — they must line up 1:1 with the bound values. */
function placeholderCount(task: SqlTask): number {
  const values = /VALUES \(([^)]*)\)/.exec(task.statement)?.[1] ?? '';
  return values.split(',').filter((part) => part.trim() === '?').length;
}

/** backlog/167 — `stretch_exercise` (SCHEMA_V52) row mapping and SQL tasks. */
describe('stretch exercise local-rows (backlog/167)', () => {
  const dto: StretchExercise = {
    id: 's1',
    name: 'Csípőhajlító nyújtás',
    category: StretchExercise.CategoryEnum.Hips,
    description: 'Térdelő kitörés',
    equipment: 'Szőnyeg',
    isFavorite: true,
    defaultHoldSeconds: 45,
    defaultPerSide: true,
    deleted: false,
    deletedAt: null,
    createdAt: '2026-10-17T10:00:00Z',
    updatedAt: '2026-10-17T10:00:00Z',
  };

  it('local write binds every column in order, booleans as 0/1', () => {
    const task = stretchExerciseLocalWriteTask(dto);
    expect(placeholderCount(task)).toBe(task.values?.length ?? -1);
    expect(task.values).toEqual(['s1', 'Csípőhajlító nyújtás', 'HIPS', 'Térdelő kitörés', 'Szőnyeg', 1, 45, 1]);
  });

  it('server apply binds every column and only lands on a clean row', () => {
    const task = stretchExerciseServerApplyTask(dto);
    expect(placeholderCount(task)).toBe(task.values?.length ?? -1);
    expect(task.statement).toContain('WHERE stretch_exercise._dirty = 0');
  });

  it('tombstone binds id, updatedAt, deletedAt', () => {
    expect(stretchExerciseTombstoneTask('s1', null, 'u').values).toEqual(['s1', 'u', null]);
  });

  it('row → DTO round-trips the stretching fields', () => {
    const row: StretchExerciseRow = {
      id: 's1',
      name: 'Csípőhajlító nyújtás',
      category: 'HIPS',
      description: 'Térdelő kitörés',
      equipment: 'Szőnyeg',
      is_favorite: 1,
      default_hold_seconds: 45,
      default_per_side: 1,
      created_at: '2026-10-17T10:00:00Z',
      updated_at: '2026-10-17T10:00:00Z',
      deleted: 0,
      deleted_at: null,
      _dirty: 0,
      _local_only: 0,
      _sync_error: 0,
      _needs_refetch: 0,
    };
    expect(stretchExerciseRowToDto(row)).toEqual(dto);
  });
});

/** backlog/168 — `stretch_plan` / `stretch_plan_item` (SCHEMA_V53) and the weekly slot's `stretch_plan_id`. */
describe('stretch plan local-rows (backlog/168)', () => {
  it('plan and item writes bind every column in order', () => {
    const planTask = stretchPlanLocalWriteTask({ id: 'p', name: 'Esti', notes: null, active: true, goalLabel: 'G' });
    expect(placeholderCount(planTask)).toBe(planTask.values?.length ?? -1);
    expect(planTask.values).toEqual(['p', 'Esti', null, 1, 'G']);

    const itemTask = stretchPlanItemLocalWriteTask({
      id: 'i',
      planId: 'p',
      stretchExerciseId: 'e',
      stretchName: 'Vádli',
      stretchCategory: StretchPlanItem.StretchCategoryEnum.Legs,
      orderIndex: 2,
      holdSeconds: 30,
      perSide: true,
      repetitions: 3,
      notes: 'lassan',
    });
    expect(placeholderCount(itemTask)).toBe(itemTask.values?.length ?? -1);
    expect(itemTask.values).toEqual(['i', 'p', 'e', 'Vádli', 'LEGS', 2, 30, 1, 3, 'lassan']);
  });

  it('server-apply tasks bind every column', () => {
    const plan = stretchPlanServerApplyTask({ id: 'p', name: 'Esti', active: false, deleted: false });
    expect(placeholderCount(plan)).toBe(plan.values?.length ?? -1);
    const item = stretchPlanItemServerApplyTask(
      stretchPlanItemRowToDto({
        id: 'i',
        plan_id: 'p',
        stretch_exercise_id: 'e',
        stretch_name: 'Vádli',
        stretch_category: 'LEGS',
        order_index: 0,
        hold_seconds: 30,
        per_side: 0,
        repetitions: 1,
        notes: null,
        created_at: null,
        updated_at: null,
        deleted: 0,
        deleted_at: null,
        _dirty: 0,
        _local_only: 0,
        _sync_error: 0,
        _needs_refetch: 0,
      }),
    );
    expect(placeholderCount(item)).toBe(item.values?.length ?? -1);
  });

  it('a STRETCH slot writes stretch_plan_id and an empty plan_id, and reads them back', () => {
    const task = weeklyPlanSlotLocalWriteTask({ id: 's', weeklyPlanId: 'w', dayOfWeek: 'MONDAY', kind: 'STRETCH', planId: null, stretchPlanId: 'p' });
    expect(placeholderCount(task)).toBe(task.values?.length ?? -1);
    expect(task.values).toEqual(['s', 'w', 'MONDAY', 'STRETCH', '', 'p']);
    const row = { id: 's', weekly_plan_id: 'w', day_of_week: 'MONDAY', kind: 'STRETCH', plan_id: '', stretch_plan_id: 'p', deleted: 0 } as WeeklyPlanSlotRow;
    expect(weeklyPlanSlotRowToDto(row)).toEqual(jasmine.objectContaining({ kind: 'STRETCH', planId: null, stretchPlanId: 'p' }));
  });
});

/** backlog/169 — `stretch_session` / `stretch_session_item` (SCHEMA_V54). */
describe('stretch session local-rows (backlog/169)', () => {
  it('session and item writes bind every column in order', () => {
    const session = stretchSessionLocalWriteTask({
      id: 's',
      date: '2026-10-17',
      startTime: '19:00',
      endTime: null,
      durationMinutes: 12,
      stretchPlanId: 'p',
      workoutSessionId: 'w',
      notes: null,
    });
    expect(placeholderCount(session)).toBe(session.values?.length ?? -1);
    expect(session.values).toEqual(['s', '2026-10-17', '19:00', null, 12, 'p', 'w', null]);

    const item = stretchSessionItemLocalWriteTask({
      id: 'i',
      sessionId: 's',
      stretchExerciseId: null,
      stretchName: 'Vádli',
      stretchCategory: 'LEGS',
      orderIndex: 0,
      holdSeconds: 30,
      perSide: false,
      repetitions: 2,
      completed: true,
    });
    expect(placeholderCount(item)).toBe(item.values?.length ?? -1);
    expect(item.values).toEqual(['i', 's', null, 'Vádli', 'LEGS', 0, 30, 0, 2, 1]);
  });

  it('server-apply tasks bind every column', () => {
    const session = stretchSessionServerApplyTask({ id: 's', date: '2026-10-17', durationMinutes: 5, deleted: false });
    expect(placeholderCount(session)).toBe(session.values?.length ?? -1);
  });
});
