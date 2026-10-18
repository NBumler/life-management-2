import { formatNumber } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, OnInit, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AlertController, IonButton, IonItem, IonLabel, IonList, IonRadio, IonRadioGroup, NavController } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BIKE_LIVE_ROUTE, BikeLiveMode, BikeLiveSessionService } from '../../../core/data/bike-live-session.service';
import {
  ENDPOINT_FIX_TIMEOUT_SECONDS,
  MAX_ACCEPTED_ACCURACY_METERS,
  MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH,
  ROAD_CIRCUITY_FACTOR,
} from '../../../core/geo/tracking-config';
import { HelpButtonComponent } from '../../../shared/help-button/help-button.component';

/** Device-local: the last picked mode is the next default. */
export const BIKE_LIVE_DEFAULT_MODE_KEY = 'lm2_bike_live_default_mode';

interface ModeOption {
  mode: BikeLiveMode;
  labelKey: string;
  hintKey: string;
  helpTitleKey: string;
  helpTextKey: string;
}

const MODES: readonly ModeOption[] = [
  {
    mode: BikeRideLog.TrackingModeEnum.Live,
    labelKey: 'WORKOUT.BIKE.LIVE.MODE_LIVE',
    hintKey: 'WORKOUT.BIKE.LIVE.MODE_LIVE_HINT',
    helpTitleKey: 'WORKOUT.BIKE.LIVE.MODE_LIVE_HELP_TITLE',
    helpTextKey: 'WORKOUT.BIKE.LIVE.MODE_LIVE_HELP_TEXT',
  },
  {
    mode: BikeRideLog.TrackingModeEnum.Estimated,
    labelKey: 'WORKOUT.BIKE.LIVE.MODE_ESTIMATED',
    hintKey: 'WORKOUT.BIKE.LIVE.MODE_ESTIMATED_HINT',
    helpTitleKey: 'WORKOUT.BIKE.LIVE.MODE_ESTIMATED_HELP_TITLE',
    helpTextKey: 'WORKOUT.BIKE.LIVE.MODE_ESTIMATED_HELP_TEXT',
  },
];

/** The `tracking-config` values the mode help texts quote (shared with the live summary's help). */
export function bikeLiveHelpParams(locale: string): Record<string, unknown> {
  return {
    accuracy: MAX_ACCEPTED_ACCURACY_METERS,
    seconds: ENDPOINT_FIX_TIMEOUT_SECONDS,
    speed: MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH,
    factor: formatNumber(ROAD_CIRCUITY_FACTOR, locale, '1.1-1'),
  };
}

/**
 * backlog/150 — "Élő edzés indítása" on the bike list: the mode picker (one line per mode on the
 * accuracy ↔ battery trade-off, plus a help icon with the details — the Becsült one names the loop-ride
 * limit), remembered as the next default, and the start button. The list shows
 * it only on native (`offlineCapable`) and while no ride exists.
 */
@Component({
  selector: 'app-bike-live-start',
  template: `
    <ion-list class="bike-live-start__modes">
      <ion-radio-group [value]="mode()" (ionChange)="pick($any($event.detail).value)">
        @for (option of modes; track option.mode) {
          <ion-item lines="none">
            <ion-radio [value]="option.mode" justify="start" labelPlacement="end">
              <ion-label class="ion-text-wrap">
                <h3>{{ option.labelKey | translate }}</h3>
                <p>{{ option.hintKey | translate }}</p>
              </ion-label>
            </ion-radio>
            <app-help-button slot="end" [titleKey]="option.helpTitleKey" [textKey]="option.helpTextKey" [textParams]="helpParams"></app-help-button>
          </ion-item>
        }
      </ion-radio-group>
    </ion-list>
    <ion-button expand="block" class="bike-live-start" [disabled]="starting()" (click)="start()">
      {{ 'WORKOUT.BIKE.LIVE.START' | translate }}
    </ion-button>
  `,
  imports: [IonList, IonRadioGroup, IonItem, IonRadio, IonLabel, IonButton, TranslatePipe, HelpButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BikeLiveStartComponent implements OnInit {
  private readonly live = inject(BikeLiveSessionService);
  private readonly navController = inject(NavController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly modes = MODES;
  readonly helpParams = bikeLiveHelpParams(inject(LOCALE_ID));
  readonly mode = signal<BikeLiveMode>(BikeRideLog.TrackingModeEnum.Live);
  readonly starting = signal(false);

  async ngOnInit(): Promise<void> {
    const stored = (await Preferences.get({ key: BIKE_LIVE_DEFAULT_MODE_KEY })).value;
    const known = MODES.find((option) => option.mode === stored);
    if (known) {
      this.mode.set(known.mode);
    }
  }

  async pick(mode: BikeLiveMode): Promise<void> {
    this.mode.set(mode);
    await Preferences.set({ key: BIKE_LIVE_DEFAULT_MODE_KEY, value: mode });
  }

  async start(): Promise<void> {
    this.starting.set(true);
    try {
      const result = await this.live.start(this.mode());
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
}
