import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCheckbox,
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
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import {
  ActiveExerciseDraft,
  ActiveWorkoutDraft,
  WorkoutDraftService,
} from '../../../core/data/workout-draft.service';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { uuidV4 } from '../../../core/sync/uuid';
import { WorkoutExerciseSaveItem, WorkoutSessionDraft } from '../../../core/storage/storage-backend';
import { today } from '../../../shared/local-date';
import { ExercisePickResult, ExercisePickerComponent } from '../../../shared/exercise-picker/exercise-picker.component';
import { SET_TYPES, WORKOUT_TYPES, formatStopwatch, nextRestValue, visibleFields } from './workout-fields';
import { detectPrs, effectiveDurationMinutes, sessionKcal } from './workout-metrics';

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
  defaultRestTimeSeconds: number | null;
  supersetGroup: WritableSignal<number | null>;
  sets: WritableSignal<SetRow[]>;
}

/** Rest-timer fallback when neither the set nor the catalog row carries a `restTimeSeconds`. */
const DEFAULT_REST_SECONDS = 90;
const TICK_MS = 1000;

/**
 * documentation/Subfeatures/Edzésnapló.md "Élő vs utólagos mód / Élő" — the live Active Workout View:
 * a running stopwatch, a per-set rest timer that fires haptic + a short beep at expiry, PR badges,
 * and HIIT round helpers. The whole session is a device-local draft (`WorkoutDraftService`, not an
 * outbox row) that survives an app kill; only "Befejezés" builds a `WorkoutSessionDraft` and enqueues
 * it. `?copyFrom=<id>` seeds structure + weights for "Ugyanaz mint legutóbb".
 */
@Component({
  selector: 'app-active-workout',
  templateUrl: 'active-workout.page.html',
  imports: [
    DecimalPipe,
    ExercisePickerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonList,
    IonItem,
    IonInput,
    IonLabel,
    IonNote,
    IonBadge,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonModal,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveWorkoutPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly draftService = inject(WorkoutDraftService);
  private readonly repository = inject(WorkoutSessionRepository);
  private readonly exerciseRepository = inject(ExerciseRepository);
  private readonly planRepository = inject(WorkoutPlanRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly workoutTypes = WORKOUT_TYPES;
  readonly setTypes = SET_TYPES;
  readonly visibleFields = visibleFields;

  private sessionId = '';
  private startedAtMs = 0;
  private date = today();
  private planId: string | null = null;
  private tickHandle: ReturnType<typeof setInterval> | undefined;

  readonly workoutType = signal<WorkoutSession.WorkoutTypeEnum>(WorkoutSession.WorkoutTypeEnum.GeneralWeights);
  readonly title = signal<string | null>(null);
  readonly location = signal<WorkoutSession.LocationEnum | null>(null);
  readonly notes = signal<string | null>(null);
  readonly roundsCount = signal<number | null>(null);
  readonly currentRound = signal(1);
  readonly exercises = signal<ExerciseRow[]>([]);
  readonly pickerOpen = signal(false);

  readonly elapsedMs = signal(0);
  readonly elapsedLabel = computed(() => formatStopwatch(this.elapsedMs()));
  /** Remaining rest seconds, or null when no rest timer is running. */
  readonly restRemaining = signal<number | null>(null);

  readonly isHiit = computed(() => this.workoutType() === WorkoutSession.WorkoutTypeEnum.HiitCircuit);

  private readonly previewSession = computed<WorkoutSession>(() => this.buildPreviewShape());
  readonly previewKcal = computed(() =>
    sessionKcal(this.previewSession(), this.profileRepository.profile()?.currentWeightKg ?? null),
  );
  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.repository.load(),
      this.exerciseRepository.load(),
      this.planRepository.load(),
      this.profileRepository.load(),
      this.draftService.refresh(),
    ]);

    const existing = this.draftService.draft();
    if (existing !== null) {
      this.hydrateFrom(existing);
    } else {
      this.sessionId = uuidV4();
      this.startedAtMs = Date.now();
      this.date = today();
      const typeParam = this.route.snapshot.queryParamMap.get('type');
      if (typeParam !== null && (WORKOUT_TYPES as string[]).includes(typeParam)) {
        this.workoutType.set(typeParam as WorkoutSession.WorkoutTypeEnum);
      }
      const copyFrom = this.route.snapshot.queryParamMap.get('copyFrom');
      const source = copyFrom !== null ? this.repository.byId(copyFrom) : undefined;
      if (source !== undefined) {
        this.workoutType.set(source.workoutType);
        this.planId = source.planId ?? null;
        this.exercises.set(this.rowsFromSession(source));
      }
      // documentation/Subfeatures/Heti terv.md "Edzés indítása a tervből": preload structure + target
      // sets from a WorkoutPlan; the session's planId then points at that template for adherence.
      const planIdParam = this.route.snapshot.queryParamMap.get('planId');
      if (source === undefined && planIdParam !== null) {
        const plan = this.planRepository.byId(planIdParam);
        if (plan !== undefined && !plan.deleted) {
          this.planId = plan.id;
          if (plan.defaultWorkoutType != null && (WORKOUT_TYPES as string[]).includes(plan.defaultWorkoutType)) {
            this.workoutType.set(plan.defaultWorkoutType as unknown as WorkoutSession.WorkoutTypeEnum);
          }
          this.exercises.set(this.rowsFromPlan(plan));
        }
      }
      await this.persist();
    }

    this.elapsedMs.set(Date.now() - this.startedAtMs);
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  ngOnDestroy(): void {
    if (this.tickHandle !== undefined) {
      clearInterval(this.tickHandle);
    }
  }

  private tick(): void {
    this.elapsedMs.set(Date.now() - this.startedAtMs);
    if (this.restRemaining() === null) {
      return;
    }
    const { value, expired } = nextRestValue(this.restRemaining());
    this.restRemaining.set(value);
    if (expired) {
      this.fireRestAlarm();
    }
  }

  // ---- session fields ----------------------------------------------------------------------------

  setWorkoutType(value: WorkoutSession.WorkoutTypeEnum): void {
    this.workoutType.set(value);
    void this.persist();
  }

  setTitle(value: string | null): void {
    this.title.set(value?.trim() ? value.trim() : null);
    void this.persist();
  }

  setLocation(value: WorkoutSession.LocationEnum | null): void {
    this.location.set(value);
    void this.persist();
  }

  setRoundsCount(value: number | null): void {
    this.roundsCount.set(value !== null && value >= 1 ? value : null);
    void this.persist();
  }

  nextRound(): void {
    this.currentRound.update((round) => round + 1);
    void this.persist();
  }

  /** documentation/Subfeatures/Edzésnapló.md "HIIT: körök — kör másolás gombokkal": append a copy of every exercise's last set. */
  copyRound(): void {
    this.exercises().forEach((row) => {
      const sets = row.sets();
      const last = sets[sets.length - 1];
      if (last !== undefined) {
        row.sets.update((current) => [...current, this.cloneSetRow(last)]);
      }
    });
    this.currentRound.update((round) => round + 1);
    void this.persist();
  }

  // ---- exercises / sets -------------------------------------------------------------------------

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onPicked(results: ExercisePickResult[]): void {
    this.pickerOpen.set(false);
    const rows = results.map((result) => this.emptyExerciseRow(result));
    this.exercises.update((current) => [...current, ...rows]);
    void this.persist();
  }

  removeExercise(row: ExerciseRow): void {
    this.exercises.update((rows) => rows.filter((entry) => entry.id !== row.id));
    void this.persist();
  }

  addSet(row: ExerciseRow): void {
    row.sets.update((sets) => [...sets, this.emptySetRow(sets[sets.length - 1])]);
    void this.persist();
  }

  copyLastSet(row: ExerciseRow): void {
    const sets = row.sets();
    const last = sets[sets.length - 1];
    if (last !== undefined) {
      row.sets.update((current) => [...current, this.cloneSetRow(last)]);
      void this.persist();
    }
  }

  removeSet(row: ExerciseRow, set: SetRow): void {
    row.sets.update((sets) => sets.filter((entry) => entry.id !== set.id));
    void this.persist();
  }

  bump(field: WritableSignal<number | null>, delta: number): void {
    field.update((value) => Math.round(((value ?? 0) + delta) * 100) / 100);
    void this.persist();
  }

  setField(field: WritableSignal<number | null>, value: number | null): void {
    field.set(value);
    void this.persist();
  }

  setSetType(set: SetRow, value: WorkoutSetEntry.SetTypeEnum): void {
    set.setType.set(value);
    void this.persist();
  }

  /**
   * documentation/Subfeatures/Edzésnapló.md "szett pipa → Rest Timer indul": ticking the set both
   * marks it done and starts the rest countdown (set override → catalog default → 90s). Un-ticking
   * just clears the flag.
   */
  toggleComplete(row: ExerciseRow, set: SetRow): void {
    const done = !set.isCompleted();
    set.isCompleted.set(done);
    if (done) {
      this.startRest(set.restTimeSeconds() ?? row.defaultRestTimeSeconds ?? DEFAULT_REST_SECONDS);
    }
    void this.persist();
  }

  // ---- rest timer -----------------------------------------------------------------------------

  private startRest(seconds: number): void {
    this.restRemaining.set(seconds > 0 ? seconds : null);
  }

  addRest(delta: number): void {
    this.restRemaining.update((remaining) => {
      if (remaining === null) {
        return null;
      }
      const next = remaining + delta;
      return next > 0 ? next : null;
    });
  }

  skipRest(): void {
    this.restRemaining.set(null);
  }

  private fireRestAlarm(): void {
    if (Capacitor.isNativePlatform()) {
      void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    }
    this.beep();
  }

  /** Short WebAudio tone — works in the browser and the native webview; silently no-ops if unavailable. */
  private beep(): void {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor === undefined) {
        return;
      }
      const ctx = new Ctor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.1;
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
      oscillator.onended = () => void ctx.close();
    } catch {
      // no audio in this environment — the haptic (native) is enough
    }
  }

  // ---- PR badges -----------------------------------------------------------------------------

  prFlags(row: ExerciseRow): ReturnType<typeof detectPrs> {
    return detectPrs(this.repository.items(), this.rowToEntry(row), this.sessionId || undefined);
  }

  // ---- finish / discard ---------------------------------------------------------------------

  async finish(): Promise<void> {
    const draft = this.buildFinishDraft();
    await this.repository.save(draft);
    await this.draftService.clear();
    await this.router.navigateByUrl('/tabs/workout/log');
  }

  async discard(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.ACTIVE.DISCARD_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.ACTIVE.DISCARD_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('WORKOUT.ACTIVE.DISCARD'),
          role: 'destructive',
          handler: () => void this.discardConfirmed(),
        },
      ],
    });
    await alert.present();
  }

  private async discardConfirmed(): Promise<void> {
    await this.draftService.clear();
    await this.router.navigateByUrl('/tabs/workout/log');
  }

  // ---- serialization ----------------------------------------------------------------------

  private persist(): Promise<void> {
    return this.draftService.write(this.snapshot());
  }

  private snapshot(): ActiveWorkoutDraft {
    return {
      sessionId: this.sessionId,
      startedAtMs: this.startedAtMs,
      date: this.date,
      workoutType: this.workoutType(),
      title: this.title(),
      location: this.location(),
      notes: this.notes(),
      planId: this.planId,
      roundsCount: this.isHiit() ? this.roundsCount() : null,
      currentRound: this.currentRound(),
      exercises: this.exercises().map((row) => ({
        id: row.id,
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        exerciseCategory: row.exerciseCategory,
        exerciseKind: row.exerciseKind,
        supersetGroup: row.supersetGroup(),
        defaultRestTimeSeconds: row.defaultRestTimeSeconds,
        sets: row.sets().map((set) => ({
          id: set.id,
          setType: set.setType(),
          reps: set.reps(),
          weightKg: set.weightKg(),
          holdTimeSeconds: set.holdTimeSeconds(),
          edgeSizeMm: set.edgeSizeMm(),
          distanceMeters: set.distanceMeters(),
          restTimeSeconds: set.restTimeSeconds(),
          isCompleted: set.isCompleted(),
        })),
      })),
    };
  }

  private buildFinishDraft(): WorkoutSessionDraft {
    const elapsedMinutes = Math.round(this.elapsedMs() / 60000);
    return {
      id: this.sessionId,
      date: this.date,
      startTime: hhmm(this.startedAtMs),
      endTime: hhmm(Date.now()),
      durationMinutes: elapsedMinutes > 0 ? elapsedMinutes : null,
      workoutType: this.workoutType(),
      title: this.title(),
      notes: this.notes(),
      location: this.location(),
      planId: this.planId,
      roundsCount: this.isHiit() ? this.roundsCount() : null,
      exercises: this.exercises().map((row, index) => this.rowToSaveItem(row, index)),
    };
  }

  private rowToSaveItem(row: ExerciseRow, orderIndex: number): WorkoutExerciseSaveItem {
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

  /** documentation/Subfeatures/Edzésnapló.md "PR típusok": a full `WorkoutExerciseEntry` shape for `detectPrs`. */
  private rowToEntry(row: ExerciseRow): WorkoutExerciseEntry {
    const item = this.rowToSaveItem(row, 0);
    return {
      ...item,
      sessionId: this.sessionId,
      deleted: false,
      sets: item.sets.map((set) => ({ ...set, exerciseEntryId: row.id, deleted: false })),
    };
  }

  /** Just enough of a `WorkoutSession` DTO for `workout-metrics.ts` (elapsed drives the live kcal). */
  private buildPreviewShape(): WorkoutSession {
    const elapsedMinutes = Math.round(this.elapsedMs() / 60000);
    return {
      id: 'draft',
      date: this.date,
      startTime: null,
      endTime: null,
      durationMinutes: elapsedMinutes > 0 ? elapsedMinutes : null,
      workoutType: this.workoutType(),
      deleted: false,
      exercises: this.exercises().map((row) => this.rowToEntry(row)),
    };
  }

  // ---- hydration ------------------------------------------------------------------------

  private hydrateFrom(draft: ActiveWorkoutDraft): void {
    this.sessionId = draft.sessionId;
    this.startedAtMs = draft.startedAtMs;
    this.date = draft.date;
    this.planId = draft.planId;
    this.workoutType.set(draft.workoutType);
    this.title.set(draft.title);
    this.location.set(draft.location);
    this.notes.set(draft.notes);
    this.roundsCount.set(draft.roundsCount);
    this.currentRound.set(draft.currentRound);
    this.exercises.set(draft.exercises.map((exercise) => this.rowFromDraft(exercise)));
  }

  private rowFromDraft(exercise: ActiveExerciseDraft): ExerciseRow {
    return {
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      exerciseCategory: exercise.exerciseCategory,
      exerciseKind: exercise.exerciseKind,
      defaultRestTimeSeconds: exercise.defaultRestTimeSeconds,
      supersetGroup: signal(exercise.supersetGroup),
      sets: signal(
        exercise.sets.map((set) => ({
          id: set.id,
          setType: signal(set.setType),
          reps: signal(set.reps),
          weightKg: signal(set.weightKg),
          holdTimeSeconds: signal(set.holdTimeSeconds),
          edgeSizeMm: signal(set.edgeSizeMm),
          distanceMeters: signal(set.distanceMeters),
          restTimeSeconds: signal(set.restTimeSeconds),
          isCompleted: signal(set.isCompleted),
        })),
      ),
    };
  }

  /** "Ugyanaz mint legutóbb": clone a prior session's structure + weights, sets un-ticked, fresh ids. */
  private rowsFromSession(session: WorkoutSession): ExerciseRow[] {
    return session.exercises
      .filter((exercise) => !exercise.deleted)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((exercise) => ({
        id: uuidV4(),
        exerciseId: exercise.exerciseId ?? null,
        exerciseName: exercise.exerciseName,
        exerciseCategory: exercise.exerciseCategory,
        exerciseKind: exercise.exerciseKind,
        defaultRestTimeSeconds: this.catalogRestFor(exercise.exerciseId ?? null),
        supersetGroup: signal(exercise.supersetGroup ?? null),
        sets: signal(
          exercise.sets
            .filter((set) => !set.deleted)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((set) => ({
              id: uuidV4(),
              setType: signal(set.setType),
              reps: signal(set.reps ?? null),
              weightKg: signal(set.weightKg ?? null),
              holdTimeSeconds: signal(set.holdTimeSeconds ?? null),
              edgeSizeMm: signal(set.edgeSizeMm ?? null),
              distanceMeters: signal(set.distanceMeters ?? null),
              restTimeSeconds: signal(set.restTimeSeconds ?? null),
              isCompleted: signal(false),
            })),
        ),
      }));
  }

  /** documentation/Subfeatures/Heti terv.md "Indítás": clone a template's structure + target sets, fresh ids, un-ticked. */
  private rowsFromPlan(plan: WorkoutPlan): ExerciseRow[] {
    return plan.exercises
      .filter((exercise) => !exercise.deleted)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((exercise) => ({
        id: uuidV4(),
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        exerciseCategory: exercise.exerciseCategory as unknown as WorkoutExerciseEntry.ExerciseCategoryEnum,
        exerciseKind: exercise.exerciseKind as unknown as WorkoutExerciseEntry.ExerciseKindEnum,
        defaultRestTimeSeconds: this.catalogRestFor(exercise.exerciseId),
        supersetGroup: signal(exercise.supersetGroup ?? null),
        sets: signal(
          exercise.targetSets
            .filter((set) => !set.deleted)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((set) => ({
              id: uuidV4(),
              setType: signal(set.setType as unknown as WorkoutSetEntry.SetTypeEnum),
              reps: signal(set.reps ?? null),
              weightKg: signal(set.weightKg ?? null),
              holdTimeSeconds: signal(set.holdTimeSeconds ?? null),
              edgeSizeMm: signal(set.edgeSizeMm ?? null),
              distanceMeters: signal(set.distanceMeters ?? null),
              restTimeSeconds: signal(set.restTimeSeconds ?? null),
              isCompleted: signal(false),
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
      defaultRestTimeSeconds: this.catalogRestFor(result.exerciseId),
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

  private catalogRestFor(exerciseId: string | null): number | null {
    if (exerciseId === null) {
      return null;
    }
    return this.exerciseRepository.items().find((exercise) => exercise.id === exerciseId)?.defaultRestTimeSeconds ?? null;
  }
}

function hhmm(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
