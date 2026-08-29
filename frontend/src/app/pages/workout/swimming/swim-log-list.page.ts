import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { SwimLog } from '../../../api/model/swimLog';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { SwimLogRepository } from '../../../core/data/swim-log.repository';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { swimDistanceMeters, swimKcal } from './swim-metrics';

interface SwimCard {
  log: SwimLog;
  distanceMeters: number | null;
  kcal: number;
}

/**
 * documentation/Features/Úszás napló.md "UI/UX: Lista" — the Úszás napló segment. Time-ordered swim
 * cards (newest first: date, duration, intensity, optional distance, utility kcal). A single "Új
 * úszás" CTA opens the create form.
 */
@Component({
  selector: 'app-swim-log-list',
  templateUrl: 'swim-log-list.page.html',
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
export class SwimLogListPage implements OnInit {
  private readonly repository = inject(SwimLogRepository);
  private readonly profileRepository = inject(ProfileRepository);

  readonly cards = computed<SwimCard[]>(() => {
    const bodyWeight = this.profileRepository.profile()?.currentWeightKg ?? null;
    return this.repository
      .items()
      .filter((log) => !log.deleted)
      .map((log) => ({
        log,
        distanceMeters: swimDistanceMeters(log),
        kcal: swimKcal(log, bodyWeight),
      }));
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.cards().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load()]);
  }

  intensityLabelKey(log: SwimLog): string {
    return `WORKOUT.SWIM.INTENSITY.${log.intensity}`;
  }
}
