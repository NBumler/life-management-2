import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonNote,
  IonTextarea,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { StretchExercise } from '../../../api/model/stretchExercise';
import { StretchSessionItem } from '../../../api/model/stretchSessionItem';
import { ActiveStretchDraft, ActiveStretchItemDraft, StretchDraftService } from '../../../core/data/stretch-draft.service';
import { StretchExerciseRepository } from '../../../core/data/stretch-exercise.repository';
import { StretchPlanRepository, liveStretchItems } from '../../../core/data/stretch-plan.repository';
import { StretchSessionRepository } from '../../../core/data/stretch-session.repository';
import { uuidV4 } from '../../../core/sync/uuid';
import { AlertTone } from '../../../shared/alert-tone';
import { today } from '../../../shared/local-date';
import { ScreenWakeLock } from '../../../shared/screen-wake-lock';
import { StretchPickerComponent } from '../../../shared/stretch-picker/stretch-picker.component';
import { STRETCH_MAX_DURATION_MINUTES } from './stretch-metrics';
import { StretchPhase, buildTimeline, completedItems, nextItemStart, previousItemStart } from './stretch-timeline';

const LOG_ROUTE = '/tabs/workout/log';
const TICK_MS = 250;

/** `HH:mm` of a wall-clock instant, the session's start / end time format. */
function clockOf(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * documentation/Subfeatures/Nyújtás.md "Élő, vezetett nézet" (backlog/169) — route `log/stretch/active`
 * (`?stretchPlanId=` from a template, `?workoutSessionId=` after a strength session — backlog/170; no
 * param = ad-hoc). Steps through `stretch-timeline.ts` phases on a wall-clock countdown (a phase ends at
 * `phaseEndsAtMs`, so a backgrounded app never drifts), beeps + buzzes at every phase change, keeps the
 * screen on, and parks its state in `StretchDraftService` on every phase change / pause — an app kill
 * resumes it paused. "Befejezés" opens a summary (editable duration, notes) and saves the session.
 */
@Component({
  selector: 'app-active-stretch',
  templateUrl: 'active-stretch.page.html',
  styleUrls: ['active-stretch.page.scss'],
  imports: [
    StretchPickerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonNote,
    IonModal,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveStretchPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  // backlog/148: leave with navigateBack so this page is popped off the Ionic stack.
  private readonly navController = inject(NavController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly draftService = inject(StretchDraftService);
  private readonly sessionRepository = inject(StretchSessionRepository);
  private readonly planRepository = inject(StretchPlanRepository);
  private readonly exerciseRepository = inject(StretchExerciseRepository);

  private readonly alertTone = new AlertTone();
  private readonly wakeLock = new ScreenWakeLock();
  private tickHandle: ReturnType<typeof setInterval> | undefined;

  private sessionId = '';
  private startedAtMs = 0;
  private date = today();
  private stretchPlanId: string | null = null;
  private workoutSessionId: string | null = null;
  /** Wall-clock end of the running phase; null while paused / not started. */
  private phaseEndsAtMs: number | null = null;

  readonly items = signal<ActiveStretchItemDraft[]>([]);
  readonly phaseIndex = signal(0);
  readonly remainingSeconds = signal(0);
  readonly running = signal(false);
  readonly skippedItems = signal<ReadonlySet<number>>(new Set());
  readonly pickerOpen = signal(false);
  /** The finish summary is showing (the timer is stopped). */
  readonly summary = signal(false);
  readonly durationMinutes = signal(1);
  readonly notes = signal('');
  readonly maxDuration = STRETCH_MAX_DURATION_MINUTES;

  readonly timeline = computed<StretchPhase[]>(() => buildTimeline(this.items()));
  readonly phase = computed<StretchPhase | null>(() => this.timeline()[this.phaseIndex()] ?? null);
  readonly currentItem = computed<ActiveStretchItemDraft | null>(() => {
    const phase = this.phase();
    return phase === null ? null : (this.items()[phase.itemIndex] ?? null);
  });
  readonly nextItem = computed<ActiveStretchItemDraft | null>(() => {
    const phase = this.phase();
    return phase === null ? null : (this.items()[phase.itemIndex + 1] ?? null);
  });
  readonly finishedAll = computed(() => this.items().length > 0 && this.phaseIndex() >= this.timeline().length);
  readonly countdownLabel = computed(() => {
    const total = Math.max(0, Math.ceil(this.remainingSeconds()));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.draftService.refresh(), this.planRepository.load(), this.exerciseRepository.load()]);
    const draft = this.draftService.draft();
    if (draft !== null) {
      this.restore(draft);
    } else {
      this.startFresh();
    }
    void this.wakeLock.acquire();
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  ngOnDestroy(): void {
    if (this.tickHandle !== undefined) {
      clearInterval(this.tickHandle);
    }
    this.alertTone.dispose();
    void this.wakeLock.release();
  }

  // ---- start / restore ------------------------------------------------------------------------

  private startFresh(): void {
    const params = this.route.snapshot.queryParamMap;
    this.sessionId = uuidV4();
    this.startedAtMs = Date.now();
    this.date = today();
    this.stretchPlanId = params.get('stretchPlanId');
    this.workoutSessionId = params.get('workoutSessionId');
    const plan = this.stretchPlanId === null ? undefined : this.planRepository.byId(this.stretchPlanId);
    if (plan === undefined) {
      this.stretchPlanId = null;
    }
    const items: ActiveStretchItemDraft[] = plan
      ? liveStretchItems(plan).map((item) => ({
          id: uuidV4(),
          stretchExerciseId: item.stretchExerciseId,
          stretchName: item.stretchName,
          stretchCategory: item.stretchCategory as StretchSessionItem.StretchCategoryEnum,
          holdSeconds: item.holdSeconds,
          perSide: item.perSide,
          repetitions: item.repetitions,
          hint: item.notes || this.descriptionOf(item.stretchExerciseId),
        }))
      : [];
    this.items.set(items);
    this.phaseIndex.set(0);
    if (items.length > 0) {
      this.startPhase(0);
    } else {
      this.persist();
    }
  }

  /** An app kill / navigation away parks the session — it always comes back paused. */
  private restore(draft: ActiveStretchDraft): void {
    this.sessionId = draft.sessionId;
    this.startedAtMs = draft.startedAtMs;
    this.date = draft.date;
    this.stretchPlanId = draft.stretchPlanId;
    this.workoutSessionId = draft.workoutSessionId;
    this.items.set(draft.items);
    this.skippedItems.set(new Set(draft.skippedItems));
    this.phaseIndex.set(draft.phaseIndex);
    this.remainingSeconds.set(draft.phaseRemainingSeconds);
    this.phaseEndsAtMs = null;
    this.running.set(false);
  }

  private descriptionOf(stretchExerciseId: string | null): string | null {
    if (stretchExerciseId === null) {
      return null;
    }
    return this.exerciseRepository.items().find((exercise) => exercise.id === stretchExerciseId)?.description ?? null;
  }

  // ---- timer ----------------------------------------------------------------------------------

  /** Starts phase `index` running from its full length (or finishes when past the end). */
  private startPhase(index: number): void {
    const timeline = this.timeline();
    this.phaseIndex.set(index);
    if (index >= timeline.length) {
      this.running.set(false);
      this.phaseEndsAtMs = null;
      this.remainingSeconds.set(0);
      this.persist();
      return;
    }
    const seconds = timeline[index].seconds;
    this.remainingSeconds.set(seconds);
    this.phaseEndsAtMs = Date.now() + seconds * 1000;
    this.running.set(true);
    this.persist();
  }

  /** Wall-clock driven: catches up over every phase that ended while the app was in the background. */
  tick(now = Date.now()): void {
    if (!this.running() || this.phaseEndsAtMs === null) {
      return;
    }
    let changed = false;
    while (this.phaseEndsAtMs !== null && now >= this.phaseEndsAtMs) {
      const timeline = this.timeline();
      const next = this.phaseIndex() + 1;
      changed = true;
      if (next >= timeline.length) {
        this.phaseIndex.set(next);
        this.phaseEndsAtMs = null;
        this.running.set(false);
        this.remainingSeconds.set(0);
        break;
      }
      this.phaseIndex.set(next);
      this.phaseEndsAtMs += timeline[next].seconds * 1000;
    }
    if (this.phaseEndsAtMs !== null) {
      this.remainingSeconds.set((this.phaseEndsAtMs - now) / 1000);
    }
    if (changed) {
      this.alertTone.fire();
      this.persist();
    }
  }

  togglePause(): void {
    if (this.running()) {
      this.remainingSeconds.set(Math.max(0, ((this.phaseEndsAtMs ?? Date.now()) - Date.now()) / 1000));
      this.phaseEndsAtMs = null;
      this.running.set(false);
      this.persist();
      return;
    }
    if (this.phaseIndex() >= this.timeline().length) {
      return;
    }
    const remaining = this.remainingSeconds() > 0 ? this.remainingSeconds() : (this.phase()?.seconds ?? 0);
    this.remainingSeconds.set(remaining);
    this.phaseEndsAtMs = Date.now() + remaining * 1000;
    this.running.set(true);
    this.persist();
  }

  /** "Kihagyás" — the current stretch is not done; on to the next one. */
  skip(): void {
    const phase = this.phase();
    if (phase === null) {
      return;
    }
    this.skippedItems.update((set) => new Set([...set, phase.itemIndex]));
    this.startPhase(nextItemStart(this.timeline(), this.phaseIndex()));
  }

  /** "Vissza" — restart this stretch, or (already at its start) the previous one. */
  back(): void {
    const target = previousItemStart(this.timeline(), this.phaseIndex());
    const itemIndex = this.timeline()[target]?.itemIndex;
    if (itemIndex !== undefined) {
      this.skippedItems.update((set) => new Set([...set].filter((index) => index < itemIndex)));
    }
    this.startPhase(target);
  }

  // ---- ad-hoc ---------------------------------------------------------------------------------

  onPicked(stretches: StretchExercise[]): void {
    this.pickerOpen.set(false);
    const wasDone = this.phaseIndex() >= this.timeline().length;
    this.items.update((items) => [
      ...items,
      ...stretches.map((stretch) => ({
        id: uuidV4(),
        stretchExerciseId: stretch.id,
        stretchName: stretch.name,
        stretchCategory: stretch.category as StretchSessionItem.StretchCategoryEnum,
        holdSeconds: stretch.defaultHoldSeconds,
        perSide: stretch.defaultPerSide,
        repetitions: 1,
        hint: stretch.description ?? null,
      })),
    ]);
    if (wasDone) {
      // an empty ad-hoc list (or one that had run out) carries on with the newly added stretches
      this.startPhase(this.phaseIndex());
      return;
    }
    this.persist();
  }

  // ---- finish ---------------------------------------------------------------------------------

  openSummary(): void {
    if (this.running()) {
      this.togglePause();
    }
    const elapsedMinutes = Math.ceil((Date.now() - this.startedAtMs) / 60000);
    this.durationMinutes.set(Math.min(STRETCH_MAX_DURATION_MINUTES, Math.max(1, elapsedMinutes)));
    this.summary.set(true);
  }

  closeSummary(): void {
    this.summary.set(false);
  }

  setDuration(raw: unknown): void {
    const value = Math.round(Number(raw));
    this.durationMinutes.set(Number.isFinite(value) ? value : 0);
  }

  readonly durationValid = computed(() => this.durationMinutes() >= 1 && this.durationMinutes() <= STRETCH_MAX_DURATION_MINUTES);

  async save(): Promise<void> {
    if (!this.durationValid()) {
      return;
    }
    const items = this.items();
    const done = completedItems(this.timeline(), items.length, this.phaseIndex(), this.skippedItems());
    await this.sessionRepository.save({
      id: this.sessionId,
      date: this.date,
      startTime: clockOf(this.startedAtMs),
      endTime: clockOf(Date.now()),
      durationMinutes: this.durationMinutes(),
      stretchPlanId: this.stretchPlanId,
      workoutSessionId: this.workoutSessionId,
      notes: this.notes().trim() ? this.notes().trim() : null,
      items: items.map((item, orderIndex) => ({
        id: item.id,
        stretchExerciseId: item.stretchExerciseId,
        stretchName: item.stretchName,
        stretchCategory: item.stretchCategory,
        orderIndex,
        holdSeconds: item.holdSeconds,
        perSide: item.perSide,
        repetitions: item.repetitions,
        completed: done[orderIndex],
      })),
    });
    await this.draftService.clear();
    await this.navController.navigateBack(LOG_ROUTE);
  }

  async discard(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.STRETCH_SESSION.DISCARD_TITLE'),
      message: this.translate.instant('WORKOUT.STRETCH_SESSION.DISCARD_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('WORKOUT.STRETCH_SESSION.DISCARD'),
          role: 'destructive',
          handler: () => void this.discardAndLeave(),
        },
      ],
    });
    await alert.present();
  }

  private async discardAndLeave(): Promise<void> {
    await this.draftService.clear();
    await this.navController.navigateBack(LOG_ROUTE);
  }

  private persist(): void {
    void this.draftService.write({
      sessionId: this.sessionId,
      startedAtMs: this.startedAtMs,
      date: this.date,
      stretchPlanId: this.stretchPlanId,
      workoutSessionId: this.workoutSessionId,
      items: this.items(),
      phaseIndex: this.phaseIndex(),
      phaseRemainingSeconds:
        this.phaseEndsAtMs !== null ? Math.max(0, (this.phaseEndsAtMs - Date.now()) / 1000) : this.remainingSeconds(),
      skippedItems: [...this.skippedItems()],
    });
  }
}
