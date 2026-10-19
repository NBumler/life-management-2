import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { RouterLink } from '@angular/router';
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { BIKE_LIVE_ROUTE, BIKE_LIVE_SUMMARY_ROUTE, BikeLiveSessionService, activeElapsedMs } from '../../../core/data/bike-live-session.service';
import { formatElapsed } from '../climbing/naplo/climbing-live-controller';

/**
 * backlog/150 — the "Biciklizés folyamatban" strip on the bike list and the Edzés tab's landing page
 * while a live ride exists (also after an app restart — it reads the persisted draft): state, distance
 * (Pontos) and active time; a tap opens the live screen, or the summary once the ride is finished. Native only
 * (`offlineCapable`) and only with `edzes.bicikli` on.
 */
@Component({
  selector: 'app-bike-live-banner',
  template: `
    @if (draft(); as d) {
      <ion-item class="live-banner" button detail="true" [routerLink]="route()" lines="none">
        <ion-icon slot="start" name="bicycle-outline" [color]="d.endedAtMs === null && d.pausedAtMs === null ? 'danger' : 'medium'" aria-hidden="true"></ion-icon>
        <ion-label>
          <h2>{{ stateKey() | translate }}</h2>
          @if (d.mode === 'ESTIMATED') {
            <p>{{ 'WORKOUT.BIKE.LIVE.MODE_ESTIMATED' | translate }}</p>
          } @else {
            <p>{{ live.distanceMeters() / 1000 | number: '1.2-2' }} {{ 'WORKOUT.BIKE.KM_SHORT' | translate }}</p>
          }
        </ion-label>
        <ion-note slot="end" class="live-banner__elapsed">{{ elapsed() }}</ion-note>
      </ion-item>
    }
  `,
  styles: [
    `
      .live-banner {
        --background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.12);
        margin: 8px;
        border-radius: 10px;
      }
      .live-banner__elapsed {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
    `,
  ],
  imports: [RouterLink, DecimalPipe, IonItem, IonIcon, IonLabel, IonNote, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BikeLiveBannerComponent implements OnInit, OnDestroy {
  readonly live = inject(BikeLiveSessionService);
  private readonly enabled = Capacitor.isNativePlatform() && inject(FeatureFlagsService).isEnabled('edzes.bicikli');

  readonly draft = computed(() => (this.enabled ? this.live.draft() : null));
  private readonly nowMs = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly route = computed(() => (this.draft()?.endedAtMs != null ? BIKE_LIVE_SUMMARY_ROUTE : BIKE_LIVE_ROUTE));

  readonly stateKey = computed(() => {
    const draft = this.draft();
    if (draft?.endedAtMs != null) {
      return 'WORKOUT.BIKE.LIVE.BANNER_FINISHED';
    }
    return draft?.pausedAtMs != null ? 'WORKOUT.BIKE.LIVE.BANNER_PAUSED' : 'WORKOUT.BIKE.LIVE.BANNER_RECORDING';
  });

  readonly elapsed = computed(() => {
    const draft = this.draft();
    return draft ? formatElapsed(activeElapsedMs(draft, this.nowMs())) : '';
  });

  ngOnInit(): void {
    if (!this.enabled) {
      return;
    }
    void this.live.refresh();
    this.timer = setInterval(() => this.nowMs.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
  }
}
