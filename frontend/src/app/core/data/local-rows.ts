import { SqlTask } from '../storage/local-database.service';
import { CalendarEvent } from '../../api/model/calendarEvent';
import { Exercise } from '../../api/model/exercise';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { Meal } from '../../api/model/meal';
import { MealItem } from '../../api/model/mealItem';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateItem } from '../../api/model/packingTemplateItem';
import { Recipe } from '../../api/model/recipe';
import { RecipeIngredient } from '../../api/model/recipeIngredient';
import { ShoppingList } from '../../api/model/shoppingList';
import { ShoppingListItem } from '../../api/model/shoppingListItem';
import { StoredFood } from '../../api/model/storedFood';
import { SwimLog } from '../../api/model/swimLog';
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { RecurringExpense } from '../../api/model/recurringExpense';
import { AycmPartner } from '../../api/model/aycmPartner';
import { AycmPriceRule } from '../../api/model/aycmPriceRule';
import { AycmCheckIn } from '../../api/model/aycmCheckIn';
import { AycmSettings } from '../../api/model/aycmSettings';
import { Gym } from '../../api/model/gym';
import { GymColorBand } from '../../api/model/gymColorBand';
import { IndoorRoute } from '../../api/model/indoorRoute';
import { Crag } from '../../api/model/crag';
import { Sector } from '../../api/model/sector';
import { Route } from '../../api/model/route';
import { BoulderProblem } from '../../api/model/boulderProblem';
import { ClimbingSession } from '../../api/model/climbingSession';
import { AscentAttempt } from '../../api/model/ascentAttempt';
import { PitchLog } from '../../api/model/pitchLog';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../api/model/weeklyPlanSlot';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutPlanExercise } from '../../api/model/workoutPlanExercise';
import { WorkoutPlanSet } from '../../api/model/workoutPlanSet';
import { WorkoutSession } from '../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../api/model/workoutSetEntry';
import { DailyStepLog } from '../../api/model/dailyStepLog';

/**
 * Row <-> DTO mapping and SQL task builders for the two local tables this phase covers.
 * Shared by SqliteStorageBackend (local-first write path) and SyncEngine (drain-success write-back
 * + pull apply). Centralized here so both sides agree on column names and on the apply-rules from
 * documentation/Architektúra/Backend-offline first.md §8.
 */

export interface ProfileRow {
  id: string;
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal: string | null;
  kg_per_week: number | null;
  gross_monthly_salary_huf: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function profileRowToDto(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    birthDate: row.birth_date,
    sex: row.sex as UserProfile.SexEnum | null,
    heightCm: row.height_cm,
    currentWeightKg: row.current_weight_kg,
    goal: row.goal as UserProfile.GoalEnum | null,
    kgPerWeek: row.kg_per_week,
    grossMonthlySalaryHuf: row.gross_monthly_salary_huf,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Local-first edit: marks `_dirty = 1`; `_local_only` is set to 1 only on first insert, left untouched on update. */
export function profileLocalWriteTask(dto: UserProfile): SqlTask {
  return {
    statement: `
      INSERT INTO user_profile (id, birth_date, sex, height_cm, current_weight_kg, goal, kg_per_week, gross_monthly_salary_huf, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        birth_date = excluded.birth_date, sex = excluded.sex, height_cm = excluded.height_cm,
        current_weight_kg = excluded.current_weight_kg, goal = excluded.goal, kg_per_week = excluded.kg_per_week,
        gross_monthly_salary_huf = excluded.gross_monthly_salary_huf, _dirty = 1`,
    values: [
      dto.id,
      dto.birthDate ?? null,
      dto.sex ?? null,
      dto.heightCm ?? null,
      dto.currentWeightKg ?? null,
      dto.goal ?? null,
      dto.kgPerWeek ?? null,
      dto.grossMonthlySalaryHuf ?? null,
    ],
  };
}

/** Authoritative server row (drain success, or pull when not `_dirty`): full overwrite, clears dirty/local-only. */
export function profileServerApplyTask(dto: UserProfile): SqlTask {
  return {
    statement: `
      INSERT INTO user_profile (id, birth_date, sex, height_cm, current_weight_kg, goal, kg_per_week, gross_monthly_salary_huf, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        birth_date = excluded.birth_date, sex = excluded.sex, height_cm = excluded.height_cm,
        current_weight_kg = excluded.current_weight_kg, goal = excluded.goal, kg_per_week = excluded.kg_per_week,
        gross_monthly_salary_huf = excluded.gross_monthly_salary_huf, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = 0, deleted_at = NULL, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE user_profile._dirty = 0`,
    values: [
      dto.id,
      dto.birthDate ?? null,
      dto.sex ?? null,
      dto.heightCm ?? null,
      dto.currentWeightKg ?? null,
      dto.goal ?? null,
      dto.kgPerWeek ?? null,
      dto.grossMonthlySalaryHuf ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
    ],
  };
}

export interface WeightHistoryRow {
  id: string;
  recorded_at: string;
  weight_kg: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function weightHistoryRowToDto(row: WeightHistoryRow): WeightHistoryEntry {
  return {
    id: row.id,
    recordedAt: row.recorded_at,
    weightKg: row.weight_kg,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function weightHistoryLocalWriteTask(dto: WeightHistoryEntry): SqlTask {
  return {
    statement: `
      INSERT INTO weight_history_entry (id, recorded_at, weight_kg, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET recorded_at = excluded.recorded_at, weight_kg = excluded.weight_kg, _dirty = 1`,
    values: [dto.id, dto.recordedAt, dto.weightKg],
  };
}

export function weightHistoryServerApplyTask(dto: WeightHistoryEntry): SqlTask {
  return {
    statement: `
      INSERT INTO weight_history_entry (id, recorded_at, weight_kg, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        recorded_at = excluded.recorded_at, weight_kg = excluded.weight_kg, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE weight_history_entry._dirty = 0`,
    values: [dto.id, dto.recordedAt, dto.weightKg, dto.createdAt ?? null, dto.updatedAt ?? null, dto.deleted ? 1 : 0, dto.deletedAt ?? null],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function weightHistoryTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO weight_history_entry (id, recorded_at, weight_kg, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface GearItemRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function gearItemRowToDto(row: GearItemRow): GearItem {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function gearItemLocalWriteTask(dto: GearItem): SqlTask {
  return {
    statement: `
      INSERT INTO gear_item (id, name, notes, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes, _dirty = 1`,
    values: [dto.id, dto.name, dto.notes ?? null],
  };
}

export function gearItemServerApplyTask(dto: GearItem): SqlTask {
  return {
    statement: `
      INSERT INTO gear_item (id, name, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE gear_item._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function gearItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO gear_item (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  kind: string;
  default_rest_time_seconds: number | null;
  is_favorite: number;
  equipment: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function exerciseRowToDto(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Exercise.CategoryEnum,
    kind: row.kind as Exercise.KindEnum,
    defaultRestTimeSeconds: row.default_rest_time_seconds,
    isFavorite: row.is_favorite === 1,
    equipment: row.equipment,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function exerciseLocalWriteTask(dto: Exercise): SqlTask {
  return {
    // Matches `gearItemLocalWriteTask`: a local edit never resurrects a tombstoned row — the server
    // `create` doesn't undelete either, and a re-add of a deleted name takes a fresh id (the name
    // uniqueness check only sees live rows). Re-creating a *known* id only happens for seed rows,
    // which `seedExercises` already gates on the full (incl. tombstoned) row count.
    statement: `
      INSERT INTO exercise_catalog (id, name, category, kind, default_rest_time_seconds, is_favorite, equipment, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category, kind = excluded.kind,
        default_rest_time_seconds = excluded.default_rest_time_seconds, is_favorite = excluded.is_favorite,
        equipment = excluded.equipment, _dirty = 1`,
    values: [
      dto.id,
      dto.name,
      dto.category,
      dto.kind,
      dto.defaultRestTimeSeconds ?? null,
      dto.isFavorite ? 1 : 0,
      dto.equipment ?? null,
    ],
  };
}

export function exerciseServerApplyTask(dto: Exercise): SqlTask {
  return {
    statement: `
      INSERT INTO exercise_catalog (id, name, category, kind, default_rest_time_seconds, is_favorite, equipment, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category, kind = excluded.kind,
        default_rest_time_seconds = excluded.default_rest_time_seconds, is_favorite = excluded.is_favorite,
        equipment = excluded.equipment, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE exercise_catalog._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.category,
      dto.kind,
      dto.defaultRestTimeSeconds ?? null,
      dto.isFavorite ? 1 : 0,
      dto.equipment ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function exerciseTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO exercise_catalog (id, name, category, kind, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'FULL_BODY', 'WEIGHTED_REPS', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// --- Edzésnapló: WorkoutSession → WorkoutExerciseEntry → WorkoutSetEntry (three-level nested aggregate, mirrors recipe/meal) ---

export interface WorkoutSessionRow {
  id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  workout_type: string;
  title: string | null;
  notes: string | null;
  location: string | null;
  plan_id: string | null;
  rounds_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `exercises` — a WorkoutSession row alone never carries them, see readWorkoutSession in SqliteStorageBackend. */
export function workoutSessionRowToDto(row: WorkoutSessionRow): Omit<WorkoutSession, 'exercises'> {
  return {
    id: row.id,
    date: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    workoutType: row.workout_type as WorkoutSession.WorkoutTypeEnum,
    title: row.title,
    notes: row.notes,
    location: (row.location as WorkoutSession.LocationEnum | null) ?? null,
    planId: row.plan_id,
    roundsCount: row.rounds_count,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

type WorkoutSessionWriteInput = Pick<
  WorkoutSession,
  'id' | 'date' | 'startTime' | 'endTime' | 'durationMinutes' | 'workoutType' | 'title' | 'notes' | 'location' | 'planId' | 'roundsCount'
>;

export function workoutSessionLocalWriteTask(dto: WorkoutSessionWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO workout_session (id, session_date, start_time, end_time, duration_minutes, workout_type, title, notes, location, plan_id, rounds_count, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        session_date = excluded.session_date, start_time = excluded.start_time, end_time = excluded.end_time,
        duration_minutes = excluded.duration_minutes, workout_type = excluded.workout_type, title = excluded.title,
        notes = excluded.notes, location = excluded.location, plan_id = excluded.plan_id, rounds_count = excluded.rounds_count,
        deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.date,
      dto.startTime ?? null,
      dto.endTime ?? null,
      dto.durationMinutes ?? null,
      dto.workoutType,
      dto.title ?? null,
      dto.notes ?? null,
      dto.location ?? null,
      dto.planId ?? null,
      dto.roundsCount ?? null,
    ],
  };
}

export function workoutSessionServerApplyTask(dto: Omit<WorkoutSession, 'exercises'>): SqlTask {
  return {
    statement: `
      INSERT INTO workout_session (id, session_date, start_time, end_time, duration_minutes, workout_type, title, notes, location, plan_id, rounds_count, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        session_date = excluded.session_date, start_time = excluded.start_time, end_time = excluded.end_time,
        duration_minutes = excluded.duration_minutes, workout_type = excluded.workout_type, title = excluded.title,
        notes = excluded.notes, location = excluded.location, plan_id = excluded.plan_id, rounds_count = excluded.rounds_count,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE workout_session._dirty = 0`,
    values: [
      dto.id,
      dto.date,
      dto.startTime ?? null,
      dto.endTime ?? null,
      dto.durationMinutes ?? null,
      dto.workoutType,
      dto.title ?? null,
      dto.notes ?? null,
      dto.location ?? null,
      dto.planId ?? null,
      dto.roundsCount ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function workoutSessionTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO workout_session (id, session_date, workout_type, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', 'GENERAL_WEIGHTS', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface WorkoutExerciseEntryRow {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  exercise_category: string;
  exercise_kind: string;
  order_index: number;
  superset_group: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `sets` — a WorkoutExerciseEntry row alone never carries them. */
export function workoutExerciseEntryRowToDto(row: WorkoutExerciseEntryRow): Omit<WorkoutExerciseEntry, 'sets'> {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    exerciseCategory: row.exercise_category as WorkoutExerciseEntry.ExerciseCategoryEnum,
    exerciseKind: row.exercise_kind as WorkoutExerciseEntry.ExerciseKindEnum,
    orderIndex: row.order_index,
    supersetGroup: row.superset_group,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

type WorkoutExerciseEntryWriteInput = Pick<
  WorkoutExerciseEntry,
  'id' | 'sessionId' | 'exerciseId' | 'exerciseName' | 'exerciseCategory' | 'exerciseKind' | 'orderIndex' | 'supersetGroup'
>;

export function workoutExerciseEntryLocalWriteTask(dto: WorkoutExerciseEntryWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO workout_exercise_entry (id, session_id, exercise_id, exercise_name, exercise_category, exercise_kind, order_index, superset_group, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        exercise_id = excluded.exercise_id, exercise_name = excluded.exercise_name, exercise_category = excluded.exercise_category,
        exercise_kind = excluded.exercise_kind, order_index = excluded.order_index, superset_group = excluded.superset_group,
        deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.sessionId,
      dto.exerciseId ?? null,
      dto.exerciseName,
      dto.exerciseCategory,
      dto.exerciseKind,
      dto.orderIndex,
      dto.supersetGroup ?? null,
    ],
  };
}

/** Local-only removal — an exercise entry dropped from a session during an edit (not a standalone outbox entry — see SqliteStorageBackend.saveWorkoutSession). */
export function workoutExerciseEntryLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE workout_exercise_entry SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function workoutExerciseEntryServerApplyTask(dto: Omit<WorkoutExerciseEntry, 'sets'>): SqlTask {
  return {
    statement: `
      INSERT INTO workout_exercise_entry (id, session_id, exercise_id, exercise_name, exercise_category, exercise_kind, order_index, superset_group, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id, exercise_id = excluded.exercise_id, exercise_name = excluded.exercise_name,
        exercise_category = excluded.exercise_category, exercise_kind = excluded.exercise_kind, order_index = excluded.order_index,
        superset_group = excluded.superset_group, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE workout_exercise_entry._dirty = 0`,
    values: [
      dto.id,
      dto.sessionId,
      dto.exerciseId ?? null,
      dto.exerciseName,
      dto.exerciseCategory,
      dto.exerciseKind,
      dto.orderIndex,
      dto.supersetGroup ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function workoutExerciseEntryTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO workout_exercise_entry (id, session_id, exercise_name, exercise_category, exercise_kind, order_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 'FULL_BODY', 'WEIGHTED_REPS', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface WorkoutSetEntryRow {
  id: string;
  exercise_entry_id: string;
  set_number: number;
  set_type: string;
  reps: number | null;
  weight_kg: number | null;
  hold_time_seconds: number | null;
  edge_size_mm: number | null;
  distance_meters: number | null;
  rest_time_seconds: number | null;
  is_completed: number;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function workoutSetEntryRowToDto(row: WorkoutSetEntryRow): WorkoutSetEntry {
  return {
    id: row.id,
    exerciseEntryId: row.exercise_entry_id,
    setNumber: row.set_number,
    setType: row.set_type as WorkoutSetEntry.SetTypeEnum,
    reps: row.reps,
    weightKg: row.weight_kg,
    holdTimeSeconds: row.hold_time_seconds,
    edgeSizeMm: row.edge_size_mm,
    distanceMeters: row.distance_meters,
    restTimeSeconds: row.rest_time_seconds,
    isCompleted: row.is_completed === 1,
    orderIndex: row.order_index,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

type WorkoutSetEntryWriteInput = Pick<
  WorkoutSetEntry,
  | 'id'
  | 'exerciseEntryId'
  | 'setNumber'
  | 'setType'
  | 'reps'
  | 'weightKg'
  | 'holdTimeSeconds'
  | 'edgeSizeMm'
  | 'distanceMeters'
  | 'restTimeSeconds'
  | 'isCompleted'
  | 'orderIndex'
>;

export function workoutSetEntryLocalWriteTask(dto: WorkoutSetEntryWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO workout_set_entry (id, exercise_entry_id, set_number, set_type, reps, weight_kg, hold_time_seconds, edge_size_mm, distance_meters, rest_time_seconds, is_completed, order_index, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        set_number = excluded.set_number, set_type = excluded.set_type, reps = excluded.reps, weight_kg = excluded.weight_kg,
        hold_time_seconds = excluded.hold_time_seconds, edge_size_mm = excluded.edge_size_mm, distance_meters = excluded.distance_meters,
        rest_time_seconds = excluded.rest_time_seconds, is_completed = excluded.is_completed, order_index = excluded.order_index,
        deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.exerciseEntryId,
      dto.setNumber,
      dto.setType,
      dto.reps ?? null,
      dto.weightKg ?? null,
      dto.holdTimeSeconds ?? null,
      dto.edgeSizeMm ?? null,
      dto.distanceMeters ?? null,
      dto.restTimeSeconds ?? null,
      dto.isCompleted ? 1 : 0,
      dto.orderIndex,
    ],
  };
}

/** Local-only removal — a set dropped from an exercise entry during an edit (not a standalone outbox entry). */
export function workoutSetEntryLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE workout_set_entry SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function workoutSetEntryServerApplyTask(dto: WorkoutSetEntry): SqlTask {
  return {
    statement: `
      INSERT INTO workout_set_entry (id, exercise_entry_id, set_number, set_type, reps, weight_kg, hold_time_seconds, edge_size_mm, distance_meters, rest_time_seconds, is_completed, order_index, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        exercise_entry_id = excluded.exercise_entry_id, set_number = excluded.set_number, set_type = excluded.set_type,
        reps = excluded.reps, weight_kg = excluded.weight_kg, hold_time_seconds = excluded.hold_time_seconds,
        edge_size_mm = excluded.edge_size_mm, distance_meters = excluded.distance_meters, rest_time_seconds = excluded.rest_time_seconds,
        is_completed = excluded.is_completed, order_index = excluded.order_index, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE workout_set_entry._dirty = 0`,
    values: [
      dto.id,
      dto.exerciseEntryId,
      dto.setNumber,
      dto.setType,
      dto.reps ?? null,
      dto.weightKg ?? null,
      dto.holdTimeSeconds ?? null,
      dto.edgeSizeMm ?? null,
      dto.distanceMeters ?? null,
      dto.restTimeSeconds ?? null,
      dto.isCompleted ? 1 : 0,
      dto.orderIndex,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function workoutSetEntryTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO workout_set_entry (id, exercise_entry_id, set_number, set_type, order_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, 'WORKING', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// --- Heti terv: WorkoutPlan → WorkoutPlanExercise → WorkoutPlanSet (three-level nested aggregate, mirrors the workout log) ---

export interface WorkoutPlanRow {
  id: string;
  name: string;
  notes: string | null;
  active: number;
  goal_label: string | null;
  default_workout_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `exercises` — a WorkoutPlan row alone never carries them, see readWorkoutPlan in SqliteStorageBackend. */
export function workoutPlanRowToDto(row: WorkoutPlanRow): Omit<WorkoutPlan, 'exercises'> {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    active: row.active === 1,
    goalLabel: row.goal_label,
    defaultWorkoutType: (row.default_workout_type as WorkoutPlan.DefaultWorkoutTypeEnum | null) ?? null,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

type WorkoutPlanWriteInput = Pick<WorkoutPlan, 'id' | 'name' | 'notes' | 'active' | 'goalLabel' | 'defaultWorkoutType'>;

export function workoutPlanLocalWriteTask(dto: WorkoutPlanWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan (id, name, notes, active, goal_label, default_workout_type, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes, active = excluded.active, goal_label = excluded.goal_label,
        default_workout_type = excluded.default_workout_type, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.name, dto.notes ?? null, dto.active ? 1 : 0, dto.goalLabel ?? null, dto.defaultWorkoutType ?? null],
  };
}

export function workoutPlanServerApplyTask(dto: Omit<WorkoutPlan, 'exercises'>): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan (id, name, notes, active, goal_label, default_workout_type, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes, active = excluded.active, goal_label = excluded.goal_label,
        default_workout_type = excluded.default_workout_type, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE workout_plan._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.notes ?? null,
      dto.active ? 1 : 0,
      dto.goalLabel ?? null,
      dto.defaultWorkoutType ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function workoutPlanTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan (id, name, active, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 1, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface WorkoutPlanExerciseRow {
  id: string;
  plan_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_category: string;
  exercise_kind: string;
  order_index: number;
  superset_group: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `targetSets` — a WorkoutPlanExercise row alone never carries them. */
export function workoutPlanExerciseRowToDto(row: WorkoutPlanExerciseRow): Omit<WorkoutPlanExercise, 'targetSets'> {
  return {
    id: row.id,
    planId: row.plan_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    exerciseCategory: row.exercise_category as WorkoutPlanExercise.ExerciseCategoryEnum,
    exerciseKind: row.exercise_kind as WorkoutPlanExercise.ExerciseKindEnum,
    orderIndex: row.order_index,
    supersetGroup: row.superset_group,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

type WorkoutPlanExerciseWriteInput = Pick<
  WorkoutPlanExercise,
  'id' | 'planId' | 'exerciseId' | 'exerciseName' | 'exerciseCategory' | 'exerciseKind' | 'orderIndex' | 'supersetGroup'
>;

export function workoutPlanExerciseLocalWriteTask(dto: WorkoutPlanExerciseWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan_exercise (id, plan_id, exercise_id, exercise_name, exercise_category, exercise_kind, order_index, superset_group, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        exercise_id = excluded.exercise_id, exercise_name = excluded.exercise_name, exercise_category = excluded.exercise_category,
        exercise_kind = excluded.exercise_kind, order_index = excluded.order_index, superset_group = excluded.superset_group,
        deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.planId,
      dto.exerciseId,
      dto.exerciseName,
      dto.exerciseCategory,
      dto.exerciseKind,
      dto.orderIndex,
      dto.supersetGroup ?? null,
    ],
  };
}

/** Local-only removal — an exercise line dropped from a plan during an edit (not a standalone outbox entry). */
export function workoutPlanExerciseLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE workout_plan_exercise SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function workoutPlanExerciseServerApplyTask(dto: Omit<WorkoutPlanExercise, 'targetSets'>): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan_exercise (id, plan_id, exercise_id, exercise_name, exercise_category, exercise_kind, order_index, superset_group, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id, exercise_id = excluded.exercise_id, exercise_name = excluded.exercise_name,
        exercise_category = excluded.exercise_category, exercise_kind = excluded.exercise_kind, order_index = excluded.order_index,
        superset_group = excluded.superset_group, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE workout_plan_exercise._dirty = 0`,
    values: [
      dto.id,
      dto.planId,
      dto.exerciseId,
      dto.exerciseName,
      dto.exerciseCategory,
      dto.exerciseKind,
      dto.orderIndex,
      dto.supersetGroup ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function workoutPlanExerciseTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan_exercise (id, plan_id, exercise_id, exercise_name, exercise_category, exercise_kind, order_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', '', 'FULL_BODY', 'WEIGHTED_REPS', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface WorkoutPlanSetRow {
  id: string;
  plan_exercise_id: string;
  set_type: string;
  reps: number | null;
  weight_kg: number | null;
  hold_time_seconds: number | null;
  edge_size_mm: number | null;
  distance_meters: number | null;
  rest_time_seconds: number | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function workoutPlanSetRowToDto(row: WorkoutPlanSetRow): WorkoutPlanSet {
  return {
    id: row.id,
    planExerciseId: row.plan_exercise_id,
    setType: row.set_type as WorkoutPlanSet.SetTypeEnum,
    reps: row.reps,
    weightKg: row.weight_kg,
    holdTimeSeconds: row.hold_time_seconds,
    edgeSizeMm: row.edge_size_mm,
    distanceMeters: row.distance_meters,
    restTimeSeconds: row.rest_time_seconds,
    orderIndex: row.order_index,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

type WorkoutPlanSetWriteInput = Pick<
  WorkoutPlanSet,
  'id' | 'planExerciseId' | 'setType' | 'reps' | 'weightKg' | 'holdTimeSeconds' | 'edgeSizeMm' | 'distanceMeters' | 'restTimeSeconds' | 'orderIndex'
>;

export function workoutPlanSetLocalWriteTask(dto: WorkoutPlanSetWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan_set (id, plan_exercise_id, set_type, reps, weight_kg, hold_time_seconds, edge_size_mm, distance_meters, rest_time_seconds, order_index, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        set_type = excluded.set_type, reps = excluded.reps, weight_kg = excluded.weight_kg, hold_time_seconds = excluded.hold_time_seconds,
        edge_size_mm = excluded.edge_size_mm, distance_meters = excluded.distance_meters, rest_time_seconds = excluded.rest_time_seconds,
        order_index = excluded.order_index, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.planExerciseId,
      dto.setType,
      dto.reps ?? null,
      dto.weightKg ?? null,
      dto.holdTimeSeconds ?? null,
      dto.edgeSizeMm ?? null,
      dto.distanceMeters ?? null,
      dto.restTimeSeconds ?? null,
      dto.orderIndex,
    ],
  };
}

/** Local-only removal — a target set dropped from an exercise line during an edit. */
export function workoutPlanSetLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE workout_plan_set SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function workoutPlanSetServerApplyTask(dto: WorkoutPlanSet): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan_set (id, plan_exercise_id, set_type, reps, weight_kg, hold_time_seconds, edge_size_mm, distance_meters, rest_time_seconds, order_index, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        plan_exercise_id = excluded.plan_exercise_id, set_type = excluded.set_type, reps = excluded.reps, weight_kg = excluded.weight_kg,
        hold_time_seconds = excluded.hold_time_seconds, edge_size_mm = excluded.edge_size_mm, distance_meters = excluded.distance_meters,
        rest_time_seconds = excluded.rest_time_seconds, order_index = excluded.order_index, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE workout_plan_set._dirty = 0`,
    values: [
      dto.id,
      dto.planExerciseId,
      dto.setType,
      dto.reps ?? null,
      dto.weightKg ?? null,
      dto.holdTimeSeconds ?? null,
      dto.edgeSizeMm ?? null,
      dto.distanceMeters ?? null,
      dto.restTimeSeconds ?? null,
      dto.orderIndex,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function workoutPlanSetTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO workout_plan_set (id, plan_exercise_id, set_type, order_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'WORKING', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// --- Heti terv: WeeklyPlan → WeeklyPlanSlot (two-level nested aggregate) ---

export interface WeeklyPlanRow {
  id: string;
  week_start_date: string;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `slots` — a WeeklyPlan row alone never carries them. */
export function weeklyPlanRowToDto(row: WeeklyPlanRow): Omit<WeeklyPlan, 'slots'> {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function weeklyPlanLocalWriteTask(dto: Pick<WeeklyPlan, 'id' | 'weekStartDate'>): SqlTask {
  return {
    statement: `
      INSERT INTO weekly_plan (id, week_start_date, _dirty, _local_only)
      VALUES (?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET week_start_date = excluded.week_start_date, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.weekStartDate],
  };
}

export function weeklyPlanServerApplyTask(dto: Omit<WeeklyPlan, 'slots'>): SqlTask {
  return {
    statement: `
      INSERT INTO weekly_plan (id, week_start_date, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        week_start_date = excluded.week_start_date, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE weekly_plan._dirty = 0`,
    values: [dto.id, dto.weekStartDate, dto.createdAt ?? null, dto.updatedAt ?? null, dto.deleted ? 1 : 0, dto.deletedAt ?? null],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function weeklyPlanTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO weekly_plan (id, week_start_date, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface WeeklyPlanSlotRow {
  id: string;
  weekly_plan_id: string;
  day_of_week: string;
  plan_id: string;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function weeklyPlanSlotRowToDto(row: WeeklyPlanSlotRow): WeeklyPlanSlot {
  return {
    id: row.id,
    weeklyPlanId: row.weekly_plan_id,
    dayOfWeek: row.day_of_week as WeeklyPlanSlot.DayOfWeekEnum,
    planId: row.plan_id,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function weeklyPlanSlotLocalWriteTask(dto: Pick<WeeklyPlanSlot, 'id' | 'weeklyPlanId' | 'dayOfWeek' | 'planId'>): SqlTask {
  return {
    statement: `
      INSERT INTO weekly_plan_slot (id, weekly_plan_id, day_of_week, plan_id, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        day_of_week = excluded.day_of_week, plan_id = excluded.plan_id, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.weeklyPlanId, dto.dayOfWeek, dto.planId],
  };
}

/** Local-only removal — a day cleared in the weekly editor (not a standalone outbox entry). */
export function weeklyPlanSlotLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE weekly_plan_slot SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function weeklyPlanSlotServerApplyTask(dto: WeeklyPlanSlot): SqlTask {
  return {
    statement: `
      INSERT INTO weekly_plan_slot (id, weekly_plan_id, day_of_week, plan_id, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        weekly_plan_id = excluded.weekly_plan_id, day_of_week = excluded.day_of_week, plan_id = excluded.plan_id,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE weekly_plan_slot._dirty = 0`,
    values: [
      dto.id,
      dto.weeklyPlanId,
      dto.dayOfWeek,
      dto.planId,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function weeklyPlanSlotTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO weekly_plan_slot (id, weekly_plan_id, day_of_week, plan_id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'MONDAY', '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingTemplateRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingTemplateRowToDto(row: PackingTemplateRow): PackingTemplate {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingTemplateLocalWriteTask(dto: { id: string; name: string; notes: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template (id, name, notes, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes, _dirty = 1`,
    values: [dto.id, dto.name, dto.notes],
  };
}

export function packingTemplateServerApplyTask(dto: PackingTemplate): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template (id, name, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_template._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingTemplateTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingTemplateItemRow {
  id: string;
  template_id: string;
  gear_item_id: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingTemplateItemRowToDto(row: PackingTemplateItemRow): PackingTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    gearItemId: row.gear_item_id,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingTemplateItemLocalWriteTask(dto: { id: string; templateId: string; gearItemId: string; sortOrder: number }): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template_item (id, template_id, gear_item_id, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET gear_item_id = excluded.gear_item_id, sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.templateId, dto.gearItemId, dto.sortOrder],
  };
}

/** Local-only removal of an item dropped from a template during an edit (not a standalone outbox entry — see SqliteStorageBackend.savePackingTemplate). */
export function packingTemplateItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE packing_template_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function packingTemplateItemServerApplyTask(dto: PackingTemplateItem): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template_item (id, template_id, gear_item_id, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        template_id = excluded.template_id, gear_item_id = excluded.gear_item_id, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_template_item._dirty = 0`,
    values: [
      dto.id,
      dto.templateId,
      dto.gearItemId,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingTemplateItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template_item (id, template_id, gear_item_id, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingSessionRow {
  id: string;
  destination: string | null;
  /** JSON-stringified string[] — SQLite has no native array column, unlike Postgres uuid[] server-side. */
  source_template_ids: string;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingSessionRowToDto(row: PackingSessionRow): PackingSession {
  return {
    id: row.id,
    destination: row.destination,
    sourceTemplateIds: JSON.parse(row.source_template_ids) as string[],
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingSessionLocalWriteTask(dto: { id: string; destination: string | null; sourceTemplateIds: string[] }): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session (id, destination, source_template_ids, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET destination = excluded.destination, source_template_ids = excluded.source_template_ids, _dirty = 1`,
    values: [dto.id, dto.destination, JSON.stringify(dto.sourceTemplateIds)],
  };
}

export function packingSessionServerApplyTask(dto: PackingSession): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session (id, destination, source_template_ids, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        destination = excluded.destination, source_template_ids = excluded.source_template_ids, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_session._dirty = 0`,
    values: [
      dto.id,
      dto.destination ?? null,
      JSON.stringify(dto.sourceTemplateIds ?? []),
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingSessionTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session (id, source_template_ids, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '[]', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingSessionItemRow {
  id: string;
  session_id: string;
  gear_item_id: string;
  status: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingSessionItemRowToDto(row: PackingSessionItemRow): PackingSessionItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    gearItemId: row.gear_item_id,
    status: row.status as PackingSessionItem.StatusEnum,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingSessionItemLocalWriteTask(dto: {
  id: string;
  sessionId: string;
  gearItemId: string;
  status: string;
  sortOrder: number;
}): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session_item (id, session_id, gear_item_id, status, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.sessionId, dto.gearItemId, dto.status, dto.sortOrder],
  };
}

/** Local-only removal (GearItem cascade) — not a standalone outbox entry, matching packingTemplateItemLocalRemoveTask's reasoning. */
export function packingSessionItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE packing_session_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function packingSessionItemServerApplyTask(dto: PackingSessionItem): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session_item (id, session_id, gear_item_id, status, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id, gear_item_id = excluded.gear_item_id, status = excluded.status, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_session_item._dirty = 0`,
    values: [
      dto.id,
      dto.sessionId,
      dto.gearItemId,
      dto.status,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingSessionItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session_item (id, session_id, gear_item_id, status, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 'NOT_PACKED', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface LifePlanRow {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  target_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function lifePlanRowToDto(row: LifePlanRow): LifePlan {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status as LifePlan.StatusEnum,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function lifePlanLocalWriteTask(dto: LifePlan): SqlTask {
  return {
    statement: `
      INSERT INTO life_plan (id, title, notes, status, target_date, completed_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, notes = excluded.notes, status = excluded.status,
        target_date = excluded.target_date, completed_at = excluded.completed_at, _dirty = 1`,
    values: [dto.id, dto.title, dto.notes ?? null, dto.status, dto.targetDate ?? null, dto.completedAt ?? null],
  };
}

export function lifePlanServerApplyTask(dto: LifePlan): SqlTask {
  return {
    statement: `
      INSERT INTO life_plan (id, title, notes, status, target_date, completed_at, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, notes = excluded.notes, status = excluded.status, target_date = excluded.target_date,
        completed_at = excluded.completed_at, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE life_plan._dirty = 0`,
    values: [
      dto.id,
      dto.title,
      dto.notes ?? null,
      dto.status,
      dto.targetDate ?? null,
      dto.completedAt ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function lifePlanTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO life_plan (id, title, status, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'PLANNED', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface SwimLogRow {
  id: string;
  swim_date: string;
  duration_minutes: number;
  intensity: string;
  pool_length_meters: number | null;
  lap_count: number | null;
  distance_meters: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function swimLogRowToDto(row: SwimLogRow): SwimLog {
  return {
    id: row.id,
    date: row.swim_date,
    durationMinutes: row.duration_minutes,
    intensity: row.intensity as SwimLog.IntensityEnum,
    poolLengthMeters: row.pool_length_meters,
    lapCount: row.lap_count,
    distanceMeters: row.distance_meters,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function swimLogLocalWriteTask(dto: SwimLog): SqlTask {
  return {
    statement: `
      INSERT INTO swim_log (id, swim_date, duration_minutes, intensity, pool_length_meters, lap_count, distance_meters, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        swim_date = excluded.swim_date, duration_minutes = excluded.duration_minutes, intensity = excluded.intensity,
        pool_length_meters = excluded.pool_length_meters, lap_count = excluded.lap_count,
        distance_meters = excluded.distance_meters, _dirty = 1`,
    values: [
      dto.id,
      dto.date,
      dto.durationMinutes,
      dto.intensity,
      dto.poolLengthMeters ?? null,
      dto.lapCount ?? null,
      dto.distanceMeters ?? null,
    ],
  };
}

export function swimLogServerApplyTask(dto: SwimLog): SqlTask {
  return {
    statement: `
      INSERT INTO swim_log (id, swim_date, duration_minutes, intensity, pool_length_meters, lap_count, distance_meters, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        swim_date = excluded.swim_date, duration_minutes = excluded.duration_minutes, intensity = excluded.intensity,
        pool_length_meters = excluded.pool_length_meters, lap_count = excluded.lap_count, distance_meters = excluded.distance_meters,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE swim_log._dirty = 0`,
    values: [
      dto.id,
      dto.date,
      dto.durationMinutes,
      dto.intensity,
      dto.poolLengthMeters ?? null,
      dto.lapCount ?? null,
      dto.distanceMeters ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function swimLogTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO swim_log (id, swim_date, duration_minutes, intensity, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', 1, 'CASUAL', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface BikeRideLogRow {
  id: string;
  ride_date: string;
  duration_minutes: number;
  intensity: string;
  distance_km: number | null;
  elevation_gain_meters: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function bikeRideLogRowToDto(row: BikeRideLogRow): BikeRideLog {
  return {
    id: row.id,
    date: row.ride_date,
    durationMinutes: row.duration_minutes,
    intensity: row.intensity as BikeRideLog.IntensityEnum,
    distanceKm: row.distance_km,
    elevationGainMeters: row.elevation_gain_meters,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function bikeRideLogLocalWriteTask(dto: BikeRideLog): SqlTask {
  return {
    statement: `
      INSERT INTO bike_ride_log (id, ride_date, duration_minutes, intensity, distance_km, elevation_gain_meters, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        ride_date = excluded.ride_date, duration_minutes = excluded.duration_minutes, intensity = excluded.intensity,
        distance_km = excluded.distance_km, elevation_gain_meters = excluded.elevation_gain_meters, _dirty = 1`,
    values: [
      dto.id,
      dto.date,
      dto.durationMinutes,
      dto.intensity,
      dto.distanceKm ?? null,
      dto.elevationGainMeters ?? null,
    ],
  };
}

export function bikeRideLogServerApplyTask(dto: BikeRideLog): SqlTask {
  return {
    statement: `
      INSERT INTO bike_ride_log (id, ride_date, duration_minutes, intensity, distance_km, elevation_gain_meters, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        ride_date = excluded.ride_date, duration_minutes = excluded.duration_minutes, intensity = excluded.intensity,
        distance_km = excluded.distance_km, elevation_gain_meters = excluded.elevation_gain_meters,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE bike_ride_log._dirty = 0`,
    values: [
      dto.id,
      dto.date,
      dto.durationMinutes,
      dto.intensity,
      dto.distanceKm ?? null,
      dto.elevationGainMeters ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function bikeRideLogTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO bike_ride_log (id, ride_date, duration_minutes, intensity, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', 1, 'CITY', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// ---------------------------------------------------------------------------
// documentation/Subfeatures/Indoor boulder admin.md + Indoor köteles admin.md — indoor venue master
// (Mászónapló M3a): Gym + GymColorBand + IndoorRoute, three flat user-owned CRUD tables. `disciplines`
// / `availableSafetyStyles` round-trip through a JSON string in a TEXT column.
// ---------------------------------------------------------------------------

export interface GymRow {
  id: string;
  name: string;
  address: string | null;
  disciplines: string;
  default_wall_height_meters: number | null;
  available_safety_styles: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function gymRowToDto(row: GymRow): Gym {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    disciplines: JSON.parse(row.disciplines) as Gym.DisciplinesEnum[],
    defaultWallHeightMeters: row.default_wall_height_meters,
    availableSafetyStyles:
      row.available_safety_styles === null ? null : (JSON.parse(row.available_safety_styles) as Gym.AvailableSafetyStylesEnum[]),
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function gymLocalWriteTask(dto: Gym): SqlTask {
  return {
    statement: `
      INSERT INTO gym (id, name, address, disciplines, default_wall_height_meters, available_safety_styles, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, address = excluded.address, disciplines = excluded.disciplines,
        default_wall_height_meters = excluded.default_wall_height_meters, available_safety_styles = excluded.available_safety_styles,
        _dirty = 1`,
    values: [
      dto.id,
      dto.name,
      dto.address ?? null,
      JSON.stringify(dto.disciplines ?? []),
      dto.defaultWallHeightMeters ?? null,
      dto.availableSafetyStyles ? JSON.stringify(dto.availableSafetyStyles) : null,
    ],
  };
}

export function gymServerApplyTask(dto: Gym): SqlTask {
  return {
    statement: `
      INSERT INTO gym (id, name, address, disciplines, default_wall_height_meters, available_safety_styles, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, address = excluded.address, disciplines = excluded.disciplines,
        default_wall_height_meters = excluded.default_wall_height_meters, available_safety_styles = excluded.available_safety_styles,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE gym._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.address ?? null,
      JSON.stringify(dto.disciplines ?? []),
      dto.defaultWallHeightMeters ?? null,
      dto.availableSafetyStyles ? JSON.stringify(dto.availableSafetyStyles) : null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function gymTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO gym (id, name, disciplines, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '[]', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface GymColorBandRow {
  id: string;
  gym_id: string;
  name: string;
  hex_color: string;
  variant: string;
  grade_lower: string;
  grade_upper: string;
  absolute_difficulty_index_lower: number;
  absolute_difficulty_index_upper: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function gymColorBandRowToDto(row: GymColorBandRow): GymColorBand {
  return {
    id: row.id,
    gymId: row.gym_id,
    name: row.name,
    hexColor: row.hex_color,
    variant: row.variant as GymColorBand.VariantEnum,
    gradeLower: row.grade_lower,
    gradeUpper: row.grade_upper,
    absoluteDifficultyIndexLower: row.absolute_difficulty_index_lower,
    absoluteDifficultyIndexUpper: row.absolute_difficulty_index_upper,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function gymColorBandLocalWriteTask(dto: GymColorBand): SqlTask {
  return {
    statement: `
      INSERT INTO gym_color_band (id, gym_id, name, hex_color, variant, grade_lower, grade_upper, absolute_difficulty_index_lower, absolute_difficulty_index_upper, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id, name = excluded.name, hex_color = excluded.hex_color, variant = excluded.variant,
        grade_lower = excluded.grade_lower, grade_upper = excluded.grade_upper,
        absolute_difficulty_index_lower = excluded.absolute_difficulty_index_lower,
        absolute_difficulty_index_upper = excluded.absolute_difficulty_index_upper, _dirty = 1`,
    values: [
      dto.id,
      dto.gymId,
      dto.name,
      dto.hexColor,
      dto.variant,
      dto.gradeLower,
      dto.gradeUpper,
      dto.absoluteDifficultyIndexLower,
      dto.absoluteDifficultyIndexUpper,
    ],
  };
}

export function gymColorBandServerApplyTask(dto: GymColorBand): SqlTask {
  return {
    statement: `
      INSERT INTO gym_color_band (id, gym_id, name, hex_color, variant, grade_lower, grade_upper, absolute_difficulty_index_lower, absolute_difficulty_index_upper, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id, name = excluded.name, hex_color = excluded.hex_color, variant = excluded.variant,
        grade_lower = excluded.grade_lower, grade_upper = excluded.grade_upper,
        absolute_difficulty_index_lower = excluded.absolute_difficulty_index_lower,
        absolute_difficulty_index_upper = excluded.absolute_difficulty_index_upper,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE gym_color_band._dirty = 0`,
    values: [
      dto.id,
      dto.gymId,
      dto.name,
      dto.hexColor,
      dto.variant,
      dto.gradeLower,
      dto.gradeUpper,
      dto.absoluteDifficultyIndexLower,
      dto.absoluteDifficultyIndexUpper,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function gymColorBandTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO gym_color_band (id, gym_id, name, hex_color, variant, grade_lower, grade_upper, absolute_difficulty_index_lower, absolute_difficulty_index_upper, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', '#000000', 'NEUTRAL', '', '', 0, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface IndoorRouteRow {
  id: string;
  gym_id: string;
  name: string;
  discipline: string;
  grade: string;
  absolute_difficulty_index: number;
  sector: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function indoorRouteRowToDto(row: IndoorRouteRow): IndoorRoute {
  return {
    id: row.id,
    gymId: row.gym_id,
    name: row.name,
    discipline: row.discipline as IndoorRoute.DisciplineEnum,
    grade: row.grade,
    absoluteDifficultyIndex: row.absolute_difficulty_index,
    sector: row.sector,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function indoorRouteLocalWriteTask(dto: IndoorRoute): SqlTask {
  return {
    statement: `
      INSERT INTO indoor_route (id, gym_id, name, discipline, grade, absolute_difficulty_index, sector, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id, name = excluded.name, discipline = excluded.discipline, grade = excluded.grade,
        absolute_difficulty_index = excluded.absolute_difficulty_index, sector = excluded.sector, _dirty = 1`,
    values: [dto.id, dto.gymId, dto.name, dto.discipline, dto.grade, dto.absoluteDifficultyIndex, dto.sector ?? null],
  };
}

export function indoorRouteServerApplyTask(dto: IndoorRoute): SqlTask {
  return {
    statement: `
      INSERT INTO indoor_route (id, gym_id, name, discipline, grade, absolute_difficulty_index, sector, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id, name = excluded.name, discipline = excluded.discipline, grade = excluded.grade,
        absolute_difficulty_index = excluded.absolute_difficulty_index, sector = excluded.sector,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE indoor_route._dirty = 0`,
    values: [
      dto.id,
      dto.gymId,
      dto.name,
      dto.discipline,
      dto.grade,
      dto.absoluteDifficultyIndex,
      dto.sector ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function indoorRouteTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO indoor_route (id, gym_id, name, discipline, grade, absolute_difficulty_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 'BOULDER', '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// ---------------------------------------------------------------------------
// documentation/Subfeatures/Outdoor boulder admin.md + Outdoor köteles admin.md — outdoor venue
// master (Mászónapló M3b): the shared location tree Crag → Sector → (Route | BoulderProblem), four
// flat user-owned CRUD tables, no name-uniqueness.
// ---------------------------------------------------------------------------

export interface CragRow {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  default_rock_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function cragRowToDto(row: CragRow): Crag {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    defaultRockType: row.default_rock_type,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function cragLocalWriteTask(dto: Crag): SqlTask {
  return {
    statement: `
      INSERT INTO crag (id, name, latitude, longitude, default_rock_type, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude,
        default_rock_type = excluded.default_rock_type, _dirty = 1`,
    values: [dto.id, dto.name, dto.latitude ?? null, dto.longitude ?? null, dto.defaultRockType ?? null],
  };
}

export function cragServerApplyTask(dto: Crag): SqlTask {
  return {
    statement: `
      INSERT INTO crag (id, name, latitude, longitude, default_rock_type, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude,
        default_rock_type = excluded.default_rock_type, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE crag._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.latitude ?? null,
      dto.longitude ?? null,
      dto.defaultRockType ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function cragTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO crag (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface SectorRow {
  id: string;
  crag_id: string;
  name: string;
  default_aspect: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function sectorRowToDto(row: SectorRow): Sector {
  return {
    id: row.id,
    cragId: row.crag_id,
    name: row.name,
    defaultAspect: row.default_aspect,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function sectorLocalWriteTask(dto: Sector): SqlTask {
  return {
    statement: `
      INSERT INTO sector (id, crag_id, name, default_aspect, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        crag_id = excluded.crag_id, name = excluded.name, default_aspect = excluded.default_aspect, _dirty = 1`,
    values: [dto.id, dto.cragId, dto.name, dto.defaultAspect ?? null],
  };
}

export function sectorServerApplyTask(dto: Sector): SqlTask {
  return {
    statement: `
      INSERT INTO sector (id, crag_id, name, default_aspect, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        crag_id = excluded.crag_id, name = excluded.name, default_aspect = excluded.default_aspect,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE sector._dirty = 0`,
    values: [
      dto.id,
      dto.cragId,
      dto.name,
      dto.defaultAspect ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function sectorTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO sector (id, crag_id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface RouteRow {
  id: string;
  sector_id: string;
  name: string;
  guidebook_grade: string;
  length_in_meters: number | null;
  total_pitches: number | null;
  rock_type: string | null;
  aspect: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function routeRowToDto(row: RouteRow): Route {
  return {
    id: row.id,
    sectorId: row.sector_id,
    name: row.name,
    guidebookGrade: row.guidebook_grade,
    lengthInMeters: row.length_in_meters,
    totalPitches: row.total_pitches,
    rockType: row.rock_type,
    aspect: row.aspect,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function routeLocalWriteTask(dto: Route): SqlTask {
  return {
    statement: `
      INSERT INTO route (id, sector_id, name, guidebook_grade, length_in_meters, total_pitches, rock_type, aspect, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        sector_id = excluded.sector_id, name = excluded.name, guidebook_grade = excluded.guidebook_grade,
        length_in_meters = excluded.length_in_meters, total_pitches = excluded.total_pitches,
        rock_type = excluded.rock_type, aspect = excluded.aspect, _dirty = 1`,
    values: [
      dto.id,
      dto.sectorId,
      dto.name,
      dto.guidebookGrade,
      dto.lengthInMeters ?? null,
      dto.totalPitches ?? null,
      dto.rockType ?? null,
      dto.aspect ?? null,
    ],
  };
}

export function routeServerApplyTask(dto: Route): SqlTask {
  return {
    statement: `
      INSERT INTO route (id, sector_id, name, guidebook_grade, length_in_meters, total_pitches, rock_type, aspect, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        sector_id = excluded.sector_id, name = excluded.name, guidebook_grade = excluded.guidebook_grade,
        length_in_meters = excluded.length_in_meters, total_pitches = excluded.total_pitches,
        rock_type = excluded.rock_type, aspect = excluded.aspect,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE route._dirty = 0`,
    values: [
      dto.id,
      dto.sectorId,
      dto.name,
      dto.guidebookGrade,
      dto.lengthInMeters ?? null,
      dto.totalPitches ?? null,
      dto.rockType ?? null,
      dto.aspect ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function routeTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO route (id, sector_id, name, guidebook_grade, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface BoulderProblemRow {
  id: string;
  sector_id: string;
  name: string;
  guidebook_grade: string;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function boulderProblemRowToDto(row: BoulderProblemRow): BoulderProblem {
  return {
    id: row.id,
    sectorId: row.sector_id,
    name: row.name,
    guidebookGrade: row.guidebook_grade,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function boulderProblemLocalWriteTask(dto: BoulderProblem): SqlTask {
  return {
    statement: `
      INSERT INTO boulder_problem (id, sector_id, name, guidebook_grade, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        sector_id = excluded.sector_id, name = excluded.name, guidebook_grade = excluded.guidebook_grade, _dirty = 1`,
    values: [dto.id, dto.sectorId, dto.name, dto.guidebookGrade],
  };
}

export function boulderProblemServerApplyTask(dto: BoulderProblem): SqlTask {
  return {
    statement: `
      INSERT INTO boulder_problem (id, sector_id, name, guidebook_grade, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        sector_id = excluded.sector_id, name = excluded.name, guidebook_grade = excluded.guidebook_grade,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE boulder_problem._dirty = 0`,
    values: [
      dto.id,
      dto.sectorId,
      dto.name,
      dto.guidebookGrade,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function boulderProblemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO boulder_problem (id, sector_id, name, guidebook_grade, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// ---------------------------------------------------------------------------
// documentation/Features/Mászónapló.md — the climbing log (Mászónapló M4): ClimbingSession →
// AscentAttempt → PitchLog, a three-level nested aggregate mirroring workout_session. The two child
// tables have no user scope (ownership flows through session_id). `climbing_partners` round-trips
// through a JSON string in a TEXT column. Child rows never get their own outbox entry — the whole
// tree goes out under the `ClimbingSession` entity type.
// ---------------------------------------------------------------------------

export interface ClimbingSessionRow {
  id: string;
  session_date: string;
  location_type: string;
  discipline: string;
  total_session_duration_minutes: number | null;
  pump_rating: number | null;
  headspace_rating: number | null;
  notes: string | null;
  climbing_partners: string | null;
  weather_conditions: string | null;
  gym_id: string | null;
  gym_name: string | null;
  crag_id: string | null;
  crag_name: string | null;
  sector_id: string | null;
  sector_name: string | null;
  rock_type: string | null;
  aspect: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `attempts` — a ClimbingSession row alone never carries them, see readClimbingSession in SqliteStorageBackend. */
export function climbingSessionRowToDto(row: ClimbingSessionRow): Omit<ClimbingSession, 'attempts'> {
  return {
    id: row.id,
    date: row.session_date,
    locationType: row.location_type as ClimbingSession.LocationTypeEnum,
    discipline: row.discipline as ClimbingSession.DisciplineEnum,
    totalSessionDurationMinutes: row.total_session_duration_minutes,
    pumpRating: row.pump_rating,
    headspaceRating: row.headspace_rating,
    notes: row.notes,
    climbingPartners: row.climbing_partners === null ? null : (JSON.parse(row.climbing_partners) as string[]),
    weatherConditions: (row.weather_conditions as ClimbingSession.WeatherConditionsEnum | null) ?? null,
    gymId: row.gym_id,
    gymName: row.gym_name,
    cragId: row.crag_id,
    cragName: row.crag_name,
    sectorId: row.sector_id,
    sectorName: row.sector_name,
    rockType: row.rock_type,
    aspect: row.aspect,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export type ClimbingSessionWriteInput = Omit<ClimbingSession, 'attempts' | 'deleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

function climbingPartnersJson(partners: Array<string> | null | undefined): string | null {
  return partners && partners.length > 0 ? JSON.stringify(partners) : null;
}

export function climbingSessionLocalWriteTask(dto: ClimbingSessionWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO climbing_session (id, session_date, location_type, discipline, total_session_duration_minutes, pump_rating, headspace_rating, notes, climbing_partners, weather_conditions, gym_id, gym_name, crag_id, crag_name, sector_id, sector_name, rock_type, aspect, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        session_date = excluded.session_date, location_type = excluded.location_type, discipline = excluded.discipline,
        total_session_duration_minutes = excluded.total_session_duration_minutes, pump_rating = excluded.pump_rating,
        headspace_rating = excluded.headspace_rating, notes = excluded.notes, climbing_partners = excluded.climbing_partners,
        weather_conditions = excluded.weather_conditions, gym_id = excluded.gym_id, gym_name = excluded.gym_name,
        crag_id = excluded.crag_id, crag_name = excluded.crag_name, sector_id = excluded.sector_id, sector_name = excluded.sector_name,
        rock_type = excluded.rock_type, aspect = excluded.aspect, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.date,
      dto.locationType,
      dto.discipline,
      dto.totalSessionDurationMinutes ?? null,
      dto.pumpRating ?? null,
      dto.headspaceRating ?? null,
      dto.notes ?? null,
      climbingPartnersJson(dto.climbingPartners),
      dto.weatherConditions ?? null,
      dto.gymId ?? null,
      dto.gymName ?? null,
      dto.cragId ?? null,
      dto.cragName ?? null,
      dto.sectorId ?? null,
      dto.sectorName ?? null,
      dto.rockType ?? null,
      dto.aspect ?? null,
    ],
  };
}

export function climbingSessionServerApplyTask(dto: Omit<ClimbingSession, 'attempts'>): SqlTask {
  return {
    statement: `
      INSERT INTO climbing_session (id, session_date, location_type, discipline, total_session_duration_minutes, pump_rating, headspace_rating, notes, climbing_partners, weather_conditions, gym_id, gym_name, crag_id, crag_name, sector_id, sector_name, rock_type, aspect, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        session_date = excluded.session_date, location_type = excluded.location_type, discipline = excluded.discipline,
        total_session_duration_minutes = excluded.total_session_duration_minutes, pump_rating = excluded.pump_rating,
        headspace_rating = excluded.headspace_rating, notes = excluded.notes, climbing_partners = excluded.climbing_partners,
        weather_conditions = excluded.weather_conditions, gym_id = excluded.gym_id, gym_name = excluded.gym_name,
        crag_id = excluded.crag_id, crag_name = excluded.crag_name, sector_id = excluded.sector_id, sector_name = excluded.sector_name,
        rock_type = excluded.rock_type, aspect = excluded.aspect, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE climbing_session._dirty = 0`,
    values: [
      dto.id,
      dto.date,
      dto.locationType,
      dto.discipline,
      dto.totalSessionDurationMinutes ?? null,
      dto.pumpRating ?? null,
      dto.headspaceRating ?? null,
      dto.notes ?? null,
      climbingPartnersJson(dto.climbingPartners),
      dto.weatherConditions ?? null,
      dto.gymId ?? null,
      dto.gymName ?? null,
      dto.cragId ?? null,
      dto.cragName ?? null,
      dto.sectorId ?? null,
      dto.sectorName ?? null,
      dto.rockType ?? null,
      dto.aspect ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function climbingSessionTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO climbing_session (id, session_date, location_type, discipline, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', 'INDOOR', 'BOULDER', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface AscentAttemptRow {
  id: string;
  session_id: string;
  is_success: number;
  user_raw_input: string | null;
  absolute_difficulty_index: number | null;
  ascent_style: string | null;
  safety_style: string | null;
  failure_point: string | null;
  attempt_count: number | null;
  color_band_id: string | null;
  color_name: string | null;
  hex_color: string | null;
  grade_range: string | null;
  indoor_route_id: string | null;
  route_id: string | null;
  boulder_problem_id: string | null;
  route_name: string | null;
  length_in_meters: number | null;
  notes: string | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `pitches` — an AscentAttempt row alone never carries them. */
export function ascentAttemptRowToDto(row: AscentAttemptRow): Omit<AscentAttempt, 'pitches'> {
  return {
    id: row.id,
    sessionId: row.session_id,
    isSuccess: row.is_success === 1,
    userRawInput: row.user_raw_input,
    absoluteDifficultyIndex: row.absolute_difficulty_index,
    ascentStyle: (row.ascent_style as AscentAttempt.AscentStyleEnum | null) ?? null,
    safetyStyle: (row.safety_style as AscentAttempt.SafetyStyleEnum | null) ?? null,
    failurePoint: row.failure_point,
    attemptCount: row.attempt_count,
    colorBandId: row.color_band_id,
    colorName: row.color_name,
    hexColor: row.hex_color,
    gradeRange: row.grade_range,
    indoorRouteId: row.indoor_route_id,
    routeId: row.route_id,
    boulderProblemId: row.boulder_problem_id,
    routeName: row.route_name,
    lengthInMeters: row.length_in_meters,
    notes: row.notes,
    orderIndex: row.order_index,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export type AscentAttemptWriteInput = Omit<AscentAttempt, 'pitches' | 'deleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

export function ascentAttemptLocalWriteTask(dto: AscentAttemptWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO ascent_attempt (id, session_id, is_success, user_raw_input, absolute_difficulty_index, ascent_style, safety_style, failure_point, attempt_count, color_band_id, color_name, hex_color, grade_range, indoor_route_id, route_id, boulder_problem_id, route_name, length_in_meters, notes, order_index, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id, is_success = excluded.is_success, user_raw_input = excluded.user_raw_input,
        absolute_difficulty_index = excluded.absolute_difficulty_index, ascent_style = excluded.ascent_style,
        safety_style = excluded.safety_style, failure_point = excluded.failure_point, attempt_count = excluded.attempt_count,
        color_band_id = excluded.color_band_id, color_name = excluded.color_name, hex_color = excluded.hex_color,
        grade_range = excluded.grade_range, indoor_route_id = excluded.indoor_route_id, route_id = excluded.route_id,
        boulder_problem_id = excluded.boulder_problem_id, route_name = excluded.route_name, length_in_meters = excluded.length_in_meters,
        notes = excluded.notes, order_index = excluded.order_index, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.sessionId,
      dto.isSuccess ? 1 : 0,
      dto.userRawInput ?? null,
      dto.absoluteDifficultyIndex ?? null,
      dto.ascentStyle ?? null,
      dto.safetyStyle ?? null,
      dto.failurePoint ?? null,
      dto.attemptCount ?? null,
      dto.colorBandId ?? null,
      dto.colorName ?? null,
      dto.hexColor ?? null,
      dto.gradeRange ?? null,
      dto.indoorRouteId ?? null,
      dto.routeId ?? null,
      dto.boulderProblemId ?? null,
      dto.routeName ?? null,
      dto.lengthInMeters ?? null,
      dto.notes ?? null,
      dto.orderIndex,
    ],
  };
}

/** Local-only removal — an attempt dropped from a session during an edit (not a standalone outbox entry — see SqliteStorageBackend.saveClimbingSession). */
export function ascentAttemptLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE ascent_attempt SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function ascentAttemptServerApplyTask(dto: Omit<AscentAttempt, 'pitches'>): SqlTask {
  return {
    statement: `
      INSERT INTO ascent_attempt (id, session_id, is_success, user_raw_input, absolute_difficulty_index, ascent_style, safety_style, failure_point, attempt_count, color_band_id, color_name, hex_color, grade_range, indoor_route_id, route_id, boulder_problem_id, route_name, length_in_meters, notes, order_index, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id, is_success = excluded.is_success, user_raw_input = excluded.user_raw_input,
        absolute_difficulty_index = excluded.absolute_difficulty_index, ascent_style = excluded.ascent_style,
        safety_style = excluded.safety_style, failure_point = excluded.failure_point, attempt_count = excluded.attempt_count,
        color_band_id = excluded.color_band_id, color_name = excluded.color_name, hex_color = excluded.hex_color,
        grade_range = excluded.grade_range, indoor_route_id = excluded.indoor_route_id, route_id = excluded.route_id,
        boulder_problem_id = excluded.boulder_problem_id, route_name = excluded.route_name, length_in_meters = excluded.length_in_meters,
        notes = excluded.notes, order_index = excluded.order_index, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE ascent_attempt._dirty = 0`,
    values: [
      dto.id,
      dto.sessionId,
      dto.isSuccess ? 1 : 0,
      dto.userRawInput ?? null,
      dto.absoluteDifficultyIndex ?? null,
      dto.ascentStyle ?? null,
      dto.safetyStyle ?? null,
      dto.failurePoint ?? null,
      dto.attemptCount ?? null,
      dto.colorBandId ?? null,
      dto.colorName ?? null,
      dto.hexColor ?? null,
      dto.gradeRange ?? null,
      dto.indoorRouteId ?? null,
      dto.routeId ?? null,
      dto.boulderProblemId ?? null,
      dto.routeName ?? null,
      dto.lengthInMeters ?? null,
      dto.notes ?? null,
      dto.orderIndex,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function ascentAttemptTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO ascent_attempt (id, session_id, is_success, order_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PitchLogRow {
  id: string;
  attempt_id: string;
  pitch_number: number;
  is_lead: number;
  raw_grade: string | null;
  absolute_difficulty_index: number | null;
  length_in_meters: number | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function pitchLogRowToDto(row: PitchLogRow): PitchLog {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    pitchNumber: row.pitch_number,
    isLead: row.is_lead === 1,
    rawGrade: row.raw_grade,
    absoluteDifficultyIndex: row.absolute_difficulty_index,
    lengthInMeters: row.length_in_meters,
    orderIndex: row.order_index,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export type PitchLogWriteInput = Omit<PitchLog, 'deleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

export function pitchLogLocalWriteTask(dto: PitchLogWriteInput): SqlTask {
  return {
    statement: `
      INSERT INTO pitch_log (id, attempt_id, pitch_number, is_lead, raw_grade, absolute_difficulty_index, length_in_meters, order_index, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        attempt_id = excluded.attempt_id, pitch_number = excluded.pitch_number, is_lead = excluded.is_lead,
        raw_grade = excluded.raw_grade, absolute_difficulty_index = excluded.absolute_difficulty_index,
        length_in_meters = excluded.length_in_meters, order_index = excluded.order_index, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.attemptId,
      dto.pitchNumber,
      dto.isLead ? 1 : 0,
      dto.rawGrade ?? null,
      dto.absoluteDifficultyIndex ?? null,
      dto.lengthInMeters ?? null,
      dto.orderIndex,
    ],
  };
}

/** Local-only removal — a pitch dropped from an attempt during an edit (not a standalone outbox entry). */
export function pitchLogLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE pitch_log SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function pitchLogServerApplyTask(dto: PitchLog): SqlTask {
  return {
    statement: `
      INSERT INTO pitch_log (id, attempt_id, pitch_number, is_lead, raw_grade, absolute_difficulty_index, length_in_meters, order_index, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        attempt_id = excluded.attempt_id, pitch_number = excluded.pitch_number, is_lead = excluded.is_lead,
        raw_grade = excluded.raw_grade, absolute_difficulty_index = excluded.absolute_difficulty_index,
        length_in_meters = excluded.length_in_meters, order_index = excluded.order_index, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE pitch_log._dirty = 0`,
    values: [
      dto.id,
      dto.attemptId,
      dto.pitchNumber,
      dto.isLead ? 1 : 0,
      dto.rawGrade ?? null,
      dto.absoluteDifficultyIndex ?? null,
      dto.lengthInMeters ?? null,
      dto.orderIndex,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function pitchLogTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO pitch_log (id, attempt_id, pitch_number, is_lead, order_index, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 1, 1, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface HouseholdRoomRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function householdRoomRowToDto(row: HouseholdRoomRow): HouseholdRoom {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function householdRoomLocalWriteTask(dto: HouseholdRoom): SqlTask {
  return {
    statement: `
      INSERT INTO household_room (id, name, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order, _dirty = 1`,
    values: [dto.id, dto.name, dto.sortOrder],
  };
}

export function householdRoomServerApplyTask(dto: HouseholdRoom): SqlTask {
  return {
    statement: `
      INSERT INTO household_room (id, name, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, sort_order = excluded.sort_order, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE household_room._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function householdRoomTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO household_room (id, name, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface HouseholdTaskRow {
  id: string;
  room_id: string;
  name: string;
  energy_level: string;
  estimated_minutes: number;
  interval_days: number;
  next_due: string;
  last_completed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function householdTaskRowToDto(row: HouseholdTaskRow): HouseholdTask {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    energyLevel: row.energy_level as HouseholdTask.EnergyLevelEnum,
    estimatedMinutes: row.estimated_minutes,
    intervalDays: row.interval_days,
    nextDue: row.next_due,
    lastCompletedAt: row.last_completed_at,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function householdTaskLocalWriteTask(dto: HouseholdTask): SqlTask {
  return {
    statement: `
      INSERT INTO household_task (id, room_id, name, energy_level, estimated_minutes, interval_days, next_due, last_completed_at, notes, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        room_id = excluded.room_id, name = excluded.name, energy_level = excluded.energy_level,
        estimated_minutes = excluded.estimated_minutes, interval_days = excluded.interval_days,
        next_due = excluded.next_due, last_completed_at = excluded.last_completed_at, notes = excluded.notes, _dirty = 1`,
    values: [
      dto.id,
      dto.roomId,
      dto.name,
      dto.energyLevel,
      dto.estimatedMinutes,
      dto.intervalDays,
      dto.nextDue,
      dto.lastCompletedAt ?? null,
      dto.notes ?? null,
    ],
  };
}

/** Local-only removal of a task cascaded from its room being deleted (not a standalone outbox entry — see SqliteStorageBackend.deleteHouseholdRoom). */
export function householdTaskLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE household_task SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function householdTaskServerApplyTask(dto: HouseholdTask): SqlTask {
  return {
    statement: `
      INSERT INTO household_task (id, room_id, name, energy_level, estimated_minutes, interval_days, next_due, last_completed_at, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        room_id = excluded.room_id, name = excluded.name, energy_level = excluded.energy_level,
        estimated_minutes = excluded.estimated_minutes, interval_days = excluded.interval_days, next_due = excluded.next_due,
        last_completed_at = excluded.last_completed_at, notes = excluded.notes, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE household_task._dirty = 0`,
    values: [
      dto.id,
      dto.roomId,
      dto.name,
      dto.energyLevel,
      dto.estimatedMinutes,
      dto.intervalDays,
      dto.nextDue,
      dto.lastCompletedAt ?? null,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function householdTaskTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO household_task (id, room_id, name, energy_level, estimated_minutes, interval_days, next_due, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 'LOW', 0, 1, '1970-01-01', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface CalendarEventRow {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  all_day: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  frequency: string | null;
  interval: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function calendarEventRowToDto(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    notes: row.notes,
    allDay: row.all_day === 1,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    frequency: row.frequency as CalendarEvent.FrequencyEnum | null,
    interval: row.interval,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function calendarEventLocalWriteTask(dto: CalendarEvent): SqlTask {
  return {
    statement: `
      INSERT INTO calendar_event (id, title, location, notes, all_day, date, start_time, end_time, frequency, interval, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, location = excluded.location, notes = excluded.notes, all_day = excluded.all_day,
        date = excluded.date, start_time = excluded.start_time, end_time = excluded.end_time,
        frequency = excluded.frequency, interval = excluded.interval, _dirty = 1`,
    values: [
      dto.id,
      dto.title,
      dto.location ?? null,
      dto.notes ?? null,
      dto.allDay ? 1 : 0,
      dto.date,
      dto.startTime ?? null,
      dto.endTime ?? null,
      dto.frequency ?? null,
      dto.interval,
    ],
  };
}

export function calendarEventServerApplyTask(dto: CalendarEvent): SqlTask {
  return {
    statement: `
      INSERT INTO calendar_event (id, title, location, notes, all_day, date, start_time, end_time, frequency, interval, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, location = excluded.location, notes = excluded.notes, all_day = excluded.all_day,
        date = excluded.date, start_time = excluded.start_time, end_time = excluded.end_time, frequency = excluded.frequency,
        interval = excluded.interval, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE calendar_event._dirty = 0`,
    values: [
      dto.id,
      dto.title,
      dto.location ?? null,
      dto.notes ?? null,
      dto.allDay ? 1 : 0,
      dto.date,
      dto.startTime ?? null,
      dto.endTime ?? null,
      dto.frequency ?? null,
      dto.interval,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function calendarEventTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO calendar_event (id, title, all_day, date, interval, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 1, '1970-01-01', 1, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface FoodRow {
  id: string;
  name: string;
  store: string | null;
  brand: string | null;
  barcode: string | null;
  note: string | null;
  price_huf: number | null;
  net_amount: number | null;
  net_unit: string | null;
  piece_amount: number | null;
  piece_unit: string | null;
  energy_kcal: number | null;
  fat_g: number | null;
  fat_saturated_g: number | null;
  fat_unsaturated_g: number | null;
  fat_trans_g: number | null;
  carbs_g: number | null;
  carbs_sugars_g: number | null;
  carbs_complex_g: number | null;
  carbs_fiber_g: number | null;
  protein_g: number | null;
  salt_g: number | null;
  sodium_g: number | null;
  chloride_g: number | null;
  shelf_room_amount: number | null;
  shelf_room_unit: string | null;
  shelf_fridge_amount: number | null;
  shelf_fridge_unit: string | null;
  shelf_freezer_amount: number | null;
  shelf_freezer_unit: string | null;
  shelf_after_opening_amount: number | null;
  shelf_after_opening_unit: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function foodRowToDto(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    store: row.store,
    brand: row.brand,
    barcode: row.barcode,
    note: row.note,
    priceHuf: row.price_huf,
    netAmount: row.net_amount,
    netUnit: row.net_unit,
    pieceAmount: row.piece_amount,
    pieceUnit: row.piece_unit,
    energyKcal: row.energy_kcal,
    fatG: row.fat_g,
    fatSaturatedG: row.fat_saturated_g,
    fatUnsaturatedG: row.fat_unsaturated_g,
    fatTransG: row.fat_trans_g,
    carbsG: row.carbs_g,
    carbsSugarsG: row.carbs_sugars_g,
    carbsComplexG: row.carbs_complex_g,
    carbsFiberG: row.carbs_fiber_g,
    proteinG: row.protein_g,
    saltG: row.salt_g,
    sodiumG: row.sodium_g,
    chlorideG: row.chloride_g,
    shelfRoomAmount: row.shelf_room_amount,
    shelfRoomUnit: row.shelf_room_unit,
    shelfFridgeAmount: row.shelf_fridge_amount,
    shelfFridgeUnit: row.shelf_fridge_unit,
    shelfFreezerAmount: row.shelf_freezer_amount,
    shelfFreezerUnit: row.shelf_freezer_unit,
    shelfAfterOpeningAmount: row.shelf_after_opening_amount,
    shelfAfterOpeningUnit: row.shelf_after_opening_unit,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

const FOOD_COLUMNS = [
  'name',
  'store',
  'brand',
  'barcode',
  'note',
  'price_huf',
  'net_amount',
  'net_unit',
  'piece_amount',
  'piece_unit',
  'energy_kcal',
  'fat_g',
  'fat_saturated_g',
  'fat_unsaturated_g',
  'fat_trans_g',
  'carbs_g',
  'carbs_sugars_g',
  'carbs_complex_g',
  'carbs_fiber_g',
  'protein_g',
  'salt_g',
  'sodium_g',
  'chloride_g',
  'shelf_room_amount',
  'shelf_room_unit',
  'shelf_fridge_amount',
  'shelf_fridge_unit',
  'shelf_freezer_amount',
  'shelf_freezer_unit',
  'shelf_after_opening_amount',
  'shelf_after_opening_unit',
] as const;

function foodValues(dto: Food): unknown[] {
  return [
    dto.name,
    dto.store ?? null,
    dto.brand ?? null,
    dto.barcode ?? null,
    dto.note ?? null,
    dto.priceHuf ?? null,
    dto.netAmount ?? null,
    dto.netUnit ?? null,
    dto.pieceAmount ?? null,
    dto.pieceUnit ?? null,
    dto.energyKcal ?? null,
    dto.fatG ?? null,
    dto.fatSaturatedG ?? null,
    dto.fatUnsaturatedG ?? null,
    dto.fatTransG ?? null,
    dto.carbsG ?? null,
    dto.carbsSugarsG ?? null,
    dto.carbsComplexG ?? null,
    dto.carbsFiberG ?? null,
    dto.proteinG ?? null,
    dto.saltG ?? null,
    dto.sodiumG ?? null,
    dto.chlorideG ?? null,
    dto.shelfRoomAmount ?? null,
    dto.shelfRoomUnit ?? null,
    dto.shelfFridgeAmount ?? null,
    dto.shelfFridgeUnit ?? null,
    dto.shelfFreezerAmount ?? null,
    dto.shelfFreezerUnit ?? null,
    dto.shelfAfterOpeningAmount ?? null,
    dto.shelfAfterOpeningUnit ?? null,
  ];
}

export function foodLocalWriteTask(dto: Food): SqlTask {
  const assignments = FOOD_COLUMNS.map((column) => `${column} = excluded.${column}`).join(', ');
  return {
    statement: `
      INSERT INTO food (id, ${FOOD_COLUMNS.join(', ')}, _dirty, _local_only)
      VALUES (?, ${FOOD_COLUMNS.map(() => '?').join(', ')}, 1, 1)
      ON CONFLICT(id) DO UPDATE SET ${assignments}, _dirty = 1`,
    values: [dto.id, ...foodValues(dto)],
  };
}

export function foodServerApplyTask(dto: Food): SqlTask {
  const assignments = FOOD_COLUMNS.map((column) => `${column} = excluded.${column}`).join(', ');
  return {
    statement: `
      INSERT INTO food (id, ${FOOD_COLUMNS.join(', ')}, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ${FOOD_COLUMNS.map(() => '?').join(', ')}, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        ${assignments}, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE food._dirty = 0`,
    values: [
      dto.id,
      ...foodValues(dto),
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function foodTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO food (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface StoredFoodRow {
  id: string;
  food_id: string;
  quantity_amount: number;
  quantity_unit: string;
  storage_location: string;
  expires_on: string;
  opened: number;
  opened_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function storedFoodRowToDto(row: StoredFoodRow): StoredFood {
  return {
    id: row.id,
    foodId: row.food_id,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    storageLocation: row.storage_location as StoredFood.StorageLocationEnum,
    expiresOn: row.expires_on,
    opened: row.opened === 1,
    openedAt: row.opened_at,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function storedFoodLocalWriteTask(dto: StoredFood): SqlTask {
  return {
    statement: `
      INSERT INTO stored_food (id, food_id, quantity_amount, quantity_unit, storage_location, expires_on, opened, opened_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        storage_location = excluded.storage_location, expires_on = excluded.expires_on, opened = excluded.opened,
        opened_at = excluded.opened_at, _dirty = 1`,
    values: [
      dto.id,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.storageLocation,
      dto.expiresOn,
      dto.opened ? 1 : 0,
      dto.openedAt ?? null,
    ],
  };
}

export function storedFoodServerApplyTask(dto: StoredFood): SqlTask {
  return {
    statement: `
      INSERT INTO stored_food (id, food_id, quantity_amount, quantity_unit, storage_location, expires_on, opened, opened_at, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        storage_location = excluded.storage_location, expires_on = excluded.expires_on, opened = excluded.opened,
        opened_at = excluded.opened_at, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE stored_food._dirty = 0`,
    values: [
      dto.id,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.storageLocation,
      dto.expiresOn,
      dto.opened ? 1 : 0,
      dto.openedAt ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function storedFoodTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO stored_food (id, food_id, quantity_amount, quantity_unit, storage_location, expires_on, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, '', 'ROOM', '1970-01-01', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

/** Local-only removal of a storage item cascaded from its Food catalog entry being deleted (not a standalone outbox entry — see SqliteStorageBackend.deleteFood). */
export function storedFoodLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE stored_food SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export interface RecipeRow {
  id: string;
  name: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `ingredients` — a Recipe row alone never carries them, see readRecipe in SqliteStorageBackend. */
export function recipeRowToDto(row: RecipeRow): Omit<Recipe, 'ingredients'> {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function recipeLocalWriteTask(dto: { id: string; name: string; note: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO recipe (id, name, note, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, note = excluded.note, _dirty = 1`,
    values: [dto.id, dto.name, dto.note],
  };
}

export function recipeServerApplyTask(dto: Omit<Recipe, 'ingredients'>): SqlTask {
  return {
    statement: `
      INSERT INTO recipe (id, name, note, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, note = excluded.note, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE recipe._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.note ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function recipeTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO recipe (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  food_id: string;
  quantity_amount: number;
  quantity_unit: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function recipeIngredientRowToDto(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    foodId: row.food_id,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function recipeIngredientLocalWriteTask(dto: { id: string; recipeId: string; foodId: string; quantityAmount: number; quantityUnit: string; sortOrder: number }): SqlTask {
  return {
    statement: `
      INSERT INTO recipe_ingredient (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.recipeId, dto.foodId, dto.quantityAmount, dto.quantityUnit, dto.sortOrder],
  };
}

/** Local-only removal — an ingredient dropped from a recipe during an edit, or cascaded from its Food catalog entry being deleted (not a standalone outbox entry — see SqliteStorageBackend.saveRecipe/deleteFood). */
export function recipeIngredientLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE recipe_ingredient SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function recipeIngredientServerApplyTask(dto: RecipeIngredient): SqlTask {
  return {
    statement: `
      INSERT INTO recipe_ingredient (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        recipe_id = excluded.recipe_id, food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        sort_order = excluded.sort_order, created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted,
        deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE recipe_ingredient._dirty = 0`,
    values: [
      dto.id,
      dto.recipeId,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function recipeIngredientTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO recipe_ingredient (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 0, '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

/** §8: no local row + tombstone from server → still recorded, so the row can never "come back". */
export function profileTombstoneTask(id: string, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO user_profile (id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, updatedAt],
  };
}

export interface MealRow {
  id: string;
  eaten_at: string;
  time_zone_id: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `items` — a Meal row alone never carries them, see readMeal in SqliteStorageBackend. */
export function mealRowToDto(row: MealRow): Omit<Meal, 'items'> {
  return {
    id: row.id,
    eatenAt: row.eaten_at,
    timeZoneId: row.time_zone_id,
    note: row.note,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mealLocalWriteTask(dto: { id: string; eatenAt: string; timeZoneId: string; note: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO meal (id, eaten_at, time_zone_id, note, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET eaten_at = excluded.eaten_at, time_zone_id = excluded.time_zone_id, note = excluded.note, _dirty = 1`,
    values: [dto.id, dto.eatenAt, dto.timeZoneId, dto.note],
  };
}

export function mealServerApplyTask(dto: Omit<Meal, 'items'>): SqlTask {
  return {
    statement: `
      INSERT INTO meal (id, eaten_at, time_zone_id, note, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        eaten_at = excluded.eaten_at, time_zone_id = excluded.time_zone_id, note = excluded.note, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE meal._dirty = 0`,
    values: [
      dto.id,
      dto.eatenAt,
      dto.timeZoneId,
      dto.note ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function mealTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO meal (id, eaten_at, time_zone_id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01T00:00:00.000Z', 'UTC', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface MealItemRow {
  id: string;
  meal_id: string;
  type: string;
  recipe_id: string | null;
  food_id: string | null;
  quantity_amount: number | null;
  quantity_unit: string | null;
  display_name: string | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  price_huf: number | null;
  servings: number;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function mealItemRowToDto(row: MealItemRow): MealItem {
  return {
    id: row.id,
    mealId: row.meal_id,
    type: row.type as MealItem.TypeEnum,
    recipeId: row.recipe_id,
    foodId: row.food_id,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    displayName: row.display_name,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    priceHuf: row.price_huf,
    servings: row.servings,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mealItemLocalWriteTask(dto: {
  id: string;
  mealId: string;
  type: string;
  recipeId: string | null;
  foodId: string | null;
  quantityAmount: number | null;
  quantityUnit: string | null;
  displayName: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  priceHuf: number | null;
  servings: number;
  sortOrder: number;
}): SqlTask {
  return {
    statement: `
      INSERT INTO meal_item (
        id, meal_id, type, recipe_id, food_id, quantity_amount, quantity_unit, display_name,
        calories_kcal, protein_g, carbs_g, fat_g, price_huf, servings, sort_order, _dirty, _local_only
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type, recipe_id = excluded.recipe_id, food_id = excluded.food_id,
        quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit, display_name = excluded.display_name,
        calories_kcal = excluded.calories_kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g,
        price_huf = excluded.price_huf, servings = excluded.servings, sort_order = excluded.sort_order,
        deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.mealId,
      dto.type,
      dto.recipeId,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.displayName,
      dto.caloriesKcal,
      dto.proteinG,
      dto.carbsG,
      dto.fatG,
      dto.priceHuf,
      dto.servings,
      dto.sortOrder,
    ],
  };
}

/** Local-only removal — an item dropped from a meal during an edit, or cascaded from its Food/Recipe reference being deleted (not a standalone outbox entry — see SqliteStorageBackend.saveMeal/deleteFood/deleteRecipe). */
export function mealItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE meal_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function mealItemServerApplyTask(dto: MealItem): SqlTask {
  return {
    statement: `
      INSERT INTO meal_item (
        id, meal_id, type, recipe_id, food_id, quantity_amount, quantity_unit, display_name,
        calories_kcal, protein_g, carbs_g, fat_g, price_huf, servings, sort_order,
        created_at, updated_at, deleted, deleted_at, _dirty, _local_only
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        meal_id = excluded.meal_id, type = excluded.type, recipe_id = excluded.recipe_id, food_id = excluded.food_id,
        quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit, display_name = excluded.display_name,
        calories_kcal = excluded.calories_kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g,
        price_huf = excluded.price_huf, servings = excluded.servings, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE meal_item._dirty = 0`,
    values: [
      dto.id,
      dto.mealId,
      dto.type,
      dto.recipeId ?? null,
      dto.foodId ?? null,
      dto.quantityAmount ?? null,
      dto.quantityUnit ?? null,
      dto.displayName ?? null,
      dto.caloriesKcal ?? null,
      dto.proteinG ?? null,
      dto.carbsG ?? null,
      dto.fatG ?? null,
      dto.priceHuf ?? null,
      dto.servings,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function mealItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO meal_item (id, meal_id, type, servings, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'CUSTOM', 0, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface ShoppingListRow {
  id: string;
  name: string | null;
  status: string;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `items` — a ShoppingList row alone never carries them, see readShoppingList in SqliteStorageBackend. */
export function shoppingListRowToDto(row: ShoppingListRow): Omit<ShoppingList, 'items'> {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ShoppingList.StatusEnum,
    completedAt: row.completed_at,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** `status`/`completed_at` are never written from this write path (see ShoppingList.yaml "read-only") — left untouched on conflict, defaulted to ACTIVE/NULL on insert. */
export function shoppingListLocalWriteTask(dto: { id: string; name: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO shopping_list (id, name, _dirty, _local_only)
      VALUES (?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, _dirty = 1`,
    values: [dto.id, dto.name],
  };
}

export function shoppingListServerApplyTask(dto: Omit<ShoppingList, 'items'>): SqlTask {
  return {
    statement: `
      INSERT INTO shopping_list (id, name, status, completed_at, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, status = excluded.status, completed_at = excluded.completed_at, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE shopping_list._dirty = 0`,
    values: [
      dto.id,
      dto.name ?? null,
      dto.status ?? 'ACTIVE',
      dto.completedAt ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function shoppingListTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO shopping_list (id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

/** documentation/Subfeatures/Bevásárlás teljesítve.md — the only local write that changes `status`/`completed_at`; every other shopping-list write (`shoppingListLocalWriteTask`) only ever touches `name`. */
export function shoppingListArchiveLocalTask(id: string, completedAtIso: string): SqlTask {
  return {
    statement: `UPDATE shopping_list SET status = 'ARCHIVED', completed_at = ?, _dirty = 1 WHERE id = ?`,
    values: [completedAtIso, id],
  };
}

export interface ShoppingListItemRow {
  id: string;
  shopping_list_id: string;
  type: string;
  food_id: string | null;
  name: string | null;
  note: string | null;
  quantity_amount: number | null;
  quantity_unit: string | null;
  checked: number;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function shoppingListItemRowToDto(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    shoppingListId: row.shopping_list_id,
    type: row.type as ShoppingListItem.TypeEnum,
    foodId: row.food_id,
    name: row.name,
    note: row.note,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    checked: row.checked === 1,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function shoppingListItemLocalWriteTask(dto: {
  id: string;
  shoppingListId: string;
  type: string;
  foodId: string | null;
  name: string | null;
  note: string | null;
  quantityAmount: number | null;
  quantityUnit: string | null;
  checked: boolean;
  sortOrder: number;
}): SqlTask {
  return {
    statement: `
      INSERT INTO shopping_list_item (
        id, shopping_list_id, type, food_id, name, note, quantity_amount, quantity_unit, checked, sort_order, _dirty, _local_only
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type, food_id = excluded.food_id, name = excluded.name, note = excluded.note,
        quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit, checked = excluded.checked,
        sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.shoppingListId,
      dto.type,
      dto.foodId,
      dto.name,
      dto.note,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.checked ? 1 : 0,
      dto.sortOrder,
    ],
  };
}

/** Local-only removal — an item dropped from a list during an edit, or cascaded from its Food reference being deleted (not a standalone outbox entry — see SqliteStorageBackend.saveShoppingList/deleteFood). */
export function shoppingListItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE shopping_list_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function shoppingListItemServerApplyTask(dto: ShoppingListItem): SqlTask {
  return {
    statement: `
      INSERT INTO shopping_list_item (
        id, shopping_list_id, type, food_id, name, note, quantity_amount, quantity_unit, checked, sort_order,
        created_at, updated_at, deleted, deleted_at, _dirty, _local_only
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        shopping_list_id = excluded.shopping_list_id, type = excluded.type, food_id = excluded.food_id, name = excluded.name,
        note = excluded.note, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        checked = excluded.checked, sort_order = excluded.sort_order, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE shopping_list_item._dirty = 0`,
    values: [
      dto.id,
      dto.shoppingListId,
      dto.type,
      dto.foodId ?? null,
      dto.name ?? null,
      dto.note ?? null,
      dto.quantityAmount ?? null,
      dto.quantityUnit ?? null,
      dto.checked ? 1 : 0,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function shoppingListItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO shopping_list_item (id, shopping_list_id, type, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'NON_FOOD', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface RecurringExpenseRow {
  id: string;
  name: string;
  amount_huf: number;
  frequency: string;
  category: string;
  next_billing_date: string;
  billing_day_of_month: number;
  active: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function recurringExpenseRowToDto(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    name: row.name,
    amountHuf: row.amount_huf,
    frequency: row.frequency as RecurringExpense.FrequencyEnum,
    category: row.category as RecurringExpense.CategoryEnum,
    nextBillingDate: row.next_billing_date,
    billingDayOfMonth: row.billing_day_of_month,
    active: row.active === 1,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function recurringExpenseLocalWriteTask(dto: RecurringExpense): SqlTask {
  return {
    statement: `
      INSERT INTO recurring_expense (id, name, amount_huf, frequency, category, next_billing_date, billing_day_of_month, active, notes, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, amount_huf = excluded.amount_huf, frequency = excluded.frequency, category = excluded.category,
        next_billing_date = excluded.next_billing_date, billing_day_of_month = excluded.billing_day_of_month,
        active = excluded.active, notes = excluded.notes, _dirty = 1`,
    values: [
      dto.id,
      dto.name,
      dto.amountHuf,
      dto.frequency,
      dto.category,
      dto.nextBillingDate,
      dto.billingDayOfMonth,
      dto.active ? 1 : 0,
      dto.notes ?? null,
    ],
  };
}

export function recurringExpenseServerApplyTask(dto: RecurringExpense): SqlTask {
  return {
    statement: `
      INSERT INTO recurring_expense (id, name, amount_huf, frequency, category, next_billing_date, billing_day_of_month, active, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, amount_huf = excluded.amount_huf, frequency = excluded.frequency, category = excluded.category,
        next_billing_date = excluded.next_billing_date, billing_day_of_month = excluded.billing_day_of_month,
        active = excluded.active, notes = excluded.notes,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE recurring_expense._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.amountHuf,
      dto.frequency,
      dto.category,
      dto.nextBillingDate,
      dto.billingDayOfMonth,
      dto.active ? 1 : 0,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function recurringExpenseTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO recurring_expense (id, name, amount_huf, frequency, category, next_billing_date, billing_day_of_month, active, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 1, 'MONTHLY', 'OTHER', '1970-01-01', 1, 1, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// --- AYCM elfogadóhely hozzáadása (AycmPartner + AycmPriceRule) ---
// documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — flat, user-owned mirrors of the two
// tables. name_normalized is not stored (the repository normalizes in memory for its uniqueness
// pre-check, same as gear_item).

export interface AycmPartnerRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function aycmPartnerRowToDto(row: AycmPartnerRow): AycmPartner {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function aycmPartnerLocalWriteTask(dto: AycmPartner): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_partner (id, name, notes, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes, _dirty = 1`,
    values: [dto.id, dto.name, dto.notes ?? null],
  };
}

export function aycmPartnerServerApplyTask(dto: AycmPartner): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_partner (id, name, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE aycm_partner._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function aycmPartnerTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_partner (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface AycmPriceRuleRow {
  id: string;
  partner_id: string;
  label: string | null;
  applies_mon: number;
  applies_tue: number;
  applies_wed: number;
  applies_thu: number;
  applies_fri: number;
  applies_sat: number;
  applies_sun: number;
  start_time: string;
  end_time: string;
  list_price_huf: number;
  co_payment_huf: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function aycmPriceRuleRowToDto(row: AycmPriceRuleRow): AycmPriceRule {
  return {
    id: row.id,
    partnerId: row.partner_id,
    label: row.label,
    appliesMon: row.applies_mon === 1,
    appliesTue: row.applies_tue === 1,
    appliesWed: row.applies_wed === 1,
    appliesThu: row.applies_thu === 1,
    appliesFri: row.applies_fri === 1,
    appliesSat: row.applies_sat === 1,
    appliesSun: row.applies_sun === 1,
    startTime: row.start_time,
    endTime: row.end_time,
    listPriceHuf: row.list_price_huf,
    coPaymentHuf: row.co_payment_huf,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

const AYCM_PRICE_RULE_COLUMNS =
  'id, partner_id, label, applies_mon, applies_tue, applies_wed, applies_thu, applies_fri, applies_sat, applies_sun, start_time, end_time, list_price_huf, co_payment_huf';

function aycmPriceRuleValues(dto: AycmPriceRule): (string | number | null)[] {
  return [
    dto.id,
    dto.partnerId,
    dto.label ?? null,
    dto.appliesMon ? 1 : 0,
    dto.appliesTue ? 1 : 0,
    dto.appliesWed ? 1 : 0,
    dto.appliesThu ? 1 : 0,
    dto.appliesFri ? 1 : 0,
    dto.appliesSat ? 1 : 0,
    dto.appliesSun ? 1 : 0,
    dto.startTime,
    dto.endTime,
    dto.listPriceHuf,
    dto.coPaymentHuf,
  ];
}

const AYCM_PRICE_RULE_UPSERT_SET = `
  partner_id = excluded.partner_id, label = excluded.label,
  applies_mon = excluded.applies_mon, applies_tue = excluded.applies_tue, applies_wed = excluded.applies_wed,
  applies_thu = excluded.applies_thu, applies_fri = excluded.applies_fri, applies_sat = excluded.applies_sat,
  applies_sun = excluded.applies_sun, start_time = excluded.start_time, end_time = excluded.end_time,
  list_price_huf = excluded.list_price_huf, co_payment_huf = excluded.co_payment_huf`;

export function aycmPriceRuleLocalWriteTask(dto: AycmPriceRule): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_price_rule (${AYCM_PRICE_RULE_COLUMNS}, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET ${AYCM_PRICE_RULE_UPSERT_SET}, _dirty = 1`,
    values: aycmPriceRuleValues(dto),
  };
}

export function aycmPriceRuleServerApplyTask(dto: AycmPriceRule): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_price_rule (${AYCM_PRICE_RULE_COLUMNS}, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        ${AYCM_PRICE_RULE_UPSERT_SET},
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE aycm_price_rule._dirty = 0`,
    values: [
      ...aycmPriceRuleValues(dto),
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function aycmPriceRuleTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_price_rule (id, partner_id, start_time, end_time, list_price_huf, co_payment_huf, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '00:00', '00:00', 0, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// --- AYCM Check-In (AycmCheckIn) ---
// documentation/Subfeatures/AYCM Check-In.md — flat, user-owned mirror of the snapshot row.

export interface AycmCheckInRow {
  id: string;
  check_in_date: string;
  check_in_time: string;
  partner_id: string;
  partner_name: string;
  rule_id: string | null;
  rule_label: string;
  list_price_huf: number;
  co_payment_huf: number;
  visit_value_huf: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function aycmCheckInRowToDto(row: AycmCheckInRow): AycmCheckIn {
  return {
    id: row.id,
    checkInDate: row.check_in_date,
    checkInTime: row.check_in_time,
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    ruleId: row.rule_id,
    ruleLabel: row.rule_label,
    listPriceHuf: row.list_price_huf,
    coPaymentHuf: row.co_payment_huf,
    visitValueHuf: row.visit_value_huf,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

const AYCM_CHECK_IN_COLUMNS =
  'id, check_in_date, check_in_time, partner_id, partner_name, rule_id, rule_label, list_price_huf, co_payment_huf, visit_value_huf, notes';

function aycmCheckInValues(dto: AycmCheckIn): (string | number | null)[] {
  return [
    dto.id,
    dto.checkInDate,
    dto.checkInTime,
    dto.partnerId,
    dto.partnerName,
    dto.ruleId ?? null,
    dto.ruleLabel,
    dto.listPriceHuf,
    dto.coPaymentHuf,
    dto.visitValueHuf,
    dto.notes ?? null,
  ];
}

const AYCM_CHECK_IN_UPSERT_SET = `
  check_in_date = excluded.check_in_date, check_in_time = excluded.check_in_time,
  partner_id = excluded.partner_id, partner_name = excluded.partner_name,
  rule_id = excluded.rule_id, rule_label = excluded.rule_label,
  list_price_huf = excluded.list_price_huf, co_payment_huf = excluded.co_payment_huf,
  visit_value_huf = excluded.visit_value_huf, notes = excluded.notes`;

export function aycmCheckInLocalWriteTask(dto: AycmCheckIn): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_check_in (${AYCM_CHECK_IN_COLUMNS}, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET ${AYCM_CHECK_IN_UPSERT_SET}, _dirty = 1`,
    values: aycmCheckInValues(dto),
  };
}

export function aycmCheckInServerApplyTask(dto: AycmCheckIn): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_check_in (${AYCM_CHECK_IN_COLUMNS}, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        ${AYCM_CHECK_IN_UPSERT_SET},
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE aycm_check_in._dirty = 0`,
    values: [
      ...aycmCheckInValues(dto),
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function aycmCheckInTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_check_in (id, check_in_date, check_in_time, partner_id, partner_name, rule_label, list_price_huf, co_payment_huf, visit_value_huf, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', '00:00', '', '', '', 0, 0, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

// --- AYCM settings (AycmSettings) ---
// documentation/Features/AYCM tracker.md — the 1:1-per-user singleton, a mirror of UserProfile's
// wiring: deterministic v5 id, PUT-only, `_needs_refetch` re-pull. Only field is the optional link.

export interface AycmSettingsRow {
  id: string;
  linked_recurring_expense_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function aycmSettingsRowToDto(row: AycmSettingsRow): AycmSettings {
  return {
    id: row.id,
    linkedRecurringExpenseId: row.linked_recurring_expense_id,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Local-first edit: marks `_dirty = 1`; `_local_only` is set on first insert only. */
export function aycmSettingsLocalWriteTask(dto: AycmSettings): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_settings (id, linked_recurring_expense_id, _dirty, _local_only)
      VALUES (?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET linked_recurring_expense_id = excluded.linked_recurring_expense_id, _dirty = 1`,
    values: [dto.id, dto.linkedRecurringExpenseId ?? null],
  };
}

/** Authoritative server row (drain success, or pull when not `_dirty`): full overwrite, clears dirty/local-only. */
export function aycmSettingsServerApplyTask(dto: AycmSettings): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_settings (id, linked_recurring_expense_id, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 0, NULL, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        linked_recurring_expense_id = excluded.linked_recurring_expense_id, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = 0, deleted_at = NULL, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE aycm_settings._dirty = 0`,
    values: [dto.id, dto.linkedRecurringExpenseId ?? null, dto.createdAt ?? null, dto.updatedAt ?? null],
  };
}

/** §8: no local row + tombstone from server → still recorded, so the row can never "come back". */
export function aycmSettingsTombstoneTask(id: string, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO aycm_settings (id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, updatedAt],
  };
}

// --- Daily step log (DailyStepLog) ---
// documentation/Features/Lépésszám követés.md — one step-count row per user per calendar day, flat
// user-owned CRUD like SwimLog. The id is a deterministic v5 of (userId, date); the max-wins
// overwrite policy lives in DailyStepLogRepository, not here. Because that id is reused after a
// delete (unlike a v4-id entity), the local write clears deleted/deleted_at like weeklyPlan does —
// re-adding steps to a previously deleted calendar day must revive the row, not leave it tombstoned.

export interface DailyStepLogRow {
  id: string;
  log_date: string;
  step_count: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function dailyStepLogRowToDto(row: DailyStepLogRow): DailyStepLog {
  return {
    id: row.id,
    date: row.log_date,
    stepCount: row.step_count,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function dailyStepLogLocalWriteTask(dto: DailyStepLog): SqlTask {
  return {
    statement: `
      INSERT INTO daily_step_log (id, log_date, step_count, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        log_date = excluded.log_date, step_count = excluded.step_count, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.date, dto.stepCount],
  };
}

export function dailyStepLogServerApplyTask(dto: DailyStepLog): SqlTask {
  return {
    statement: `
      INSERT INTO daily_step_log (id, log_date, step_count, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        log_date = excluded.log_date, step_count = excluded.step_count,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE daily_step_log._dirty = 0`,
    values: [
      dto.id,
      dto.date,
      dto.stepCount,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function dailyStepLogTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO daily_step_log (id, log_date, step_count, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}
