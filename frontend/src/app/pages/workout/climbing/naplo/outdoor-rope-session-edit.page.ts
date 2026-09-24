import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
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
import { Sector } from '../../../../api/model/sector';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { CragRepository } from '../../../../core/data/crag.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { RouteRepository } from '../../../../core/data/route.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { AscentAttemptSaveItem, ClimbingSessionDraft, PitchLogSaveItem } from '../../../../core/storage/storage-backend';
import { uuidV4 } from '../../../../core/sync/uuid';
import { parseGrade } from '../../../../shared/climbing/grade-scale';
import { safetyStyleForProtection } from '../../../../shared/climbing/protection-type';
import { GradeInputComponent } from '../../../../shared/grade-input/grade-input.component';
import { HelpButtonComponent } from '../../../../shared/help-button/help-button.component';
import { PartnerComboboxComponent } from '../../../../shared/partner-combobox/partner-combobox.component';
import { today } from '../../../../shared/local-date';
import { climbingKcal, climbingVolume } from '../climbing-metrics';
import { scrollToLastAttempt } from './scroll-to-last-attempt';

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
  /** backlog/084 — the sector, per attempt (one session can touch several); prefilled from the previous attempt. */
  sectorId: WritableSignal<string | null>;
  sectorName: WritableSignal<string | null>;
  routeId: WritableSignal<string | null>;
  routeName: WritableSignal<string | null>;
  userRawInput: WritableSignal<string | null>;
  /** `userRawInput` currently mirrors the picked route's grade (not hand-typed) → a route switch refills it. */
  gradeAutoFilled: WritableSignal<boolean>;
  lengthInMeters: WritableSignal<number | null>;
  /** `lengthInMeters` currently mirrors the picked route's length (not hand-typed) → a route switch refills it. */
  lengthAutoFilled: WritableSignal<boolean>;
  safetyStyle: WritableSignal<AscentAttempt.SafetyStyleEnum>;
  /** backlog/118 — `safetyStyle` is still the default / the picked route's suggestion (not hand-set) → a route pick may refill it. */
  safetyStyleAutoFilled: WritableSignal<boolean>;
  isSuccess: WritableSignal<boolean>;
  ascentStyle: WritableSignal<AscentAttempt.AscentStyleEnum | null>;
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
 * backlog/092 — styles that mean "never climbed this line before": onsight and flash. A prior
 * successful ascent contradicts both, so both get the non-blocking warning; redpoint is fine.
 */
const PRIOR_ASCENT_WARN_STYLES: ReadonlySet<AscentAttempt.AscentStyleEnum> = new Set([
  AscentAttempt.AscentStyleEnum.Onsight,
  AscentAttempt.AscentStyleEnum.Flash,
]);

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
 * form (`id` route param is an existing session's uuid or `new`). A session-level crag picker
 * (snapshot name) + `weatherConditions` chip; the **sector is chosen per attempt** (backlog/084 — one
 * session can touch several sectors), prefilled from the previous attempt. Each attempt takes an
 * optional master `Route` OR an ad-hoc name with "save to catalog", the indoor rope napló's grade
 * parser, a `TOPROPE | LEAD | TRAD` safety chip, `lengthInMeters`, a single free-text `notes` field
 * (on a miss it also holds the "where did you get stuck" note — backlog/077), and an optional
 * `PitchLog` editor (`isLead = false` marks a following climber → active MET ×0.8 in the kcal).
 * `rockType` / `aspect` are master-data properties (route / sector / crag) — not stored on the log.
 * Duration fallback is attempts × 15 min.
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
    HelpButtonComponent,
    PartnerComboboxComponent,
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
      .attempt-card > ion-item:first-child {
        --background: var(--ion-background-color-step-50, #f7f7f7);
        font-weight: 600;
      }
      .pitch-card {
        margin: 8px 8px 8px 20px;
        border: 1px solid var(--ion-background-color-step-150, #d7d8da);
        border-radius: 8px;
        overflow: hidden;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutdoorRopeSessionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
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

  /** backlog/084 — sector of the most recent prior session's last attempt; seeds the first new attempt row. */
  private lastUsedSectorId: string | null = null;
  private lastUsedSectorName: string | null = null;

  /** backlog/069 — picked partner names (own signal, not a form control); suggestions from the log. */
  readonly partners = signal<string[]>([]);
  readonly partnerSuggestions = this.repository.partnerSuggestions;

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    cragId: this.fb.nonNullable.control('', [Validators.required]),
    weatherConditions: this.fb.control<ClimbingSession.WeatherConditionsEnum | null>(null),
    totalSessionDurationMinutes: this.fb.control<number | null>(null, [Validators.min(1)]),
    pumpRating: this.fb.control<number | null>(null),
    headspaceRating: this.fb.control<number | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  private readonly cragIdValue = toSignal(this.form.controls.cragId.valueChanges, {
    initialValue: this.form.controls.cragId.value,
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

  /** Routes under the sector picked on this attempt row (backlog/084 — sector is per attempt). */
  routesForRow(row: AttemptRow): Route[] {
    const sectorId = row.sectorId();
    return sectorId ? this.routeRepository.forSector(sectorId) : [];
  }

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
        weatherConditions: existing.weatherConditions ?? null,
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
      return;
    }

    // A fresh session prefills the most recently used crag (documentation/Subfeatures/Outdoor köteles
    // napló.md); the sector is per attempt (backlog/084) and seeds from that session's last attempt.
    const last = this.repository
      .forContext(ClimbingSession.LocationTypeEnum.Outdoor, ClimbingSession.DisciplineEnum.Rope)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (last?.cragId) {
      this.form.patchValue({ cragId: last.cragId });
      const lastAttempt = [...(last.attempts ?? [])]
        .filter((attempt) => !attempt.deleted && attempt.sectorId)
        .sort((a, b) => b.orderIndex - a.orderIndex)[0];
      this.lastUsedSectorId = lastAttempt?.sectorId ?? null;
      this.lastUsedSectorName = lastAttempt?.sectorName ?? null;
    }
  }

  routeById(id: string | null): Route | undefined {
    return id ? this.routeRepository.items().find((route) => route.id === id && !route.deleted) : undefined;
  }

  /**
   * backlog/092 — date of a prior successful ascent of this row's linked route when the row is a
   * successful ONSIGHT / FLASH, else `null`. Drives a non-blocking inline warning; save stays
   * enabled.
   */
  priorAscentWarningDate(row: AttemptRow): string | null {
    const style = row.ascentStyle();
    if (!row.isSuccess() || style === null || !PRIOR_ASCENT_WARN_STYLES.has(style)) {
      return null;
    }
    return this.repository.priorSuccessfulAscentDate(row.routeId(), this.form.controls.date.value, this.sessionId());
  }

  /** Changing the crag invalidates every attempt's sector (sectors belong to the old crag). */
  onCragChange(): void {
    for (const row of this.attempts()) {
      row.sectorId.set(null);
      row.sectorName.set(null);
      row.routeId.set(null);
      row.saveToCatalog.set(false);
    }
    this.lastUsedSectorId = null;
    this.lastUsedSectorName = null;
    this.touchAttempts();
  }

  /** backlog/084 — a picked sector snapshots its name onto the row; a route no longer under it is cleared. */
  pickSector(row: AttemptRow, sectorId: string | null): void {
    row.sectorId.set(sectorId || null);
    const sector = this.sectorsForCrag().find((entry) => entry.id === sectorId);
    row.sectorName.set(sector?.name ?? null);
    if (row.routeId() && !this.routesForRow(row).some((route) => route.id === row.routeId())) {
      row.routeId.set(null);
    }
    // backlog/088 — with no route picked, the sector's default length prefills the row (until a manual edit).
    if (!row.routeId() && sector?.defaultLengthInMeters != null && (row.lengthInMeters() == null || row.lengthAutoFilled())) {
      row.lengthInMeters.set(sector.defaultLengthInMeters);
      row.lengthAutoFilled.set(true);
    }
    this.touchAttempts();
  }

  /** backlog/088 — the row's own sector (per attempt), for the length-inheritance fallback. */
  private sectorForRow(row: AttemptRow): Sector | undefined {
    return row.sectorId() ? this.sectorsForCrag().find((sector) => sector.id === row.sectorId()) : undefined;
  }

  addAttempt(): void {
    this.attempts.update((rows) => {
      const prev = rows[rows.length - 1];
      return [...rows, this.emptyRow(prev?.sectorId() ?? this.lastUsedSectorId, prev?.sectorName() ?? this.lastUsedSectorName)];
    });
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

  toggleSaveToCatalog(row: AttemptRow): void {
    row.saveToCatalog.update((value) => !value);
  }

  setSafetyStyle(row: AttemptRow, style: AscentAttempt.SafetyStyleEnum): void {
    if (style !== row.safetyStyle()) {
      row.safetyStyleAutoFilled.set(false);
    }
    row.safetyStyle.set(style);
    this.touchAttempts();
  }

  /**
   * documentation/Subfeatures/Outdoor köteles napló.md — a picked `Route` snapshots its name + grade
   * and prefills the length and — from its `protectionType` (backlog/118) — the attempt's `safetyStyle`
   * unless the user already set one by hand. `rockType` / `aspect` are no longer session fields (backlog/084) — they
   * stay on the route / sector / crag master data.
   */
  pickRoute(row: AttemptRow, routeId: string | null): void {
    row.routeId.set(routeId);
    const route = this.routeById(routeId);
    if (route) {
      row.routeName.set(route.name);
      // Refill grade / length from the newly picked route unless the user typed their own — switching
      // routes must not leave the previous route's grade / length (and its derived difficulty index)
      // behind. `*AutoFilled` tracks provenance; a manual edit clears it (onRawGradeInput / onLengthInput).
      if (!row.userRawInput()?.trim() || row.gradeAutoFilled()) {
        row.userRawInput.set(route.guidebookGrade);
        row.gradeAutoFilled.set(true);
      }
      // backlog/088 length inheritance: Route.lengthInMeters → Sector.defaultLengthInMeters.
      const inherited = route.lengthInMeters ?? this.sectorForRow(row)?.defaultLengthInMeters ?? null;
      if (inherited != null && (row.lengthInMeters() == null || row.lengthAutoFilled())) {
        row.lengthInMeters.set(inherited);
        row.lengthAutoFilled.set(true);
      }
      const suggested = safetyStyleForProtection(route.protectionType);
      if (suggested !== null && row.safetyStyleAutoFilled()) {
        row.safetyStyle.set(suggested);
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

  /** Manual grade edit → drop the "came from the route" flag so a later route switch won't overwrite it. */
  onRawGradeInput(row: AttemptRow, value: string): void {
    row.userRawInput.set(value);
    row.gradeAutoFilled.set(false);
    this.touchAttempts();
  }

  /** Manual length edit → same provenance reset as the grade. */
  onLengthInput(row: AttemptRow, raw: string): void {
    row.lengthInMeters.set(raw ? +raw : null);
    row.lengthAutoFilled.set(false);
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
   * flagged for the catalog becomes a `Route` master under **that row's** sector (backlog/084); the
   * new id is written back onto the row so `buildDraft()` links to it. No sector → nothing to attach to.
   */
  private async persistNewCatalogRoutes(): Promise<void> {
    for (const row of this.attempts()) {
      const sectorId = row.sectorId();
      if (!sectorId || !row.saveToCatalog() || row.routeId()) {
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
        topoNumber: null,
        protectionType: null,
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

  /**
   * The attempt length actually stored / used (backlog/088 inheritance order):
   * typed value → picked `Route.lengthInMeters` → the row's `Sector.defaultLengthInMeters`.
   */
  private resolveLength(row: AttemptRow): number | null {
    const typed = row.lengthInMeters();
    if (typed != null && Number.isFinite(typed) && typed > 0) {
      return typed;
    }
    return this.routeById(row.routeId())?.lengthInMeters ?? this.sectorForRow(row)?.defaultLengthInMeters ?? null;
  }

  private buildDraft(): ClimbingSessionDraft {
    const value = this.form.getRawValue();
    const crag = this.crags().find((entry) => entry.id === value.cragId);
    const partners = this.partners()
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
      attempts: this.attempts().map((row, index) => this.rowToSaveItem(row, index)),
    };
  }

  private rowToSaveItem(row: AttemptRow, orderIndex: number): AscentAttemptSaveItem {
    const route = this.routeById(row.routeId());
    const sectorId = row.sectorId();
    return {
      id: row.id,
      isSuccess: row.isSuccess(),
      userRawInput: row.userRawInput()?.trim() || null,
      absoluteDifficultyIndex: this.resolveIndex(row),
      ascentStyle: row.isSuccess() ? row.ascentStyle() : null,
      safetyStyle: row.safetyStyle(),
      attemptCount: row.attemptCount(),
      colorBandId: null,
      colorName: null,
      hexColor: null,
      gradeRange: null,
      indoorRouteId: null,
      routeId: row.routeId(),
      boulderProblemId: null,
      sectorId,
      sectorName: sectorId
        ? (this.sectorsForCrag().find((sector) => sector.id === sectorId)?.name ?? row.sectorName())
        : null,
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
    // Treat the stored grade / length as route- / sector-derived only if it still matches, so switching
    // route or sector refills it — but a value the user had hand-edited (no longer matching) is kept.
    const route = this.routeById(attempt.routeId ?? null);
    const sectorDefaultLength = attempt.sectorId
      ? (this.sectorRepository.items().find((s) => s.id === attempt.sectorId)?.defaultLengthInMeters ?? null)
      : null;
    const raw = attempt.userRawInput?.trim() ?? '';
    const storedLength = attempt.lengthInMeters ?? null;
    return {
      id: attempt.id,
      sectorId: signal(attempt.sectorId ?? null),
      sectorName: signal(attempt.sectorName ?? null),
      routeId: signal(attempt.routeId ?? null),
      routeName: signal(attempt.routeName ?? null),
      userRawInput: signal(attempt.userRawInput ?? null),
      gradeAutoFilled: signal(route != null && raw !== '' && raw === (route.guidebookGrade?.trim() ?? '')),
      lengthInMeters: signal(storedLength),
      lengthAutoFilled: signal(
        storedLength != null && (storedLength === route?.lengthInMeters || storedLength === sectorDefaultLength),
      ),
      safetyStyle: signal(attempt.safetyStyle ?? DEFAULT_SAFETY_STYLE),
      safetyStyleAutoFilled: signal(
        attempt.safetyStyle == null || attempt.safetyStyle === safetyStyleForProtection(route?.protectionType),
      ),
      isSuccess: signal(attempt.isSuccess),
      ascentStyle: signal(attempt.ascentStyle ?? null),
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

  private emptyRow(sectorId: string | null = null, sectorName: string | null = null): AttemptRow {
    return {
      id: uuidV4(),
      sectorId: signal<string | null>(sectorId),
      sectorName: signal<string | null>(sectorName),
      routeId: signal<string | null>(null),
      routeName: signal<string | null>(null),
      userRawInput: signal<string | null>(null),
      gradeAutoFilled: signal(false),
      lengthInMeters: signal<number | null>(null),
      lengthAutoFilled: signal(false),
      safetyStyle: signal<AscentAttempt.SafetyStyleEnum>(DEFAULT_SAFETY_STYLE),
      safetyStyleAutoFilled: signal(true),
      isSuccess: signal(false),
      ascentStyle: signal<AscentAttempt.AscentStyleEnum | null>(null),
      attemptCount: signal<number | null>(1),
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
