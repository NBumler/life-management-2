import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonTitle,
  IonToolbar,
  NavController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BIKE_LIVE_SUMMARY_ROUTE, BikeLiveSessionService, activeElapsedMs } from '../../../core/data/bike-live-session.service';
import { formatElapsed } from '../climbing/naplo/climbing-live-controller';

const LIST_ROUTE = '/tabs/workout/cycling';

/**
 * backlog/150 — the live (Pontos) ride screen on `cycling/live`: the active time (pauses excluded),
 * the distance recorded so far, a weak-signal hint, and Szünet / Folytatás / Befejezés / Elvetés.
 * "Befejezés" opens the editable summary (`cycling/live/summary`); a ride that is already finished
 * (e.g. reopened from the banner) goes straight there.
 */
@Component({
  selector: 'app-bike-live',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workout/cycling"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ 'WORKOUT.BIKE.LIVE.TITLE' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (live.draft()) {
        <div class="bike-live__state" [class.bike-live__state--paused]="live.paused()">
          <span class="bike-live__dot" aria-hidden="true"></span>
          {{ (live.paused() ? 'WORKOUT.BIKE.LIVE.PAUSED' : 'WORKOUT.BIKE.LIVE.RECORDING') | translate }}
        </div>

        <div class="bike-live__metric">
          <ion-note>{{ 'WORKOUT.BIKE.LIVE.ELAPSED' | translate }}</ion-note>
          <div class="bike-live__value bike-live__elapsed">{{ elapsed() }}</div>
        </div>
        <div class="bike-live__metric">
          <ion-note>{{ 'WORKOUT.BIKE.LIVE.DISTANCE' | translate }}</ion-note>
          <div class="bike-live__value bike-live__distance">
            {{ live.distanceMeters() / 1000 | number: '1.2-2' }} {{ 'WORKOUT.BIKE.KM_SHORT' | translate }}
          </div>
        </div>

        @if (live.weakSignal() && !live.paused()) {
          <ion-note color="warning" class="bike-live__weak">
            <ion-icon name="alert-circle" aria-hidden="true"></ion-icon>
            {{ 'WORKOUT.BIKE.LIVE.WEAK_SIGNAL' | translate }}
          </ion-note>
        }

        <div class="bike-live__actions">
          @if (live.paused()) {
            <ion-button expand="block" class="bike-live__resume" [disabled]="busy()" (click)="resume()">
              {{ 'WORKOUT.BIKE.LIVE.RESUME' | translate }}
            </ion-button>
          } @else {
            <ion-button expand="block" fill="outline" class="bike-live__pause" [disabled]="busy()" (click)="pause()">
              {{ 'WORKOUT.BIKE.LIVE.PAUSE' | translate }}
            </ion-button>
          }
          <ion-button expand="block" class="bike-live__finish" [disabled]="busy()" (click)="finish()">
            {{ 'WORKOUT.BIKE.LIVE.FINISH' | translate }}
          </ion-button>
          <ion-button expand="block" fill="clear" color="danger" class="bike-live__discard" [disabled]="busy()" (click)="discard()">
            {{ 'WORKOUT.BIKE.LIVE.DISCARD' | translate }}
          </ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .bike-live__state {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      .bike-live__dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--ion-color-danger);
      }
      .bike-live__state--paused .bike-live__dot {
        background: var(--ion-color-medium);
      }
      .bike-live__metric {
        margin-bottom: 16px;
      }
      .bike-live__value {
        font-size: 2.4rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .bike-live__weak {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 16px;
      }
      .bike-live__actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 24px;
      }
    `,
  ],
  imports: [
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonIcon,
    IonNote,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BikeLivePage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  readonly live = inject(BikeLiveSessionService);
  private readonly navController = inject(NavController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly busy = signal(false);
  private readonly nowMs = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly elapsed = computed(() => {
    const draft = this.live.draft();
    return draft ? formatElapsed(activeElapsedMs(draft, this.nowMs())) : '';
  });

  async ionViewWillEnter(): Promise<void> {
    this.startTimer();
    const draft = await this.live.refresh();
    if (draft === null) {
      await this.navController.navigateBack(LIST_ROUTE);
    } else if (draft.endedAtMs !== null) {
      await this.navController.navigateForward(BIKE_LIVE_SUMMARY_ROUTE, { replaceUrl: true });
    }
  }

  ionViewWillLeave(): void {
    this.stopTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  async pause(): Promise<void> {
    await this.run(() => this.live.pause());
  }

  async resume(): Promise<void> {
    await this.run(() => this.live.resume());
  }

  async finish(): Promise<void> {
    await this.run(() => this.live.finish());
    await this.navController.navigateForward(BIKE_LIVE_SUMMARY_ROUTE, { replaceUrl: true });
  }

  async discard(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.BIKE.LIVE.DISCARD_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.BIKE.LIVE.DISCARD_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('WORKOUT.BIKE.LIVE.DISCARD'),
          role: 'destructive',
          handler: () => void this.discardAndLeave(),
        },
      ],
    });
    await alert.present();
  }

  private async discardAndLeave(): Promise<void> {
    await this.run(() => this.live.clear());
    await this.navController.navigateBack(LIST_ROUTE);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } finally {
      this.busy.set(false);
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.nowMs.set(Date.now());
    this.timer = setInterval(() => this.nowMs.set(Date.now()), 1000);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
