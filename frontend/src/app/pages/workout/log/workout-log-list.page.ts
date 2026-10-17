import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, ViewWillEnter } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { StretchSession } from '../../../api/model/stretchSession';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { StretchDraftService } from '../../../core/data/stretch-draft.service';
import { StretchOfferDismissalsService } from '../../../core/data/stretch-offer-dismissals.service';
import { StretchPlanRepository } from '../../../core/data/stretch-plan.repository';
import { StretchSessionRepository } from '../../../core/data/stretch-session.repository';
import { WorkoutDraftService } from '../../../core/data/workout-draft.service';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { CurrentDayService } from '../../../core/config/current-day.service';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { LoadWarningsBannerComponent } from '../load-warnings-banner.component';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { pendingLinkedStretches } from '../stretch/linked-stretch';
import { stretchKcal } from '../stretch/stretch-metrics';
import { PlanQuickStartComponent } from './plan-quick-start.component';
import { effectiveDurationMinutes, liveExercises, sessionKcal } from './workout-metrics';

interface SessionCard {
  type: 'STRENGTH';
  session: WorkoutSession;
  durationMinutes: number;
  kcal: number;
  exerciseCount: number;
}

/** backlog/169 — a logged stretching session, merged into the same time-ordered list. */
interface StretchCard {
  type: 'STRETCH';
  session: StretchSession;
  /** The template it was started from, or null (ad-hoc / deleted template). */
  planName: string | null;
  durationMinutes: number;
  kcal: number;
  stretchCount: number;
}

type LogCard = SessionCard | StretchCard;

/**
 * documentation/Subfeatures/Edzésnapló.md "UI/UX: Lista" — the Edzés tab's default segment.
 * Time-ordered session cards (newest first) with date, title-or-type, duration and the utility kcal
 * figure. CTAs start the live Active Workout View (fresh);
 * a secondary link opens the post-hoc editor for logging a past session. A "folytatás" banner shows
 * whenever a live draft is parked (`WorkoutDraftService`).
 */
@Component({
  selector: 'app-workout-log-list',
  templateUrl: 'workout-log-list.page.html',
  imports: [
    RouterLink,
    DecimalPipe,
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonIcon,
    WorkoutSegmentHeaderComponent,
    LoadWarningsBannerComponent,
    PlanQuickStartComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutLogListPage implements OnInit, ViewWillEnter {
  private readonly repository = inject(WorkoutSessionRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly draftService = inject(WorkoutDraftService);
  private readonly stretchDraftService = inject(StretchDraftService);
  private readonly stretchRepository = inject(StretchSessionRepository);
  private readonly stretchPlanRepository = inject(StretchPlanRepository);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly workoutPlanRepository = inject(WorkoutPlanRepository);
  private readonly dismissals = inject(StretchOfferDismissalsService);
  private readonly currentDay = inject(CurrentDayService);

  readonly hasDraft = this.draftService.hasDraft;
  readonly hasStretchDraft = this.stretchDraftService.hasDraft;
  /** backlog/169 — `edzes.nyujtas` off: no stretching rows and no stretching CTAs. */
  readonly stretchEnabled = this.featureFlags.isEnabled('edzes.nyujtas');

  readonly cards = computed<LogCard[]>(() => {
    const bodyWeight = this.profileRepository.profile()?.currentWeightKg ?? null;
    const strength: LogCard[] = this.repository
      .items()
      .filter((session) => !session.deleted)
      .map((session) => ({
        type: 'STRENGTH' as const,
        session,
        durationMinutes: effectiveDurationMinutes(session),
        kcal: sessionKcal(session, bodyWeight),
        exerciseCount: liveExercises(session).length,
      }));
    if (!this.stretchEnabled) {
      return strength;
    }
    const stretch: LogCard[] = this.stretchRepository
      .items()
      .filter((session) => !session.deleted)
      .map((session) => ({
        type: 'STRETCH' as const,
        session,
        planName: session.stretchPlanId ? (this.stretchPlanRepository.byId(session.stretchPlanId)?.name ?? null) : null,
        durationMinutes: session.durationMinutes,
        kcal: stretchKcal(session, bodyWeight),
        stretchCount: session.items.filter((item) => !item.deleted).length,
      }));
    // Newest day first; the sort is stable, so within a day each list keeps its own order.
    return [...strength, ...stretch].sort((a, b) => (a.session.date < b.session.date ? 1 : a.session.date > b.session.date ? -1 : 0));
  });

  /** backlog/170 — today's template workouts whose attached stretch is still to do ("Nyújtás indítása" cards). */
  readonly pendingStretches = computed(() =>
    this.stretchEnabled
      ? pendingLinkedStretches(
          this.currentDay.day(),
          this.repository.items(),
          this.workoutPlanRepository.items(),
          this.stretchPlanRepository.items(),
          this.stretchRepository.items(),
          this.dismissals.dismissed(),
        )
      : [],
  );

  dismissStretch(workoutSessionId: string): void {
    void this.dismissals.dismiss(workoutSessionId);
  }

  asStrength(card: LogCard): SessionCard | null {
    return card.type === 'STRENGTH' ? card : null;
  }

  asStretch(card: LogCard): StretchCard | null {
    return card.type === 'STRETCH' ? card : null;
  }

  trackCard(card: LogCard): string {
    return `${card.type}:${card.session.id}`;
  }

  readonly isEmpty = computed(() => this.repository.loaded() && this.cards().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.repository.load(),
      this.profileRepository.load(),
      this.draftService.refresh(),
      ...(this.stretchEnabled
        ? [
            this.stretchRepository.load(),
            this.stretchPlanRepository.load(),
            this.stretchDraftService.refresh(),
            this.workoutPlanRepository.load(),
            this.dismissals.refresh(),
          ]
        : []),
    ]);
  }

  /** A finished/discarded live session lands back here without re-running ngOnInit — re-check the draft. */
  ionViewWillEnter(): void {
    void this.draftService.refresh();
    if (this.stretchEnabled) {
      void this.stretchDraftService.refresh();
      void this.stretchRepository.reload();
    }
  }
}
