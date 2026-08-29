import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BikeRideLogRepository } from '../../../core/data/bike-ride-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { bikeKcal } from './bike-metrics';

interface BikeCard {
  log: BikeRideLog;
  distanceKm: number | null;
  elevationGainMeters: number | null;
  kcal: number;
}

/**
 * documentation/Features/Biciklizés napló.md "UI/UX: Lista" — the Biciklizés napló segment.
 * Time-ordered ride cards (newest first: date, duration, intensity, optional distance / elevation,
 * utility kcal). A single "Új út" CTA opens the create form. Mirrors the Úszás napló list.
 */
@Component({
  selector: 'app-bike-ride-log-list',
  templateUrl: 'bike-ride-log-list.page.html',
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
export class BikeRideLogListPage implements OnInit {
  private readonly repository = inject(BikeRideLogRepository);
  private readonly profileRepository = inject(ProfileRepository);

  readonly cards = computed<BikeCard[]>(() => {
    const bodyWeight = this.profileRepository.profile()?.currentWeightKg ?? null;
    return this.repository
      .items()
      .filter((log) => !log.deleted)
      .map((log) => ({
        log,
        distanceKm: log.distanceKm ?? null,
        elevationGainMeters: log.elevationGainMeters ?? null,
        kcal: bikeKcal(log, bodyWeight),
      }));
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.cards().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load()]);
  }

  intensityLabelKey(log: BikeRideLog): string {
    return `WORKOUT.BIKE.INTENSITY.${log.intensity}`;
  }
}
