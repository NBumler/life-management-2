import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ClimbingSession } from '../../../../api/model/climbingSession';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { climbingAttemptInput } from '../climbing-attempt-input';
import { climbingKcal, climbingVolume } from '../climbing-metrics';
import { CLIMBING_CONTEXTS, ClimbingContextKey } from '../climbing-contexts';

interface SessionCard {
  session: ClimbingSession;
  attemptCount: number;
  successCount: number;
  kcal: number;
  volume: number;
}

/**
 * documentation/Subfeatures/Indoor boulder napló.md "UI/UX: Lista" — the per-context session list
 * (M4 wires the Indoor Boulder tile only). Route `data.contextKey` selects which of the 4 dashboard
 * contexts this instance shows; newest first, each card with attempt / success counts and the live
 * kcal + volume preview. A single "Új session" CTA opens the create form; a header button jumps to
 * the venue admin.
 */
@Component({
  selector: 'app-climbing-session-list',
  templateUrl: 'climbing-session-list.page.html',
  imports: [
    RouterLink,
    DecimalPipe,
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
    IonLabel,
    IonNote,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimbingSessionListPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ClimbingSessionRepository);
  private readonly profileRepository = inject(ProfileRepository);

  readonly context =
    CLIMBING_CONTEXTS.find((c) => c.key === (this.route.snapshot.data['contextKey'] as ClimbingContextKey)) ??
    CLIMBING_CONTEXTS[0];

  readonly cards = computed<SessionCard[]>(() => {
    const bodyWeight = this.profileRepository.profile()?.currentWeightKg ?? null;
    return this.repository
      .forContext(this.context.locationType, this.context.discipline)
      .map((session) => {
        const attempts = session.attempts.filter((a) => !a.deleted);
        // Shared adapter so the card's kcal / volume preview matches the edit form, the stats screen
        // and the Étkezés dashboard total — including multi-pitch pitch-length sums.
        const metricAttempts = attempts.map(climbingAttemptInput);
        return {
          session,
          attemptCount: attempts.length,
          successCount: attempts.filter((a) => a.isSuccess).length,
          kcal: climbingKcal(
            {
              discipline: this.context.discipline,
              totalSessionDurationMinutes: session.totalSessionDurationMinutes ?? null,
              pumpRating: session.pumpRating ?? null,
              attempts: metricAttempts,
            },
            bodyWeight,
          ),
          volume: climbingVolume({ discipline: this.context.discipline, attempts: metricAttempts }),
        };
      });
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.cards().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load()]);
  }
}
