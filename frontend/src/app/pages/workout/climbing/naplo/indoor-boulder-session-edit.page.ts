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
import { GymColorBand } from '../../../../api/model/gymColorBand';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { GymColorBandRepository } from '../../../../core/data/gym-color-band.repository';
import { GymRepository } from '../../../../core/data/gym.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { AscentAttemptSaveItem, ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { uuidV4 } from '../../../../core/sync/uuid';
import { today } from '../../../../shared/local-date';
import { climbingKcal, climbingVolume } from '../climbing-metrics';
import { parseGrade } from '../grade-scale';

/** One editable ascent-attempt row (mutable signals, mirrors the workout edit page's SetRow). */
interface AttemptRow {
  id: string;
  colorBandId: WritableSignal<string | null>;
  userRawInput: WritableSignal<string | null>;
  isSuccess: WritableSignal<boolean>;
  ascentStyle: WritableSignal<AscentAttempt.AscentStyleEnum | null>;
  attemptCount: WritableSignal<number | null>;
  notes: WritableSignal<string | null>;
}

const ASCENT_STYLES: readonly AscentAttempt.AscentStyleEnum[] = [
  AscentAttempt.AscentStyleEnum.Flash,
  AscentAttempt.AscentStyleEnum.Redpoint,
  AscentAttempt.AscentStyleEnum.Onsight,
];

/**
 * documentation/Subfeatures/Indoor boulder napló.md — the reference kontextus-napló create/edit form
 * (`id` route param is an existing session's uuid or `new`). Context is fixed (INDOOR + BOULDER);
 * minimal required fields: date + gym + at least a duration or one attempt (the client kcal falls
 * back to logged-attempt-rows × 5 min). Colour-band chips from the selected gym are the primary grade
 * quick-select; a free-text Font/V grade is the alternative (parsed client-side for the matrix index).
 */
@Component({
  selector: 'app-indoor-boulder-session-edit',
  templateUrl: 'indoor-boulder-session-edit.page.html',
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorBoulderSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ClimbingSessionRepository);
  private readonly gymRepository = inject(GymRepository);
  private readonly bandRepository = inject(GymColorBandRepository);
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

  /** Boulder gyms only (documentation/Subfeatures/Indoor boulder napló.md — the picker filters by discipline). */
  readonly boulderGyms = computed(() =>
    this.gymRepository
      .items()
      .filter((gym) => !gym.deleted && gym.disciplines.includes('BOULDER')),
  );

  readonly bands = computed<GymColorBand[]>(() => {
    const gymId = this.gymIdValue();
    return gymId ? this.bandRepository.forGym(gymId) : [];
  });

  readonly previewKcal = computed(() => {
    this.attemptsRevision();
    return climbingKcal(
      {
        discipline: ClimbingSession.DisciplineEnum.Boulder,
        totalSessionDurationMinutes: this.durationValue(),
        pumpRating: this.pumpValue(),
        attempts: this.metricAttempts(),
      },
      this.profileRepository.profile()?.currentWeightKg ?? null,
    );
  });

  readonly previewVolume = computed(() => {
    this.attemptsRevision();
    return climbingVolume({ discipline: ClimbingSession.DisciplineEnum.Boulder, attempts: this.metricAttempts() });
  });

  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  /**
   * documentation/Subfeatures/Indoor boulder napló.md — "minimális kötelező: dátum + terem + legalább
   * idő vagy kísérletek". `date` + `gymId` are `Validators.required`; this covers the "duration OR
   * ≥1 attempt" half the form controls can't express on their own.
   */
  readonly minFieldsMet = computed(() => {
    const duration = this.durationValue();
    return (duration != null && duration > 0) || this.attempts().length > 0;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.repository.load(),
      this.gymRepository.load(),
      this.bandRepository.load(),
      this.profileRepository.load(),
    ]);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/climbing/indoor-boulder');
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

    // A fresh session prefills the most recently used gym (documentation/Subfeatures/Indoor boulder napló.md).
    const lastGymId = this.repository
      .forContext(ClimbingSession.LocationTypeEnum.Indoor, ClimbingSession.DisciplineEnum.Boulder)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.gymId;
    if (lastGymId) {
      this.form.patchValue({ gymId: lastGymId });
    }
  }

  bandById(id: string | null): GymColorBand | undefined {
    return id ? this.bands().find((band) => band.id === id) : undefined;
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
    if (!row.isSuccess()) {
      row.ascentStyle.set(null);
    }
    this.touchAttempts();
  }

  pickBand(row: AttemptRow, bandId: string | null): void {
    row.colorBandId.set(bandId);
    this.touchAttempts();
  }

  touchAttempts(): void {
    this.attemptsRevision.update((value) => value + 1);
  }

  /**
   * documentation/Subfeatures/Nehézségi szint skálája.md — the shared grade-input component (chips,
   * help modal, ambiguity blocking) is a later slice; until then at least surface that a typed grade
   * the parser can't resolve won't feed the volume / max-grade / pyramid stats.
   */
  gradeUnparsed(row: AttemptRow): boolean {
    const raw = row.userRawInput()?.trim();
    return !!raw && parseGrade(raw, 'BOULDER').status !== 'VALID';
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.minFieldsMet()) {
      this.form.markAllAsTouched();
      return;
    }
    const saved = await this.repository.save(this.buildDraft());
    this.sessionId.set(saved.id);
    await this.router.navigateByUrl('/tabs/workout/climbing/indoor-boulder');
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
    await this.router.navigateByUrl('/tabs/workout/climbing/indoor-boulder');
  }

  /** The kcal / volume model only needs success + resolved grade index per attempt (boulder: no length / safety). */
  private metricAttempts(): { isSuccess: boolean; absoluteDifficultyIndex: number | null }[] {
    return this.attempts().map((row) => ({
      isSuccess: row.isSuccess(),
      absoluteDifficultyIndex: this.resolveIndex(row),
    }));
  }

  /** A typed free-text grade wins; otherwise the picked colour band's mid index; otherwise unresolved. */
  private resolveIndex(row: AttemptRow): number | null {
    const raw = row.userRawInput()?.trim();
    if (raw) {
      const parsed = parseGrade(raw, 'BOULDER');
      if (parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null) {
        return parsed.absoluteDifficultyIndex;
      }
    }
    const band = this.bandById(row.colorBandId());
    if (band) {
      return Math.round((band.absoluteDifficultyIndexLower + band.absoluteDifficultyIndexUpper) / 2);
    }
    return null;
  }

  private buildDraft(): ClimbingSessionDraft {
    const value = this.form.getRawValue();
    const gym = this.boulderGyms().find((g) => g.id === value.gymId);
    const partners = (value.climbingPartners ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    return {
      id: this.sessionId() ?? '',
      date: value.date,
      locationType: ClimbingSession.LocationTypeEnum.Indoor,
      discipline: ClimbingSession.DisciplineEnum.Boulder,
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
    const band = this.bandById(row.colorBandId());
    const raw = row.userRawInput()?.trim() || null;
    return {
      id: row.id,
      isSuccess: row.isSuccess(),
      userRawInput: raw,
      absoluteDifficultyIndex: this.resolveIndex(row),
      ascentStyle: row.isSuccess() ? row.ascentStyle() : null,
      safetyStyle: null,
      failurePoint: null,
      attemptCount: row.attemptCount(),
      colorBandId: row.colorBandId(),
      colorName: band?.name ?? null,
      hexColor: band?.hexColor ?? null,
      gradeRange: band ? `${band.gradeLower}–${band.gradeUpper}` : null,
      indoorRouteId: null,
      routeId: null,
      boulderProblemId: null,
      routeName: null,
      lengthInMeters: null,
      notes: row.notes()?.trim() ? row.notes()!.trim() : null,
      orderIndex,
      pitches: [],
    };
  }

  private rowFrom(attempt: AscentAttempt): AttemptRow {
    return {
      id: attempt.id,
      colorBandId: signal(attempt.colorBandId ?? null),
      userRawInput: signal(attempt.userRawInput ?? null),
      isSuccess: signal(attempt.isSuccess),
      ascentStyle: signal(attempt.ascentStyle ?? null),
      attemptCount: signal(attempt.attemptCount ?? null),
      notes: signal(attempt.notes ?? null),
    };
  }

  private emptyRow(): AttemptRow {
    return {
      id: uuidV4(),
      colorBandId: signal<string | null>(null),
      userRawInput: signal<string | null>(null),
      isSuccess: signal(false),
      ascentStyle: signal<AscentAttempt.AscentStyleEnum | null>(null),
      attemptCount: signal<number | null>(null),
      notes: signal<string | null>(null),
    };
  }
}
