import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { VolleyballLog } from '../../../api/model/volleyballLog';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { VolleyballLogRepository } from '../../../core/data/volleyball-log.repository';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { volleyballKcal } from './volleyball-metrics';

interface VolleyballCard {
  log: VolleyballLog;
  kcal: number;
}

/**
 * documentation/Features/Röplabda napló.md "UI/UX: Lista" — the Röplabda napló segment. Time-ordered
 * session cards (newest first: date, on-court duration, optional intensity / sets, conservative kcal).
 * A single "Új röplabda" CTA opens the create form.
 */
@Component({
  selector: 'app-volleyball-log-list',
  templateUrl: 'volleyball-log-list.page.html',
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
export class VolleyballLogListPage implements OnInit {
  private readonly repository = inject(VolleyballLogRepository);
  private readonly profileRepository = inject(ProfileRepository);

  readonly cards = computed<VolleyballCard[]>(() => {
    const bodyWeight = this.profileRepository.profile()?.currentWeightKg ?? null;
    return this.repository
      .items()
      .filter((log) => !log.deleted)
      .map((log) => ({ log, kcal: volleyballKcal(log, bodyWeight) }));
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.cards().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load()]);
  }

  intensityLabelKey(log: VolleyballLog): string | null {
    return log.intensity ? `WORKOUT.VOLLEYBALL.INTENSITY.${log.intensity}` : null;
  }
}
