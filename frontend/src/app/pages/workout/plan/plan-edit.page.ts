import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutPlanExercise } from '../../../api/model/workoutPlanExercise';
import { WorkoutPlanSet } from '../../../api/model/workoutPlanSet';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutPlanDraft, WorkoutPlanExerciseSaveItem } from '../../../core/storage/storage-backend';
import { uuidV4 } from '../../../core/sync/uuid';
import { ExercisePickResult, ExercisePickerComponent } from '../../../shared/exercise-picker/exercise-picker.component';
import { PLAN_TO_ENTRY_KIND, SET_TYPES, VisibleSetFields, moveById, visibleFields } from '../log/workout-fields';

interface TargetSetRow {
  id: string;
  setType: WritableSignal<WorkoutPlanSet.SetTypeEnum>;
  reps: WritableSignal<number | null>;
  weightKg: WritableSignal<number | null>;
  holdTimeSeconds: WritableSignal<number | null>;
  edgeSizeMm: WritableSignal<number | null>;
  distanceMeters: WritableSignal<number | null>;
  restTimeSeconds: WritableSignal<number | null>;
}

interface PlanExerciseRow {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: WorkoutPlanExercise.ExerciseCategoryEnum;
  exerciseKind: WorkoutPlanExercise.ExerciseKindEnum;
  supersetGroup: WritableSignal<number | null>;
  sets: WritableSignal<TargetSetRow[]>;
}

const WORKOUT_TYPE_VALUES = Object.values(WorkoutPlan.DefaultWorkoutTypeEnum);

/**
 * documentation/Subfeatures/Heti terv.md "Sablonok lista + nested gyakorlat/cél-szett szerkesztő" —
 * route param `id` is an existing plan's uuid or the literal `new`. Reuses the Gyakorlat picker and
 * the `visibleFields` table from the workout log so the two editors never drift on which set fields
 * an `exerciseKind` exposes. A target set has no completed state — just `orderIndex` + targets.
 */
@Component({
  selector: 'app-plan-edit',
  templateUrl: 'plan-edit.page.html',
  imports: [
    ReactiveFormsModule,
    ExercisePickerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonModal,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(WorkoutPlanRepository);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  readonly setTypes = SET_TYPES;
  readonly workoutTypes = WORKOUT_TYPE_VALUES;

  /** Same `exerciseKind` → visible-field table as the workout log, via the typed plan→entry enum map. */
  fieldsFor(row: PlanExerciseRow): VisibleSetFields {
    return visibleFields(PLAN_TO_ENTRY_KIND[row.exerciseKind]);
  }

  readonly planId = signal<string | null>(null);
  private active = true;
  readonly exercises = signal<PlanExerciseRow[]>([]);
  readonly pickerOpen = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(1)]),
    goalLabel: this.fb.control<string | null>(null),
    defaultWorkoutType: this.fb.control<WorkoutPlan.DefaultWorkoutTypeEnum | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  readonly isEditing = computed(() => this.planId() !== null);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/weekly-plan/plans');
        return;
      }
      this.planId.set(idParam);
      this.active = existing.active;
      this.form.reset({
        name: existing.name,
        goalLabel: existing.goalLabel ?? null,
        defaultWorkoutType: existing.defaultWorkoutType ?? null,
        notes: existing.notes ?? null,
      });
      this.exercises.set(this.rowsFromPlan(existing));
    }
  }

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onPicked(results: ExercisePickResult[]): void {
    this.pickerOpen.set(false);
    // documentation/Subfeatures/Heti terv.md §47: a template exercise must reference a catalog row
    // ("kötelező a sablonban") — ad-hoc picks are dropped, but tell the user rather than silently.
    const withCatalogId = results.filter((result): result is ExercisePickResult & { exerciseId: string } => result.exerciseId !== null);
    if (withCatalogId.length !== results.length) {
      void this.toastController
        .create({ message: this.translate.instant('WORKOUT.PLAN.ADHOC_NOT_ALLOWED'), duration: 3000, color: 'warning' })
        .then((toast) => toast.present());
    }
    const rows = withCatalogId.map((result) => this.emptyExerciseRow(result));
    this.exercises.update((current) => [...current, ...rows]);
  }

  removeExercise(row: PlanExerciseRow): void {
    this.exercises.update((rows) => rows.filter((entry) => entry.id !== row.id));
  }

  /** documentation/Subfeatures/Edzésnapló.md `orderIndex` "drag & drop sorrend": manual up/down reorder; `orderIndex` is derived from array position on save. */
  moveExercise(row: PlanExerciseRow, delta: -1 | 1): void {
    this.exercises.update((rows) => moveById(rows, row.id, delta));
  }

  addSet(row: PlanExerciseRow): void {
    row.sets.update((sets) => [...sets, this.emptySetRow(sets[sets.length - 1])]);
  }

  removeSet(row: PlanExerciseRow, set: TargetSetRow): void {
    row.sets.update((sets) => sets.filter((entry) => entry.id !== set.id));
  }

  bump(field: WritableSignal<number | null>, delta: number): void {
    field.update((value) => Math.round(((value ?? 0) + delta) * 100) / 100);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const saved = await this.repository.save(this.buildDraft());
    this.planId.set(saved.id);
    await this.router.navigateByUrl('/tabs/workout/weekly-plan/plans');
  }

  async delete(): Promise<void> {
    const id = this.planId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.PLAN.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.PLAN.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.deleteAndNavigateBack(id),
        },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/workout/weekly-plan/plans');
  }

  private buildDraft(): WorkoutPlanDraft {
    const value = this.form.getRawValue();
    return {
      id: this.planId() ?? '',
      name: value.name.trim(),
      notes: value.notes?.trim() ? value.notes.trim() : null,
      active: this.active,
      goalLabel: value.goalLabel?.trim() ? value.goalLabel.trim() : null,
      defaultWorkoutType: value.defaultWorkoutType,
      exercises: this.exercises().map((row, exerciseIndex) => this.exerciseToSaveItem(row, exerciseIndex)),
    };
  }

  private exerciseToSaveItem(row: PlanExerciseRow, orderIndex: number): WorkoutPlanExerciseSaveItem {
    return {
      id: row.id,
      exerciseId: row.exerciseId,
      exerciseName: row.exerciseName,
      exerciseCategory: row.exerciseCategory,
      exerciseKind: row.exerciseKind,
      orderIndex,
      supersetGroup: row.supersetGroup(),
      targetSets: row.sets().map((set, setIndex) => ({
        id: set.id,
        setType: set.setType(),
        reps: set.reps(),
        weightKg: set.weightKg(),
        holdTimeSeconds: set.holdTimeSeconds(),
        edgeSizeMm: set.edgeSizeMm(),
        distanceMeters: set.distanceMeters(),
        restTimeSeconds: set.restTimeSeconds(),
        orderIndex: setIndex,
      })),
    };
  }

  private rowsFromPlan(plan: WorkoutPlan): PlanExerciseRow[] {
    return plan.exercises
      .filter((exercise) => !exercise.deleted)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        exerciseCategory: exercise.exerciseCategory,
        exerciseKind: exercise.exerciseKind,
        supersetGroup: signal(exercise.supersetGroup ?? null),
        sets: signal(
          exercise.targetSets
            .filter((set) => !set.deleted)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((set) => ({
              id: set.id,
              setType: signal(set.setType),
              reps: signal(set.reps ?? null),
              weightKg: signal(set.weightKg ?? null),
              holdTimeSeconds: signal(set.holdTimeSeconds ?? null),
              edgeSizeMm: signal(set.edgeSizeMm ?? null),
              distanceMeters: signal(set.distanceMeters ?? null),
              restTimeSeconds: signal(set.restTimeSeconds ?? null),
            })),
        ),
      }));
  }

  private emptyExerciseRow(result: ExercisePickResult & { exerciseId: string }): PlanExerciseRow {
    return {
      id: uuidV4(),
      exerciseId: result.exerciseId,
      exerciseName: result.exerciseName,
      exerciseCategory: result.exerciseCategory,
      exerciseKind: result.exerciseKind,
      supersetGroup: signal<number | null>(null),
      sets: signal([this.emptySetRow(undefined)]),
    };
  }

  private emptySetRow(previous: TargetSetRow | undefined): TargetSetRow {
    return {
      id: uuidV4(),
      setType: signal(previous?.setType() ?? WorkoutPlanSet.SetTypeEnum.Working),
      reps: signal(previous?.reps() ?? null),
      weightKg: signal(previous?.weightKg() ?? null),
      holdTimeSeconds: signal(previous?.holdTimeSeconds() ?? null),
      edgeSizeMm: signal(previous?.edgeSizeMm() ?? null),
      distanceMeters: signal(null),
      restTimeSeconds: signal(previous?.restTimeSeconds() ?? null),
    };
  }
}
