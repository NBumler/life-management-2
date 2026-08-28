import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WorkoutSession } from '../../../api/model/workoutSession';
import { ProfileRepository } from '../../../core/data/profile.repository';
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
 * documentation/Subfeatures/Edzésnapló.md "UI/UX: Lista" — the Edzés tab's default segment, now the
 * real dashboard (was an A0 placeholder). Time-ordered session cards (newest first) with date,
 * title-or-type, duration and the utility kcal figure; CTAs for a fresh session and "Ugyanaz mint
 * legutóbb". The live Active Workout View is a separate screen in the next slice.
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
export class WorkoutLogListPage implements OnInit {
  private readonly repository = inject(WorkoutSessionRepository);
  private readonly profileRepository = inject(ProfileRepository);

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
    await Promise.all([this.repository.load(), this.profileRepository.load()]);
  }
}
