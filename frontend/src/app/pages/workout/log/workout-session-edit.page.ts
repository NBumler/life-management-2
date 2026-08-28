import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { uuidV4 } from '../../../core/sync/uuid';
import { WorkoutExerciseSaveItem, WorkoutSessionDraft } from '../../../core/storage/storage-backend';
import { today } from '../../../shared/local-date';
import { ExercisePickResult, ExercisePickerComponent } from '../../../shared/exercise-picker/exercise-picker.component';
import { LOCATIONS, SET_TYPES, WORKOUT_TYPES, visibleFields } from './workout-fields';
import { effectiveDurationMinutes, ghostForExercise, sessionKcal, sessionVolume } from './workout-metrics';

interface SetRow {
  id: string;
  setType: WritableSignal<WorkoutSetEntry.SetTypeEnum>;
  reps: WritableSignal<number | null>;
  weightKg: WritableSignal<number | null>;
  holdTimeSeconds: WritableSignal<number | null>;
  edgeSizeMm: WritableSignal<number | null>;
  distanceMeters: WritableSignal<number | null>;
  restTimeSeconds: WritableSignal<number | null>;
  isCompleted: WritableSignal<boolean>;
}

interface ExerciseRow {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum;
  exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum;
  supersetGroup: WritableSignal<number | null>;
  sets: WritableSignal<SetRow[]>;
}

/**
 * documentation/Subfeatures/Edzésnapló.md — the post-hoc create/edit form (route param `id` is an
 * existing session's uuid or the literal `new`; `?copyFrom=<id>` clones another session's structure +
 * weights for "Ugyanaz mint legutóbb"). The live Active Workout View (stopwatch, rest timer) is a
 * separate screen that lands with the next slice; this one is the always-available fallback.
 */
@Component({
  selector: 'app-workout-session-edit',
  templateUrl: 'workout-session-edit.page.html',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    ExercisePickerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonFooter,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonLabel,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonModal,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(WorkoutSessionRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly setTypes = SET_TYPES;
  readonly workoutTypes = WORKOUT_TYPES;
  readonly locations = LOCATIONS;
  readonly visibleFields = visibleFields;

  readonly sessionId = signal<string | null>(null);
  private readonly loadedSession = signal<WorkoutSession | null>(null);
  readonly exercises = signal<ExerciseRow[]>([]);
  readonly pickerOpen = signal(false);

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    workoutType: this.fb.nonNullable.control<WorkoutSession.WorkoutTypeEnum>(WorkoutSession.WorkoutTypeEnum.GeneralWeights),
    title: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
    location: this.fb.control<WorkoutSession.LocationEnum | null>(null),
    startTime: this.fb.control<string | null>(null),
    endTime: this.fb.control<string | null>(null),
    durationMinutes: this.fb.control<number | null>(null, [Validators.min(1)]),
    roundsCount: this.fb.control<number | null>(null, [Validators.min(1)]),
  });

  private readonly workoutTypeValue = toSignal(this.form.controls.workoutType.valueChanges, {
    initialValue: this.form.controls.workoutType.value,
  });
  private readonly durationValue = toSignal(this.form.controls.durationMinutes.valueChanges, {
    initialValue: this.form.controls.durationMinutes.value,
  });
  private readonly startTimeValue = toSignal(this.form.controls.startTime.valueChanges, {
    initialValue: this.form.controls.startTime.value,
  });
  private readonly endTimeValue = toSignal(this.form.controls.endTime.valueChanges, {
    initialValue: this.form.controls.endTime.value,
  });

  readonly isHiit = computed(() => this.workoutTypeValue() === WorkoutSession.WorkoutTypeEnum.HiitCircuit);

  /** A minimal DTO-shaped snapshot of the current editing state, for the live kcal / volume / duration preview. */
  private readonly previewSession = computed<WorkoutSession>(() =>
    this.buildPreviewShape(this.workoutTypeValue(), this.durationValue(), this.startTimeValue(), this.endTimeValue(), this.exercises()),
  );

  readonly previewDurationMinutes = computed(() => effectiveDurationMinutes(this.previewSession()));
  readonly previewVolume = computed(() => sessionVolume(this.previewSession()));
  readonly previewKcal = computed(() => sessionKcal(this.previewSession(), this.profileRepository.profile()?.currentWeightKg ?? null));
  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load()]);

    const idParam = this.route.snapshot.paramMap.get('id');
    const copyFrom = this.route.snapshot.queryParamMap.get('copyFrom');

    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/log');
        return;
      }
      this.sessionId.set(idParam);
      this.loadedSession.set(existing);
      this.form.reset({
        date: existing.date,
        workoutType: existing.workoutType,
        title: existing.title ?? null,
        notes: existing.notes ?? null,
        location: existing.location ?? null,
        startTime: existing.startTime ?? null,
        endTime: existing.endTime ?? null,
        durationMinutes: existing.durationMinutes ?? null,
        roundsCount: existing.roundsCount ?? null,
      });
      this.exercises.set(this.rowsFromSession(existing, false));
      return;
    }

    if (copyFrom !== null) {
      const source = this.repository.byId(copyFrom);
      if (source !== undefined) {
        this.form.patchValue({ workoutType: source.workoutType });
        this.exercises.set(this.rowsFromSession(source, true));
      }
    }
  }

  ghostFor(row: ExerciseRow): string | null {
    const ghost = ghostForExercise(this.repository.items(), row.exerciseId, row.exerciseName, this.sessionId() ?? undefined);
    if (ghost === null || ghost.topSet === null) {
      return null;
    }
    const set = ghost.topSet;
    if (set.weightKg !== null && set.reps !== null) {
      return `${ghost.sessionDate}: ${set.weightKg} kg × ${set.reps}`;
    }
    if (set.reps !== null) {
      return `${ghost.sessionDate}: × ${set.reps}`;
    }
    if (set.holdTimeSeconds !== null) {
      return `${ghost.sessionDate}: ${set.holdTimeSeconds} s`;
    }
    return ghost.sessionDate;
  }

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onPicked(results: ExercisePickResult[]): void {
    this.pickerOpen.set(false);
    const newRows = results.map((result) => this.emptyExerciseRow(result));
    this.exercises.update((rows) => [...rows, ...newRows]);
  }

  removeExercise(row: ExerciseRow): void {
    this.exercises.update((rows) => rows.filter((entry) => entry.id !== row.id));
  }

  addSet(row: ExerciseRow): void {
    row.sets.update((sets) => [...sets, this.emptySetRow(sets[sets.length - 1])]);
  }

  copyLastSet(row: ExerciseRow): void {
    const sets = row.sets();
    const last = sets[sets.length - 1];
    if (last !== undefined) {
      row.sets.update((current) => [...current, this.cloneSetRow(last)]);
    }
  }

  removeSet(row: ExerciseRow, set: SetRow): void {
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
    this.sessionId.set(saved.id);
    await this.router.navigateByUrl('/tabs/workout/log');
  }

  async delete(): Promise<void> {
    const id = this.sessionId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.SESSION.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.SESSION.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/workout/log');
  }

  private buildDraft(): WorkoutSessionDraft {
    const value = this.form.getRawValue();
    return {
      id: this.sessionId() ?? '',
      date: value.date,
      startTime: value.startTime?.trim() ? value.startTime : null,
      endTime: value.endTime?.trim() ? value.endTime : null,
      durationMinutes: value.durationMinutes,
      workoutType: value.workoutType,
      title: value.title?.trim() ? value.title.trim() : null,
      notes: value.notes?.trim() ? value.notes.trim() : null,
      location: value.location,
      planId: this.loadedSession()?.planId ?? null,
      roundsCount: this.isHiit() ? value.roundsCount : null,
      exercises: this.exercises().map((row, exerciseIndex) => this.exerciseToSaveItem(row, exerciseIndex)),
    };
  }

  private exerciseToSaveItem(row: ExerciseRow, orderIndex: number): WorkoutExerciseSaveItem {
    return {
      id: row.id,
      exerciseId: row.exerciseId,
      exerciseName: row.exerciseName,
      exerciseCategory: row.exerciseCategory,
      exerciseKind: row.exerciseKind,
      orderIndex,
      supersetGroup: row.supersetGroup(),
      sets: row.sets().map((set, setIndex) => ({
        id: set.id,
        setNumber: setIndex + 1,
        setType: set.setType(),
        reps: set.reps(),
        weightKg: set.weightKg(),
        holdTimeSeconds: set.holdTimeSeconds(),
        edgeSizeMm: set.edgeSizeMm(),
        distanceMeters: set.distanceMeters(),
        restTimeSeconds: set.restTimeSeconds(),
        isCompleted: set.isCompleted(),
        orderIndex: setIndex,
      })),
    };
  }

  /** Just enough of a `WorkoutSession` DTO for `workout-metrics.ts` (duration + MET + live set/volume counts). */
  private buildPreviewShape(
    workoutType: WorkoutSession.WorkoutTypeEnum,
    durationMinutes: number | null,
    startTime: string | null,
    endTime: string | null,
    exercises: ExerciseRow[],
  ): WorkoutSession {
    return {
      id: 'draft',
      date: today(),
      startTime,
      endTime,
      durationMinutes,
      workoutType,
      deleted: false,
      exercises: exercises.map((row, exerciseIndex) => {
        const item = this.exerciseToSaveItem(row, exerciseIndex);
        return {
          ...item,
          sessionId: 'draft',
          deleted: false,
          sets: item.sets.map((set) => ({ ...set, exerciseEntryId: row.id, deleted: false })),
        };
      }),
    };
  }

  private rowsFromSession(session: WorkoutSession, freshIds: boolean): ExerciseRow[] {
    return session.exercises
      .filter((exercise) => !exercise.deleted)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((exercise) => ({
        id: freshIds ? uuidV4() : exercise.id,
        exerciseId: exercise.exerciseId ?? null,
        exerciseName: exercise.exerciseName,
        exerciseCategory: exercise.exerciseCategory,
        exerciseKind: exercise.exerciseKind,
        supersetGroup: signal(exercise.supersetGroup ?? null),
        sets: signal(
          exercise.sets
            .filter((set) => !set.deleted)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((set) => ({
              id: freshIds ? uuidV4() : set.id,
              setType: signal(set.setType),
              reps: signal(set.reps ?? null),
              weightKg: signal(set.weightKg ?? null),
              holdTimeSeconds: signal(set.holdTimeSeconds ?? null),
              edgeSizeMm: signal(set.edgeSizeMm ?? null),
              distanceMeters: signal(set.distanceMeters ?? null),
              restTimeSeconds: signal(set.restTimeSeconds ?? null),
              isCompleted: signal(freshIds ? false : set.isCompleted),
            })),
        ),
      }));
  }

  private emptyExerciseRow(result: ExercisePickResult): ExerciseRow {
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

  private emptySetRow(previous: SetRow | undefined): SetRow {
    return {
      id: uuidV4(),
      setType: signal(previous?.setType() ?? WorkoutSetEntry.SetTypeEnum.Working),
      reps: signal(previous?.reps() ?? null),
      weightKg: signal(previous?.weightKg() ?? null),
      holdTimeSeconds: signal(previous?.holdTimeSeconds() ?? null),
      edgeSizeMm: signal(previous?.edgeSizeMm() ?? null),
      distanceMeters: signal(null),
      restTimeSeconds: signal(previous?.restTimeSeconds() ?? null),
      isCompleted: signal(false),
    };
  }

  private cloneSetRow(source: SetRow): SetRow {
    return {
      id: uuidV4(),
      setType: signal(source.setType()),
      reps: signal(source.reps()),
      weightKg: signal(source.weightKg()),
      holdTimeSeconds: signal(source.holdTimeSeconds()),
      edgeSizeMm: signal(source.edgeSizeMm()),
      distanceMeters: signal(source.distanceMeters()),
      restTimeSeconds: signal(source.restTimeSeconds()),
      isCompleted: signal(false),
    };
  }
}
