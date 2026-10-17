import { StretchExercise } from '../../api/model/stretchExercise';
import { SqlTask } from '../storage/local-database.service';
import {
  StretchExerciseRow,
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
