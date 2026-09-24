import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, OnDestroy, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
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
import { bandModifierIndex } from '../../../../shared/climbing/climbing-grade-matrix';
import { parseGrade } from '../../../../shared/climbing/grade-scale';
import { GradeInputComponent } from '../../../../shared/grade-input/grade-input.component';
import { HelpButtonComponent } from '../../../../shared/help-button/help-button.component';
import { PartnerComboboxComponent } from '../../../../shared/partner-combobox/partner-combobox.component';
import { climbingKcal, climbingVolume } from '../climbing-metrics';
import { ClimbingLiveBarComponent } from './climbing-live-bar.component';
import { ClimbingLiveController } from './climbing-live-controller';
import { scrollToLastAttempt } from './scroll-to-last-attempt';

/** One editable ascent-attempt row (mutable signals, mirrors the workout edit page's SetRow). */
interface AttemptRow {
  id: string;
  colorBandId: WritableSignal<string | null>;
  /** backlog/122 — which part of the band (− / band / +); null = not recorded (the band's mid index). */
  bandModifier: WritableSignal<AscentAttempt.BandModifierEnum | null>;
  userRawInput: WritableSignal<string | null>;
  isSuccess: WritableSignal<boolean>;
  ascentStyle: WritableSignal<AscentAttempt.AscentStyleEnum | null>;
  attemptCount: WritableSignal<number | null>;
  notes: WritableSignal<string | null>;
  /** backlog/123 — with colour bands the free-text grade is secondary, folded behind "or grade". */
  gradeOpen: WritableSignal<boolean>;
}

const BAND_MODIFIERS: readonly AscentAttempt.BandModifierEnum[] = [
  AscentAttempt.BandModifierEnum.Minus,
  AscentAttempt.BandModifierEnum.Neutral,
  AscentAttempt.BandModifierEnum.Plus,
];

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
 * quick-select (backlog/123 — chips, not a dropdown); a free-text Font/V grade is the alternative,
 * folded behind an "or grade" button whenever the gym has bands (parsed client-side for the matrix index).
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
    IonChip,
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
    HelpButtonComponent,
    PartnerComboboxComponent,
    ClimbingLiveBarComponent,
  ],
  styles: [
    `
      .attempts-footer {
        padding: 4px 8px 16px;
      }
      .attempt-card {
        margin: 12px 8px;
        border: 1px solid var(--ion-background-color-step-150, #d7d8da);
        border-inline-start: 4px solid var(--ion-color-medium);
        border-radius: 10px;
        overflow: hidden;
      }
      .attempt-card--success {
        border-inline-start-color: var(--ion-color-success);
      }
      .attempt-card--fail {
        border-inline-start-color: var(--ion-color-danger);
      }
      .band-picker {
        padding: 8px 16px 0;
      }
      .band-picker__label {
        display: block;
        font-size: 0.8rem;
        margin-bottom: 4px;
      }
      .band-chips {
        display: flex;
        flex-wrap: wrap;
      }
      .band-swatch {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        margin-inline-end: 6px;
        border: 1px solid var(--ion-background-color-step-300, #ccc);
        flex: none;
      }
      .band-modifiers {
        display: flex;
        gap: 4px;
        padding-top: 4px;
      }
      .quick-grid {
        padding: 0 8px 8px;
      }
      .quick-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .quick-row .quick-band {
        flex: 1 1 auto;
      }
      .quick-row .quick-minus,
      .quick-row .quick-plus {
        flex: 0 0 3rem;
        font-size: 1.3rem;
      }
      .quick-count {
        margin-inline-start: auto;
        padding-inline-start: 8px;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
      .band-chip small {
        opacity: 0.7;
        margin-inline-start: 2px;
      }
      .attempt-card > ion-item:first-child {
        --background: var(--ion-background-color-step-50, #f7f7f7);
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorBoulderSessionEditPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ClimbingSessionRepository);
  private readonly gymRepository = inject(GymRepository);
  private readonly bandRepository = inject(GymColorBandRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly ascentStyles = ASCENT_STYLES;
  readonly bandModifiers = BAND_MODIFIERS;

  /** backlog/122 — the `indoor-boulder/live` route: live session + summary on this same form. */
  readonly live = new ClimbingLiveController('indoor-boulder');
  readonly ratings = [1, 2, 3, 4, 5];

  readonly sessionId = signal<string | null>(null);
  readonly attempts = signal<AttemptRow[]>([]);

  /** backlog/069 — picked partner names (own signal, not a form control); suggestions from the log. */
  readonly partners = signal<string[]>([]);
  readonly partnerSuggestions = this.repository.partnerSuggestions;

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    gymId: this.fb.nonNullable.control('', [Validators.required]),
    totalSessionDurationMinutes: this.fb.control<number | null>(null, [Validators.min(1)]),
    pumpRating: this.fb.control<number | null>(null),
    headspaceRating: this.fb.control<number | null>(null),
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

  /** backlog/122 — how many attempts each band got this session (the quick-record grid's counters). */
  readonly bandCounts = computed(() => {
    this.attemptsRevision();
    const counts = new Map<string, number>();
    for (const row of this.attempts()) {
      const bandId = row.colorBandId();
      if (bandId !== null) {
        counts.set(bandId, (counts.get(bandId) ?? 0) + 1);
      }
    }
    return counts;
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
      this.applySession(existing);
      return;
    }

    if (this.live.isLive) {
      const session = await this.live.resume();
      if (session === null) {
        return;
      }
      this.sessionId.set(session.id);
      this.applySession(session);
      if (!session.gymId) {
        this.prefillLastGym();
      }
      this.live.startAutosave(
        () => this.buildDraft(),
        () => this.syncLiveDuration(),
      );
      this.syncLiveDuration();
      return;
    }

    this.prefillLastGym();
  }

  ngOnDestroy(): void {
    this.live.destroy();
  }

  private applySession(existing: ClimbingSession): void {
    this.form.reset({
      date: existing.date,
      gymId: existing.gymId ?? '',
      totalSessionDurationMinutes: existing.totalSessionDurationMinutes ?? null,
      pumpRating: existing.pumpRating ?? null,
      headspaceRating: existing.headspaceRating ?? null,
      notes: existing.notes ?? null,
    });
    this.partners.set([...(existing.climbingPartners ?? [])]);
    this.attempts.set(
      existing.attempts
        .filter((attempt) => !attempt.deleted)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((attempt) => this.rowFrom(attempt)),
    );
  }

  /** Live mode: the duration follows the stopwatch / the summary's start–end, so the kcal preview is right. */
  private syncLiveDuration(): void {
    const minutes = this.live.durationMinutes();
    if (this.form.controls.totalSessionDurationMinutes.value !== minutes) {
      this.form.controls.totalSessionDurationMinutes.setValue(minutes);
    }
  }

  private prefillLastGym(): void {
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
    scrollToLastAttempt(this.host, this.injector);
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

  /**
   * backlog/122 — one tap on the live grid = one successful ascent with that band and part of it
   * (− lower / band mid / + upper index). A short haptic tick confirms it; the row's counter goes up.
   */
  quickRecord(band: GymColorBand, modifier: AscentAttempt.BandModifierEnum): void {
    const row = this.emptyRow();
    row.colorBandId.set(band.id);
    row.bandModifier.set(modifier);
    row.isSuccess.set(true);
    this.attempts.update((rows) => [...rows, row]);
    this.touchAttempts();
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    void this.live.autosave();
  }

  setBandModifier(row: AttemptRow, modifier: AscentAttempt.BandModifierEnum | null): void {
    row.bandModifier.set(row.bandModifier() === modifier ? null : modifier);
    this.touchAttempts();
  }

  pickBand(row: AttemptRow, bandId: string | null): void {
    if (bandId !== row.colorBandId()) {
      row.bandModifier.set(null);
    }
    row.colorBandId.set(bandId);
    this.touchAttempts();
  }

  touchAttempts(): void {
    this.attemptsRevision.update((value) => value + 1);
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.minFieldsMet() || (this.live.isLive && (!this.live.summary() || this.live.timesInvalid()))) {
      this.form.markAllAsTouched();
      return;
    }
    const saved = await this.repository.save(this.buildDraft());
    this.sessionId.set(saved.id);
    if (this.live.isLive) {
      await this.live.finish();
    }
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

  /** A typed free-text grade wins; otherwise the picked colour band's index for its − / band / + part (backlog/122); otherwise unresolved. */
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
      return bandModifierIndex(band, row.bandModifier());
    }
    return null;
  }

  private buildDraft(): ClimbingSessionDraft {
    return this.live.decorate(this.formDraft());
  }

  private formDraft(): ClimbingSessionDraft {
    const value = this.form.getRawValue();
    const gym = this.boulderGyms().find((g) => g.id === value.gymId);
    const partners = this.partners()
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
      weatherConditions: [],
      gymId: value.gymId,
      gymName: gym?.name ?? null,
      cragId: null,
      cragName: null,
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
      attemptCount: row.attemptCount(),
      colorBandId: row.colorBandId(),
      bandModifier: row.colorBandId() ? row.bandModifier() : null,
      colorName: band?.name ?? null,
      hexColor: band?.hexColor ?? null,
      gradeRange: band ? `${band.gradeLower}–${band.gradeUpper}` : null,
      indoorRouteId: null,
      routeId: null,
      boulderProblemId: null,
      sectorId: null,
      sectorName: null,
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
      bandModifier: signal(attempt.bandModifier ?? null),
      userRawInput: signal(attempt.userRawInput ?? null),
      isSuccess: signal(attempt.isSuccess),
      ascentStyle: signal(attempt.ascentStyle ?? null),
      attemptCount: signal(attempt.attemptCount ?? null),
      notes: signal(attempt.notes ?? null),
      gradeOpen: signal(!!attempt.userRawInput?.trim()),
    };
  }

  private emptyRow(): AttemptRow {
    return {
      id: uuidV4(),
      colorBandId: signal<string | null>(null),
      bandModifier: signal<AscentAttempt.BandModifierEnum | null>(null),
      userRawInput: signal<string | null>(null),
      isSuccess: signal(false),
      ascentStyle: signal<AscentAttempt.AscentStyleEnum | null>(null),
      attemptCount: signal<number | null>(1),
      notes: signal<string | null>(null),
      gradeOpen: signal(false),
    };
  }
}
