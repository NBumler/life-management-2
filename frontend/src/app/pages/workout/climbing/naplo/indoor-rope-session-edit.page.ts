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
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AscentAttempt } from '../../../../api/model/ascentAttempt';
import { ClimbingSession } from '../../../../api/model/climbingSession';
import { IndoorRoute } from '../../../../api/model/indoorRoute';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { GymRepository } from '../../../../core/data/gym.repository';
import { IndoorRouteRepository } from '../../../../core/data/indoor-route.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { AscentAttemptSaveItem, ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { uuidV4 } from '../../../../core/sync/uuid';
import { today } from '../../../../shared/local-date';
import { parseGrade } from '../../../../shared/climbing/grade-scale';
import { GradeInputComponent } from '../../../../shared/grade-input/grade-input.component';
import { climbingKcal, climbingVolume } from '../climbing-metrics';

/** One editable ascent-attempt row (mutable signals, mirrors the indoor-boulder edit page's AttemptRow). */
interface AttemptRow {
  id: string;
  indoorRouteId: WritableSignal<string | null>;
  routeName: WritableSignal<string | null>;
  userRawInput: WritableSignal<string | null>;
  lengthInMeters: WritableSignal<number | null>;
  safetyStyle: WritableSignal<AscentAttempt.SafetyStyleEnum>;
  isSuccess: WritableSignal<boolean>;
  ascentStyle: WritableSignal<AscentAttempt.AscentStyleEnum | null>;
  failurePoint: WritableSignal<string | null>;
  attemptCount: WritableSignal<number | null>;
  notes: WritableSignal<string | null>;
}

const ASCENT_STYLES: readonly AscentAttempt.AscentStyleEnum[] = [
  AscentAttempt.AscentStyleEnum.Onsight,
  AscentAttempt.AscentStyleEnum.Flash,
  AscentAttempt.AscentStyleEnum.Redpoint,
];

/**
 * documentation/Subfeatures/Indoor köteles napló.md — indoor rope never offers TRAD; the picker is
 * further narrowed to the gym's `availableSafetyStyles` when the admin configured them.
 */
const INDOOR_SAFETY_STYLES: readonly AscentAttempt.SafetyStyleEnum[] = [
  AscentAttempt.SafetyStyleEnum.Toprope,
  AscentAttempt.SafetyStyleEnum.Lead,
];

const DEFAULT_SAFETY_STYLE = AscentAttempt.SafetyStyleEnum.Lead;

/**
 * documentation/Subfeatures/Indoor köteles napló.md — the INDOOR + ROPE kontextus-napló create/edit
 * form (`id` route param is an existing session's uuid or `new`). Differs from the boulder reference
 * (documentation/Subfeatures/Indoor boulder napló.md) by: no colour bands, a manual grade + height
 * OR an optional `IndoorRoute` pick / ad-hoc name, a `TOPROPE | LEAD` safety chip (TRAD hidden), an
 * optional `lengthInMeters` defaulting to the gym wall height, an optional `failurePoint` on a miss,
 * and no PitchLog. Duration fallback is attempts × 15 min (handled by `climbing-metrics`).
 */
@Component({
  selector: 'app-indoor-rope-session-edit',
  templateUrl: 'indoor-rope-session-edit.page.html',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
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
    IonLabel,
    IonInput,
    IonTextarea,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonToggle,
    TranslatePipe,
    GradeInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorRopeSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ClimbingSessionRepository);
  private readonly gymRepository = inject(GymRepository);
  private readonly indoorRouteRepository = inject(IndoorRouteRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly ascentStyles = ASCENT_STYLES;
  readonly ratings = [1, 2, 3, 4, 5];

  readonly sessionId = signal<string | null>(null);
  readonly attempts = signal<AttemptRow[]>([]);

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    gymId: this.fb.nonNullable.control('', [Validators.required]),
    totalSessionDurationMinutes: this.fb.control<number | null>(null, [Validators.min(1)]),
    pumpRating: this.fb.control<number | null>(null),
    headspaceRating: this.fb.control<number | null>(null),
    climbingPartners: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  private readonly gymIdValue = toSignal(this.form.controls.gymId.valueChanges, {
    initialValue: this.form.controls.gymId.value,
  });
  private readonly durationValue = toSignal(this.form.controls.totalSessionDurationMinutes.valueChanges, {
    initialValue: this.form.controls.totalSessionDurationMinutes.value,
  });
  private readonly pumpValue = toSignal(this.form.controls.pumpRating.valueChanges, {
    initialValue: this.form.controls.pumpRating.value,
  });
  /** Bumped on every attempt-row field change so the kcal / volume preview recomputes. */
  private readonly attemptsRevision = signal(0);

  /** Rope gyms only (documentation/Subfeatures/Indoor köteles napló.md — the picker filters by discipline). */
  readonly ropeGyms = computed(() =>
    this.gymRepository.items().filter((gym) => !gym.deleted && gym.disciplines.includes('ROPE')),
  );

  private readonly selectedGym = computed(() => this.ropeGyms().find((gym) => gym.id === this.gymIdValue()));

  /** {TOPROPE, LEAD} narrowed to the gym's configured subset when the admin set one. */
  readonly safetyStyleOptions = computed<AscentAttempt.SafetyStyleEnum[]>(() => {
    const configured = this.selectedGym()?.availableSafetyStyles ?? null;
    if (configured && configured.length > 0) {
      return INDOOR_SAFETY_STYLES.filter((style) => (configured as string[]).includes(style));
    }
    return [...INDOOR_SAFETY_STYLES];
  });

  /** The gym wall height — the attempt-length default + the length input's placeholder. */
  readonly wallHeight = computed<number | null>(() => this.selectedGym()?.defaultWallHeightMeters ?? null);
  readonly wallHeightPlaceholder = computed(() => (this.wallHeight() != null ? String(this.wallHeight()) : ''));

  readonly indoorRoutes = computed<IndoorRoute[]>(() => {
    const gymId = this.gymIdValue();
    return gymId
      ? this.indoorRouteRepository.forGym(gymId).filter((r) => r.discipline === IndoorRoute.DisciplineEnum.Rope)
      : [];
  });

  readonly previewKcal = computed(() => {
    this.attemptsRevision();
    return climbingKcal(
      {
        discipline: ClimbingSession.DisciplineEnum.Rope,
        totalSessionDurationMinutes: this.durationValue(),
        pumpRating: this.pumpValue(),
        attempts: this.metricAttempts(),
      },
      this.profileRepository.profile()?.currentWeightKg ?? null,
    );
  });

  readonly previewVolume = computed(() => {
    this.attemptsRevision();
    return climbingVolume({ discipline: ClimbingSession.DisciplineEnum.Rope, attempts: this.metricAttempts() });
  });

  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  /**
   * documentation/Subfeatures/Indoor köteles napló.md / Indoor boulder napló.md — "minimális kötelező:
   * dátum + terem + legalább idő vagy kísérletek". `date` + `gymId` are `Validators.required`; this
   * covers the "duration OR ≥1 attempt" half.
   */
  readonly minFieldsMet = computed(() => {
    const duration = this.durationValue();
    return (duration != null && duration > 0) || this.attempts().length > 0;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.repository.load(),
      this.gymRepository.load(),
      this.indoorRouteRepository.load(),
      this.profileRepository.load(),
    ]);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/climbing/indoor-rope');
        return;
      }
      this.sessionId.set(idParam);
      this.form.reset({
        date: existing.date,
        gymId: existing.gymId ?? '',
        totalSessionDurationMinutes: existing.totalSessionDurationMinutes ?? null,
        pumpRating: existing.pumpRating ?? null,
        headspaceRating: existing.headspaceRating ?? null,
        climbingPartners: (existing.climbingPartners ?? []).join(', ') || null,
        notes: existing.notes ?? null,
      });
      this.attempts.set(
        existing.attempts
          .filter((attempt) => !attempt.deleted)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((attempt) => this.rowFrom(attempt)),
      );
      return;
    }

    // A fresh session prefills the most recently used gym (documentation/Subfeatures/Indoor köteles napló.md).
    const lastGymId = this.repository
      .forContext(ClimbingSession.LocationTypeEnum.Indoor, ClimbingSession.DisciplineEnum.Rope)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.gymId;
    if (lastGymId) {
      this.form.patchValue({ gymId: lastGymId });
    }
  }

  routeById(id: string | null): IndoorRoute | undefined {
    return id ? this.indoorRoutes().find((route) => route.id === id) : undefined;
  }

  addAttempt(): void {
    this.attempts.update((rows) => [...rows, this.emptyRow()]);
    this.touchAttempts();
  }

  removeAttempt(row: AttemptRow): void {
    this.attempts.update((rows) => rows.filter((entry) => entry.id !== row.id));
    this.touchAttempts();
  }

  toggleSuccess(row: AttemptRow): void {
    row.isSuccess.update((value) => !value);
    if (row.isSuccess()) {
      row.failurePoint.set(null);
    } else {
      row.ascentStyle.set(null);
    }
    this.touchAttempts();
  }

  pickRoute(row: AttemptRow, routeId: string | null): void {
    row.indoorRouteId.set(routeId);
    const route = this.routeById(routeId);
    if (route) {
      row.routeName.set(route.name);
      if (!row.userRawInput()?.trim()) {
        row.userRawInput.set(route.grade);
      }
    }
    this.touchAttempts();
  }

  setSafetyStyle(row: AttemptRow, style: AscentAttempt.SafetyStyleEnum): void {
    row.safetyStyle.set(style);
    this.touchAttempts();
  }

  touchAttempts(): void {
    this.attemptsRevision.update((value) => value + 1);
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.minFieldsMet()) {
      this.form.markAllAsTouched();
      return;
    }
    const saved = await this.repository.save(this.buildDraft());
    this.sessionId.set(saved.id);
    await this.router.navigateByUrl('/tabs/workout/climbing/indoor-rope');
  }

  async delete(): Promise<void> {
    const id = this.sessionId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.SESSION.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.SESSION.DELETE_CONFIRM_MESSAGE'),
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
    await this.router.navigateByUrl('/tabs/workout/climbing/indoor-rope');
  }

  /** The rope kcal / volume model needs success + grade index + safety style + climbed length per attempt. */
  private metricAttempts(): {
    isSuccess: boolean;
    absoluteDifficultyIndex: number | null;
    safetyStyle: AscentAttempt.SafetyStyleEnum;
    lengthInMeters: number | null;
  }[] {
    return this.attempts().map((row) => ({
      isSuccess: row.isSuccess(),
      absoluteDifficultyIndex: this.resolveIndex(row),
      safetyStyle: row.safetyStyle(),
      lengthInMeters: this.resolveLength(row),
    }));
  }

  /** A typed free-text grade wins; otherwise the picked indoor route's stored index; otherwise unresolved. */
  private resolveIndex(row: AttemptRow): number | null {
    const raw = row.userRawInput()?.trim();
    if (raw) {
      const parsed = parseGrade(raw, 'ROPE');
      if (parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null) {
        return parsed.absoluteDifficultyIndex;
      }
    }
    const route = this.routeById(row.indoorRouteId());
    return route ? route.absoluteDifficultyIndex : null;
  }

  /** The attempt length actually stored / used: the typed value, else the gym wall-height default. */
  private resolveLength(row: AttemptRow): number | null {
    const typed = row.lengthInMeters();
    if (typed != null && Number.isFinite(typed) && typed > 0) {
      return typed;
    }
    return this.wallHeight();
  }

  private buildDraft(): ClimbingSessionDraft {
    const value = this.form.getRawValue();
    const gym = this.ropeGyms().find((g) => g.id === value.gymId);
    const partners = (value.climbingPartners ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    return {
      id: this.sessionId() ?? '',
      date: value.date,
      locationType: ClimbingSession.LocationTypeEnum.Indoor,
      discipline: ClimbingSession.DisciplineEnum.Rope,
      totalSessionDurationMinutes: value.totalSessionDurationMinutes,
      pumpRating: value.pumpRating,
      headspaceRating: value.headspaceRating,
      notes: value.notes?.trim() ? value.notes.trim() : null,
      climbingPartners: partners.length > 0 ? partners : null,
      weatherConditions: null,
      gymId: value.gymId,
      gymName: gym?.name ?? null,
      cragId: null,
      cragName: null,
      sectorId: null,
      sectorName: null,
      rockType: null,
      aspect: null,
      attempts: this.attempts().map((row, index) => this.rowToSaveItem(row, index)),
    };
  }

  private rowToSaveItem(row: AttemptRow, orderIndex: number): AscentAttemptSaveItem {
    const route = this.routeById(row.indoorRouteId());
    const raw = row.userRawInput()?.trim() || null;
    const name = row.routeName()?.trim() || route?.name || null;
    return {
      id: row.id,
      isSuccess: row.isSuccess(),
      userRawInput: raw,
      absoluteDifficultyIndex: this.resolveIndex(row),
      ascentStyle: row.isSuccess() ? row.ascentStyle() : null,
      safetyStyle: row.safetyStyle(),
      failurePoint: row.isSuccess() ? null : row.failurePoint()?.trim() || null,
      attemptCount: row.attemptCount(),
      colorBandId: null,
      colorName: null,
      hexColor: null,
      gradeRange: null,
      indoorRouteId: row.indoorRouteId(),
      routeId: null,
      boulderProblemId: null,
      routeName: name,
      lengthInMeters: this.resolveLength(row),
      notes: row.notes()?.trim() ? row.notes()!.trim() : null,
      orderIndex,
      pitches: [],
    };
  }

  private rowFrom(attempt: AscentAttempt): AttemptRow {
    return {
      id: attempt.id,
      indoorRouteId: signal(attempt.indoorRouteId ?? null),
      routeName: signal(attempt.routeName ?? null),
      userRawInput: signal(attempt.userRawInput ?? null),
      lengthInMeters: signal(attempt.lengthInMeters ?? null),
      safetyStyle: signal(attempt.safetyStyle ?? DEFAULT_SAFETY_STYLE),
      isSuccess: signal(attempt.isSuccess),
      ascentStyle: signal(attempt.ascentStyle ?? null),
      failurePoint: signal(attempt.failurePoint ?? null),
      attemptCount: signal(attempt.attemptCount ?? null),
      notes: signal(attempt.notes ?? null),
    };
  }

  private emptyRow(): AttemptRow {
    return {
      id: uuidV4(),
      indoorRouteId: signal<string | null>(null),
      routeName: signal<string | null>(null),
      userRawInput: signal<string | null>(null),
      lengthInMeters: signal<number | null>(null),
      safetyStyle: signal<AscentAttempt.SafetyStyleEnum>(DEFAULT_SAFETY_STYLE),
      isSuccess: signal(false),
      ascentStyle: signal<AscentAttempt.AscentStyleEnum | null>(null),
      failurePoint: signal<string | null>(null),
      attemptCount: signal<number | null>(null),
      notes: signal<string | null>(null),
    };
  }
}
