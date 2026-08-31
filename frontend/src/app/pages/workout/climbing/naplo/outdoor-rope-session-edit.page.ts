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
import { PitchLog } from '../../../../api/model/pitchLog';
import { Route } from '../../../../api/model/route';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { CragRepository } from '../../../../core/data/crag.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { RouteRepository } from '../../../../core/data/route.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { AscentAttemptSaveItem, ClimbingSessionDraft, PitchLogSaveItem } from '../../../../core/storage/storage-backend';
import { uuidV4 } from '../../../../core/sync/uuid';
import { parseGrade } from '../../../../shared/climbing/grade-scale';
import { GradeInputComponent } from '../../../../shared/grade-input/grade-input.component';
import { today } from '../../../../shared/local-date';
import { climbingKcal, climbingVolume } from '../climbing-metrics';

/** One editable pitch row inside a multi-pitch attempt (mutable signals). */
interface PitchRow {
  id: string;
  isLead: WritableSignal<boolean>;
  rawGrade: WritableSignal<string | null>;
  lengthInMeters: WritableSignal<number | null>;
}

/** One editable ascent-attempt row (mutable signals, mirrors the indoor-rope edit page's AttemptRow). */
interface AttemptRow {
  id: string;
  routeId: WritableSignal<string | null>;
  routeName: WritableSignal<string | null>;
  userRawInput: WritableSignal<string | null>;
  lengthInMeters: WritableSignal<number | null>;
  safetyStyle: WritableSignal<AscentAttempt.SafetyStyleEnum>;
  isSuccess: WritableSignal<boolean>;
  ascentStyle: WritableSignal<AscentAttempt.AscentStyleEnum | null>;
  failurePoint: WritableSignal<string | null>;
  attemptCount: WritableSignal<number | null>;
  /** Ad-hoc routes only — write this row's name + grade to the sector's Route catalog on save. */
  saveToCatalog: WritableSignal<boolean>;
  pitches: WritableSignal<PitchRow[]>;
  notes: WritableSignal<string | null>;
}

const ASCENT_STYLES: readonly AscentAttempt.AscentStyleEnum[] = [
  AscentAttempt.AscentStyleEnum.Onsight,
  AscentAttempt.AscentStyleEnum.Flash,
  AscentAttempt.AscentStyleEnum.Redpoint,
];

/**
 * documentation/Subfeatures/Outdoor köteles napló.md — outdoor rope offers the full {TOPROPE, LEAD,
 * TRAD} set (TRAD adds ~6 kg of hardware to the active-kcal branch, handled by `climbing-metrics`).
 */
const OUTDOOR_SAFETY_STYLES: readonly AscentAttempt.SafetyStyleEnum[] = [
  AscentAttempt.SafetyStyleEnum.Toprope,
  AscentAttempt.SafetyStyleEnum.Lead,
  AscentAttempt.SafetyStyleEnum.Trad,
];

const DEFAULT_SAFETY_STYLE = AscentAttempt.SafetyStyleEnum.Lead;

/** documentation/Features/Mászónapló.md — outdoor `weatherConditions` enum, session-level, that day's. */
const WEATHER_CONDITIONS: readonly ClimbingSession.WeatherConditionsEnum[] = [
  ClimbingSession.WeatherConditionsEnum.ColdDry,
  ClimbingSession.WeatherConditionsEnum.HotHumid,
  ClimbingSession.WeatherConditionsEnum.Windy,
  ClimbingSession.WeatherConditionsEnum.Wet,
];

/**
 * documentation/Subfeatures/Outdoor köteles napló.md — the OUTDOOR + ROPE kontextus-napló create/edit
 * form (`id` route param is an existing session's uuid or `new`). Combines the outdoor boulder
 * napló's crag + sector location picker (snapshot names, session-level `rockType` / `aspect`,
 * `weatherConditions` chip, optional master `Route` OR an ad-hoc name with "save to catalog") with
 * the indoor rope napló's grade parser, `TOPROPE | LEAD | TRAD` safety chip, `lengthInMeters` and
 * `failurePoint` on a miss. New here: an optional per-attempt `PitchLog` editor (`isLead = false`
 * marks a following climber → active MET ×0.8 in the kcal). Duration fallback is attempts × 15 min.
 */
@Component({
  selector: 'app-outdoor-rope-session-edit',
  templateUrl: 'outdoor-rope-session-edit.page.html',
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
export class OutdoorRopeSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ClimbingSessionRepository);
  private readonly cragRepository = inject(CragRepository);
  private readonly sectorRepository = inject(SectorRepository);
  private readonly routeRepository = inject(RouteRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly ascentStyles = ASCENT_STYLES;
  readonly safetyStyles = OUTDOOR_SAFETY_STYLES;
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
  /** Bumped on every attempt- / pitch-row field change so the kcal / volume preview recomputes. */
  private readonly attemptsRevision = signal(0);

  /** Live crags (documentation/Subfeatures/Outdoor boulder admin.md — the root of the location tree). */
  readonly crags = computed(() => this.cragRepository.items().filter((crag) => !crag.deleted));

  private readonly selectedCrag = computed(() => this.crags().find((crag) => crag.id === this.cragIdValue()));

  readonly sectorsForCrag = computed(() => {
    const cragId = this.cragIdValue();
    return cragId ? this.sectorRepository.forCrag(cragId) : [];
  });

  readonly routesForSector = computed<Route[]>(() => {
    const sectorId = this.sectorIdValue();
    return sectorId ? this.routeRepository.forSector(sectorId) : [];
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
      this.routeRepository.load(),
      this.profileRepository.load(),
    ]);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/climbing/outdoor-rope');
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

    // A fresh session prefills the most recently used crag + sector (documentation/Subfeatures/Outdoor köteles napló.md).
    const last = this.repository
      .forContext(ClimbingSession.LocationTypeEnum.Outdoor, ClimbingSession.DisciplineEnum.Rope)
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

  routeById(id: string | null): Route | undefined {
    return id ? this.routesForSector().find((route) => route.id === id) : undefined;
  }

  onCragChange(cragId: string): void {
    this.form.patchValue({ sectorId: '', aspect: null });
    this.applyCragDefaults(cragId);
  }

  onSectorChange(sectorId: string): void {
    this.applySectorDefaults(sectorId);
  }

  /** rockType is a session-level field, defaulted from the crag (overridable — Outdoor köteles napló.md). */
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
    if (row.isSuccess()) {
      row.failurePoint.set(null);
    } else {
      row.ascentStyle.set(null);
    }
    this.touchAttempts();
  }

  toggleSaveToCatalog(row: AttemptRow): void {
    row.saveToCatalog.update((value) => !value);
  }

  setSafetyStyle(row: AttemptRow, style: AscentAttempt.SafetyStyleEnum): void {
    row.safetyStyle.set(style);
    this.touchAttempts();
  }

  /**
   * documentation/Subfeatures/Outdoor köteles napló.md inheritance order — a picked `Route` snapshots
   * its name + grade, prefills the length, and its own `rockType` / `aspect` (when set) win at
   * session level over the Sector / Crag defaults.
   */
  pickRoute(row: AttemptRow, routeId: string | null): void {
    row.routeId.set(routeId);
    const route = this.routeById(routeId);
    if (route) {
      row.routeName.set(route.name);
      if (!row.userRawInput()?.trim()) {
        row.userRawInput.set(route.guidebookGrade);
      }
      if (route.lengthInMeters != null && row.lengthInMeters() == null) {
        row.lengthInMeters.set(route.lengthInMeters);
      }
      if (route.rockType) {
        this.form.patchValue({ rockType: route.rockType });
      }
      if (route.aspect) {
        this.form.patchValue({ aspect: route.aspect });
      }
      row.saveToCatalog.set(false);
    }
    this.touchAttempts();
  }

  addPitch(row: AttemptRow): void {
    row.pitches.update((list) => [...list, this.emptyPitch()]);
    this.touchAttempts();
  }

  removePitch(row: AttemptRow, pitch: PitchRow): void {
    row.pitches.update((list) => list.filter((entry) => entry.id !== pitch.id));
    this.touchAttempts();
  }

  togglePitchLead(pitch: PitchRow): void {
    pitch.isLead.update((value) => !value);
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
    await this.persistNewCatalogRoutes();
    const saved = await this.repository.save(this.buildDraft());
    this.sessionId.set(saved.id);
    await this.router.navigateByUrl('/tabs/workout/climbing/outdoor-rope');
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
    await this.router.navigateByUrl('/tabs/workout/climbing/outdoor-rope');
  }

  /**
   * documentation/Subfeatures/Outdoor köteles napló.md "ad-hoc (+ `saveToCatalog`)" — an ad-hoc row
   * flagged for the catalog becomes a `Route` master under the selected sector; the new id is written
   * back onto the row so `buildDraft()` links to it. No sector → nothing to attach to.
   */
  private async persistNewCatalogRoutes(): Promise<void> {
    const sectorId = this.form.getRawValue().sectorId;
    if (!sectorId) {
      return;
    }
    for (const row of this.attempts()) {
      if (!row.saveToCatalog() || row.routeId()) {
        continue;
      }
      const name = row.routeName()?.trim();
      const grade = row.userRawInput()?.trim();
      if (!name || !grade) {
        continue;
      }
      const created = await this.routeRepository.save({
        sectorId,
        name,
        guidebookGrade: grade,
        lengthInMeters: row.lengthInMeters() ?? null,
        totalPitches: row.pitches().length > 0 ? row.pitches().length : null,
        rockType: null,
        aspect: null,
      });
      row.routeId.set(created.id);
      row.saveToCatalog.set(false);
    }
  }

  /** The rope kcal / volume model needs success + grade index + safety style + climbed length / pitches per attempt. */
  private metricAttempts(): {
    isSuccess: boolean;
    absoluteDifficultyIndex: number | null;
    safetyStyle: AscentAttempt.SafetyStyleEnum;
    lengthInMeters: number | null;
    pitches: { isLead: boolean; lengthInMeters: number | null }[] | null;
  }[] {
    return this.attempts().map((row) => {
      const pitches = row.pitches();
      return {
        isSuccess: row.isSuccess(),
        absoluteDifficultyIndex: this.resolveIndex(row),
        safetyStyle: row.safetyStyle(),
        lengthInMeters: this.resolveLength(row),
        pitches:
          pitches.length > 0
            ? pitches.map((pitch) => ({ isLead: pitch.isLead(), lengthInMeters: pitch.lengthInMeters() }))
            : null,
      };
    });
  }

  /** A typed free-text grade wins; otherwise the picked route's guidebook grade; otherwise unresolved. */
  private resolveIndex(row: AttemptRow): number | null {
    const raw = row.userRawInput()?.trim();
    if (raw) {
      const parsed = parseGrade(raw, 'ROPE');
      if (parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null) {
        return parsed.absoluteDifficultyIndex;
      }
    }
    const route = this.routeById(row.routeId());
    if (route) {
      const parsed = parseGrade(route.guidebookGrade, 'ROPE');
      if (parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null) {
        return parsed.absoluteDifficultyIndex;
      }
    }
    return null;
  }

  private resolvePitchIndex(pitch: PitchRow): number | null {
    const raw = pitch.rawGrade()?.trim();
    if (!raw) {
      return null;
    }
    const parsed = parseGrade(raw, 'ROPE');
    return parsed.status === 'VALID' && parsed.absoluteDifficultyIndex !== null ? parsed.absoluteDifficultyIndex : null;
  }

  /** The attempt length actually stored / used: the typed value, else the picked route's length. */
  private resolveLength(row: AttemptRow): number | null {
    const typed = row.lengthInMeters();
    if (typed != null && Number.isFinite(typed) && typed > 0) {
      return typed;
    }
    return this.routeById(row.routeId())?.lengthInMeters ?? null;
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
      discipline: ClimbingSession.DisciplineEnum.Rope,
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
    const route = this.routeById(row.routeId());
    return {
      id: row.id,
      isSuccess: row.isSuccess(),
      userRawInput: row.userRawInput()?.trim() || null,
      absoluteDifficultyIndex: this.resolveIndex(row),
      ascentStyle: row.isSuccess() ? row.ascentStyle() : null,
      safetyStyle: row.safetyStyle(),
      failurePoint: row.isSuccess() ? null : row.failurePoint()?.trim() || null,
      attemptCount: row.attemptCount(),
      colorBandId: null,
      colorName: null,
      hexColor: null,
      gradeRange: null,
      indoorRouteId: null,
      routeId: row.routeId(),
      boulderProblemId: null,
      routeName: row.routeName()?.trim() || route?.name || null,
      lengthInMeters: this.resolveLength(row),
      notes: row.notes()?.trim() ? row.notes()!.trim() : null,
      orderIndex,
      pitches: row.pitches().map((pitch, index) => this.pitchToSaveItem(pitch, index)),
    };
  }

  private pitchToSaveItem(pitch: PitchRow, index: number): PitchLogSaveItem {
    return {
      id: pitch.id,
      pitchNumber: index + 1,
      isLead: pitch.isLead(),
      rawGrade: pitch.rawGrade()?.trim() || null,
      absoluteDifficultyIndex: this.resolvePitchIndex(pitch),
      lengthInMeters: pitch.lengthInMeters(),
      orderIndex: index,
    };
  }

  private rowFrom(attempt: AscentAttempt): AttemptRow {
    return {
      id: attempt.id,
      routeId: signal(attempt.routeId ?? null),
      routeName: signal(attempt.routeName ?? null),
      userRawInput: signal(attempt.userRawInput ?? null),
      lengthInMeters: signal(attempt.lengthInMeters ?? null),
      safetyStyle: signal(attempt.safetyStyle ?? DEFAULT_SAFETY_STYLE),
      isSuccess: signal(attempt.isSuccess),
      ascentStyle: signal(attempt.ascentStyle ?? null),
      failurePoint: signal(attempt.failurePoint ?? null),
      attemptCount: signal(attempt.attemptCount ?? null),
      saveToCatalog: signal(false),
      pitches: signal(
        (attempt.pitches ?? [])
          .filter((pitch) => !pitch.deleted)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((pitch) => this.pitchRowFrom(pitch)),
      ),
      notes: signal(attempt.notes ?? null),
    };
  }

  private pitchRowFrom(pitch: PitchLog): PitchRow {
    return {
      id: pitch.id,
      isLead: signal(pitch.isLead),
      rawGrade: signal(pitch.rawGrade ?? null),
      lengthInMeters: signal(pitch.lengthInMeters ?? null),
    };
  }

  private emptyRow(): AttemptRow {
    return {
      id: uuidV4(),
      routeId: signal<string | null>(null),
      routeName: signal<string | null>(null),
      userRawInput: signal<string | null>(null),
      lengthInMeters: signal<number | null>(null),
      safetyStyle: signal<AscentAttempt.SafetyStyleEnum>(DEFAULT_SAFETY_STYLE),
      isSuccess: signal(false),
      ascentStyle: signal<AscentAttempt.AscentStyleEnum | null>(null),
      failurePoint: signal<string | null>(null),
      attemptCount: signal<number | null>(null),
      saveToCatalog: signal(false),
      pitches: signal<PitchRow[]>([]),
      notes: signal<string | null>(null),
    };
  }

  private emptyPitch(): PitchRow {
    return {
      id: uuidV4(),
      isLead: signal(true),
      rawGrade: signal<string | null>(null),
      lengthInMeters: signal<number | null>(null),
    };
  }
}
