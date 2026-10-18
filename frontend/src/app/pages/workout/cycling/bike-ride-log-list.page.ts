import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { AlertController, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, NavController } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BIKE_LIVE_ROUTE, BikeLiveSessionService } from '../../../core/data/bike-live-session.service';
import { BikeRideLogRepository } from '../../../core/data/bike-ride-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { BikeLiveBannerComponent } from './bike-live-banner.component';
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
 *
 * backlog/150 — native only (`offlineCapable`): "Élő edzés indítása" starts a live GPS ride (hidden
 * while one exists; the live banner links to it instead). The web build keeps only the manual log.
 */
@Component({
  selector: 'app-bike-ride-log-list',
  templateUrl: 'bike-ride-log-list.page.html',
  styles: [
    `
      .bike-live-start__hint {
        display: block;
        font-size: 0.85rem;
        margin: 0 4px 8px;
      }
    `,
  ],
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
    BikeLiveBannerComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BikeRideLogListPage implements OnInit {
  private readonly repository = inject(BikeRideLogRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly live = inject(BikeLiveSessionService);
  private readonly navController = inject(NavController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly offlineCapable = Capacitor.isNativePlatform();
  readonly hasLiveRide = this.live.hasDraft;
  readonly starting = signal(false);

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

  async startLive(): Promise<void> {
    this.starting.set(true);
    try {
      const result = await this.live.start();
      if (result.status === 'started') {
        await this.navController.navigateForward(BIKE_LIVE_ROUTE);
        return;
      }
      const alert = await this.alertController.create({
        header: this.translate.instant('WORKOUT.BIKE.LIVE.PERMISSION_DENIED_TITLE'),
        message: this.translate.instant('WORKOUT.BIKE.LIVE.PERMISSION_DENIED_MESSAGE'),
        buttons: [{ text: this.translate.instant('COMMON.OK'), role: 'cancel' }],
      });
      await alert.present();
    } finally {
      this.starting.set(false);
    }
  }

  intensityLabelKey(log: BikeRideLog): string {
    return `WORKOUT.BIKE.INTENSITY.${log.intensity}`;
  }
}
