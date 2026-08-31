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
import { BoulderProblem } from '../../../../api/model/boulderProblem';
import { ClimbingSession } from '../../../../api/model/climbingSession';
import { BoulderProblemRepository } from '../../../../core/data/boulder-problem.repository';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { CragRepository } from '../../../../core/data/crag.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { AscentAttemptSaveItem, ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { uuidV4 } from '../../../../core/sync/uuid';
import { parseGrade } from '../../../../shared/climbing/grade-scale';
import { GradeInputComponent } from '../../../../shared/grade-input/grade-input.component';
import { today } from '../../../../shared/local-date';
import { climbingKcal, climbingVolume } from '../climbing-metrics';

/** One editable ascent-attempt row (mutable signals, mirrors the indoor-boulder edit page's AttemptRow). */
interface AttemptRow {
  id: string;
  boulderProblemId: WritableSignal<string | null>;
  problemName: WritableSignal<string | null>;
  userRawInput: WritableSignal<string | null>;
  isSuccess: WritableSignal<boolean>;
  ascentStyle: WritableSignal<AscentAttempt.AscentStyleEnum | null>;
  attemptCount: WritableSignal<number | null>;
  /** Ad-hoc problems only — write this row's name + grade to the sector's BoulderProblem catalog on save. */
  saveToCatalog: WritableSignal<boolean>;
  notes: WritableSignal<string | null>;
}

const ASCENT_STYLES: readonly AscentAttempt.AscentStyleEnum[] = [
  AscentAttempt.AscentStyleEnum.Flash,
  AscentAttempt.AscentStyleEnum.Redpoint,
  AscentAttempt.AscentStyleEnum.Onsight,
];

/** documentation/Features/Mászónapló.md — outdoor `weatherConditions` enum, session-level, that day's. */
const WEATHER_CONDITIONS: readonly ClimbingSession.WeatherConditionsEnum[] = [
  ClimbingSession.WeatherConditionsEnum.ColdDry,
  ClimbingSession.WeatherConditionsEnum.HotHumid,
  ClimbingSession.WeatherConditionsEnum.Windy,
  ClimbingSession.WeatherConditionsEnum.Wet,
];

/**
 * documentation/Subfeatures/Outdoor boulder napló.md — the OUTDOOR + BOULDER kontextus-napló
 * create/edit form (`id` route param is an existing session's uuid or `new`). Differs from the
 * indoor boulder reference (documentation/Subfeatures/Indoor boulder napló.md) by: a crag + sector
 * location picker (snapshot names) instead of a gym, an optional master `BoulderProblem` pick OR an
 * ad-hoc name with an optional "save to catalog", a session-level `rockType` (crag default,
 * overridable — no attempt-level field), an `aspect` inherited from the sector, and a
 * `weatherConditions` chip. No colour bands, no PitchLog. Duration fallback is attempts × 5 min
 * (handled by `climbing-metrics`).
 */
@Component({
  selector: 'app-outdoor-boulder-session-edit',
  templateUrl: 'outdoor-boulder-session-edit.page.html',
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
export class OutdoorBoulderSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ClimbingSessionRepository);
  private readonly cragRepository = inject(CragRepository);
  private readonly sectorRepository = inject(SectorRepository);
  private readonly boulderProblemRepository = inject(BoulderProblemRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly ascentStyles = ASCENT_STYLES;
  readonly weatherConditions = WEATHER_CONDITIONS;
  readonly ratings = [1, 2, 3, 4, 5];

  readonly sessionId = signal<string | null>(null);
  readonly attempts = signal<AttemptRow[]>([]);

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    cragId: this.fb.nonNullable.control('', [Validators.required]),
    sectorId: this.fb.nonNullable.control(''),
    rockType: this.fb.control<string | null>(null),
    aspect: this.fb.control<string | null>(null),
    weatherConditions: this.fb.control<ClimbingSession.WeatherConditionsEnum | null>(null),
    totalSessionDurationMinutes: this.fb.control<number | null>(null, [Validators.min(1)]),
    pumpRating: this.fb.control<number | null>(null),
    headspaceRating: this.fb.control<number | null>(null),
    climbingPartners: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  private readonly cragIdValue = toSignal(this.form.controls.cragId.valueChanges, {
    initialValue: this.form.controls.cragId.value,
  });
  private readonly sectorIdValue = toSignal(this.form.controls.sectorId.valueChanges, {
    initialValue: this.form.controls.sectorId.value,
  });
  private readonly durationValue = toSignal(this.form.controls.totalSessionDurationMinutes.valueChanges, {
    initialValue: this.form.controls.totalSessionDurationMinutes.value,
  });
  private readonly pumpValue = toSignal(this.form.controls.pumpRating.valueChanges, {
    initialValue: this.form.controls.pumpRating.value,
  });
  /** Bumped on every attempt-row field change so the kcal / volume preview recomputes. */
  private readonly attemptsRevision = signal(0);

  /** Live crags (documentation/Subfeatures/Outdoor boulder admin.md — the root of the location tree). */
  readonly crags = computed(() => this.cragRepository.items().filter((crag) => !crag.deleted));

  private readonly selectedCrag = computed(() => this.crags().find((crag) => crag.id === this.cragIdValue()));

  readonly sectorsForCrag = computed(() => {
    const cragId = this.cragIdValue();
    return cragId ? this.sectorRepository.forCrag(cragId) : [];
  });

  readonly problemsForSector = computed<BoulderProblem[]>(() => {
    const sectorId = this.sectorIdValue();
    return sectorId ? this.boulderProblemRepository.forSector(sectorId) : [];
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
   * documentation/Subfeatures/Indoor boulder napló.md — "minimális kötelező: dátum + helyszín +
   * legalább idő vagy kísérletek". `date` + `cragId` are `Validators.required`; this covers the
   * "duration OR ≥1 attempt" half.
   */
  readonly minFieldsMet = computed(() => {
    const duration = this.durationValue();
    return (duration != null && duration > 0) || this.attempts().length > 0;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.repository.load(),
      this.cragRepository.load(),
      this.sectorRepository.load(),
      this.boulderProblemRepository.load(),
      this.profileRepository.load(),
    ]);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/climbing/outdoor-boulder');
        return;
      }
      this.sessionId.set(idParam);
      this.form.reset({
        date: existing.date,
        cragId: existing.cragId ?? '',
        sectorId: existing.sectorId ?? '',
        rockType: existing.rockType ?? null,
        aspect: existing.aspect ?? null,
        weatherConditions: existing.weatherConditions ?? null,
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

    // A fresh session prefills the most recently used crag + sector (documentation/Subfeatures/Outdoor boulder napló.md).
    const last = this.repository
      .forContext(ClimbingSession.LocationTypeEnum.Outdoor, ClimbingSession.DisciplineEnum.Boulder)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (last?.cragId) {
      this.form.patchValue({ cragId: last.cragId });
      this.applyCragDefaults(last.cragId);
      if (last.sectorId) {
        this.form.patchValue({ sectorId: last.sectorId });
        this.applySectorDefaults(last.sectorId);
      }
    }
  }

  problemById(id: string | null): BoulderProblem | undefined {
    return id ? this.problemsForSector().find((problem) => problem.id === id) : undefined;
  }

  onCragChange(cragId: string): void {
    this.form.patchValue({ sectorId: '', aspect: null });
    this.applyCragDefaults(cragId);
  }

  onSectorChange(sectorId: string): void {
    this.applySectorDefaults(sectorId);
  }

  /** rockType is a session-level field, defaulted from the crag (overridable — Outdoor boulder napló.md). */
  private applyCragDefaults(cragId: string): void {
    const crag = this.crags().find((entry) => entry.id === cragId);
    this.form.patchValue({ rockType: crag?.defaultRockType ?? null });
  }

  /** aspect is inherited from the sector (overridable). */
  private applySectorDefaults(sectorId: string): void {
    const sector = this.sectorsForCrag().find((entry) => entry.id === sectorId);
    this.form.patchValue({ aspect: sector?.defaultAspect ?? null });
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

  toggleSaveToCatalog(row: AttemptRow): void {
    row.saveToCatalog.update((value) => !value);
  }

  pickProblem(row: AttemptRow, problemId: string | null): void {
    row.boulderProblemId.set(problemId);
    const problem = this.problemById(problemId);
    if (problem) {
      row.problemName.set(problem.name);
      if (!row.userRawInput()?.trim()) {
        row.userRawInput.set(problem.guidebookGrade);
      }
      row.saveToCatalog.set(false);
    }
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
    await this.persistNewCatalogProblems();
    const saved = await this.repository.save(this.buildDraft());
    this.sessionId.set(saved.id);
    await this.router.navigateByUrl('/tabs/workout/climbing/outdoor-boulder');
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
    await this.router.navigateByUrl('/tabs/workout/climbing/outdoor-boulder');
  }

  /**
   * documentation/Subfeatures/Outdoor boulder napló.md "opcionális `saveToCatalog`" — an ad-hoc row
   * flagged for the catalog becomes a `BoulderProblem` master under the selected sector; the new id is
   * written back onto the row so `buildDraft()` links to it. No sector → nothing to attach to.
   */
  private async persistNewCatalogProblems(): Promise<void> {
    const sectorId = this.form.getRawValue().sectorId;
    if (!sectorId) {
      return;
    }
    for (const row of this.attempts()) {
      if (!row.saveToCatalog() || row.boulderProblemId()) {
        continue;
      }
      const name = row.problemName()?.trim();
      const grade = row.userRawInput()?.trim();
      if (!name || !grade) {
        continue;
      }
      const created = await this.boulderProblemRepository.save({ sectorId, name, guidebookGrade: grade });
      row.boulderProblemId.set(created.id);
      row.saveToCatalog.set(false);
    }
  }

  /** The kcal / volume model only needs success + resolved grade index per attempt (boulder: no length / safety). */
  private metricAttempts(): { isSuccess: boolean; absoluteDifficultyIndex: number | null }[] {
    return this.attempts().map((row) => ({
      isSuccess: row.isSuccess(),
      absoluteDifficultyIndex: this.resolveIndex(row),
    }));
  }

  /** A typed free-text grade wins; otherwise the picked problem's guidebook grade; otherwise unresolved. */
  private resolveIndex(row: AttemptRow): number | null {
    const raw = row.userRawInput()?.trim();
    if (raw) {
      const parsed = parseGrade(raw, 'BOULDER');
      if (parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null) {
        return parsed.absoluteDifficultyIndex;
      }
    }
    const problem = this.problemById(row.boulderProblemId());
    if (problem) {
      const parsed = parseGrade(problem.guidebookGrade, 'BOULDER');
      if (parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null) {
        return parsed.absoluteDifficultyIndex;
      }
    }
    return null;
  }

  private buildDraft(): ClimbingSessionDraft {
    const value = this.form.getRawValue();
    const crag = this.crags().find((entry) => entry.id === value.cragId);
    const sector = this.sectorsForCrag().find((entry) => entry.id === value.sectorId);
    const partners = (value.climbingPartners ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    return {
      id: this.sessionId() ?? '',
      date: value.date,
      locationType: ClimbingSession.LocationTypeEnum.Outdoor,
      discipline: ClimbingSession.DisciplineEnum.Boulder,
      totalSessionDurationMinutes: value.totalSessionDurationMinutes,
      pumpRating: value.pumpRating,
      headspaceRating: value.headspaceRating,
      notes: value.notes?.trim() ? value.notes.trim() : null,
      climbingPartners: partners.length > 0 ? partners : null,
      weatherConditions: value.weatherConditions,
      gymId: null,
      gymName: null,
      cragId: value.cragId,
      cragName: crag?.name ?? null,
      sectorId: value.sectorId || null,
      sectorName: sector?.name ?? null,
      rockType: value.rockType?.trim() ? value.rockType.trim() : null,
      aspect: value.aspect?.trim() ? value.aspect.trim() : null,
      attempts: this.attempts().map((row, index) => this.rowToSaveItem(row, index)),
    };
  }

  private rowToSaveItem(row: AttemptRow, orderIndex: number): AscentAttemptSaveItem {
    const problem = this.problemById(row.boulderProblemId());
    return {
      id: row.id,
      isSuccess: row.isSuccess(),
      userRawInput: row.userRawInput()?.trim() || null,
      absoluteDifficultyIndex: this.resolveIndex(row),
      ascentStyle: row.isSuccess() ? row.ascentStyle() : null,
      safetyStyle: null,
      failurePoint: null,
      attemptCount: row.attemptCount(),
      colorBandId: null,
      colorName: null,
      hexColor: null,
      gradeRange: null,
      indoorRouteId: null,
      routeId: null,
      boulderProblemId: row.boulderProblemId(),
      routeName: row.problemName()?.trim() || problem?.name || null,
      lengthInMeters: null,
      notes: row.notes()?.trim() ? row.notes()!.trim() : null,
      orderIndex,
      pitches: [],
    };
  }

  private rowFrom(attempt: AscentAttempt): AttemptRow {
    return {
      id: attempt.id,
      boulderProblemId: signal(attempt.boulderProblemId ?? null),
      problemName: signal(attempt.routeName ?? null),
      userRawInput: signal(attempt.userRawInput ?? null),
      isSuccess: signal(attempt.isSuccess),
      ascentStyle: signal(attempt.ascentStyle ?? null),
      attemptCount: signal(attempt.attemptCount ?? null),
      saveToCatalog: signal(false),
      notes: signal(attempt.notes ?? null),
    };
  }

  private emptyRow(): AttemptRow {
    return {
      id: uuidV4(),
      boulderProblemId: signal<string | null>(null),
      problemName: signal<string | null>(null),
      userRawInput: signal<string | null>(null),
      isSuccess: signal(false),
      ascentStyle: signal<AscentAttempt.AscentStyleEnum | null>(null),
      attemptCount: signal<number | null>(null),
      saveToCatalog: signal(false),
      notes: signal<string | null>(null),
    };
  }
}
