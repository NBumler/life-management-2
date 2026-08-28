import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, ViewWillEnter } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WorkoutSession } from '../../../api/model/workoutSession';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutDraftService } from '../../../core/data/workout-draft.service';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { effectiveDurationMinutes, liveExercises, sessionKcal } from './workout-metrics';

interface SessionCard {
  session: WorkoutSession;
  durationMinutes: number;
  kcal: number;
  exerciseCount: number;
}

/**
 * documentation/Subfeatures/Edzésnapló.md "UI/UX: Lista" — the Edzés tab's default segment.
 * Time-ordered session cards (newest first) with date, title-or-type, duration and the utility kcal
 * figure. CTAs start the live Active Workout View (fresh, or "Ugyanaz mint legutóbb" via `?copyFrom`);
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
    WorkoutSegmentHeaderComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutLogListPage implements OnInit, ViewWillEnter {
  private readonly repository = inject(WorkoutSessionRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly draftService = inject(WorkoutDraftService);

  readonly hasDraft = this.draftService.hasDraft;

  readonly cards = computed<SessionCard[]>(() => {
    const bodyWeight = this.profileRepository.profile()?.currentWeightKg ?? null;
    return this.repository
      .items()
      .filter((session) => !session.deleted)
      .map((session) => ({
        session,
        durationMinutes: effectiveDurationMinutes(session),
        kcal: sessionKcal(session, bodyWeight),
        exerciseCount: liveExercises(session).length,
      }));
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.cards().length === 0);
  readonly mostRecentId = computed(() => this.cards()[0]?.session.id ?? null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load(), this.draftService.refresh()]);
  }

  /** A finished/discarded live session lands back here without re-running ngOnInit — re-check the draft. */
  ionViewWillEnter(): void {
    void this.draftService.refresh();
  }
}
