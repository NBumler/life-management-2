import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IonButton, IonInput, IonItem, IonList, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ClimbingLiveController } from './climbing-live-controller';

/**
 * backlog/122 — the live-session strip at the top of a kontextus-napló page on the `<ctx>/live`
 * route. Live: the stopwatch + "Session vége" / "Elvetés". Summary (after "Session vége"): editable
 * start / end (the end defaults to the moment the button was tapped), the derived duration, "Vissza"
 * to keep going, "Elvetés". Approving is the page's own save button (relabelled), so the summary is the
 * whole, fully editable page.
 */
@Component({
  selector: 'app-climbing-live-bar',
  template: `
    <div class="live-bar" [class.live-bar--summary]="live.summary()">
      @if (!live.summary()) {
        <div class="live-bar__row">
          <span class="live-bar__dot" aria-hidden="true"></span>
          <span class="live-bar__label">{{ 'WORKOUT.CLIMBING.LIVE.IN_PROGRESS' | translate }}</span>
          <span class="live-bar__elapsed">{{ live.elapsedLabel() }}</span>
        </div>
        <div class="live-bar__actions">
          <ion-button class="live-bar__end" size="small" (click)="live.endSession()">{{ 'WORKOUT.CLIMBING.LIVE.END' | translate }}</ion-button>
          <ion-button class="live-bar__discard" size="small" fill="clear" color="danger" (click)="live.discard()">
            {{ 'WORKOUT.CLIMBING.LIVE.DISCARD' | translate }}
          </ion-button>
        </div>
      } @else {
        <h2 class="live-bar__title">{{ 'WORKOUT.CLIMBING.LIVE.SUMMARY_TITLE' | translate }}</h2>
        <ion-note class="live-bar__hint">{{ 'WORKOUT.CLIMBING.LIVE.SUMMARY_HINT' | translate }}</ion-note>
        <ion-list>
          <ion-item>
            <ion-input
              class="live-bar__start"
              type="datetime-local"
              [value]="live.startInput()"
              (ionChange)="live.setStart($any($event.target).value)"
              [label]="'WORKOUT.CLIMBING.LIVE.STARTED_AT' | translate"
              labelPlacement="stacked"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-input
              class="live-bar__endtime"
              type="datetime-local"
              [value]="live.endInput()"
              (ionChange)="live.setEnd($any($event.target).value)"
              [label]="'WORKOUT.CLIMBING.LIVE.ENDED_AT' | translate"
              labelPlacement="stacked"
            ></ion-input>
          </ion-item>
        </ion-list>
        @if (live.timesInvalid()) {
          <ion-note color="danger" class="live-bar__error">{{ 'WORKOUT.CLIMBING.LIVE.END_BEFORE_START' | translate }}</ion-note>
        } @else {
          <ion-note class="live-bar__duration">
            {{ 'WORKOUT.CLIMBING.LIVE.DURATION' | translate: { minutes: live.durationMinutes() } }}
          </ion-note>
        }
        <div class="live-bar__actions">
          <ion-button size="small" fill="outline" (click)="live.resumeLive()">{{ 'WORKOUT.CLIMBING.LIVE.RESUME' | translate }}</ion-button>
          <ion-button size="small" fill="clear" color="danger" (click)="live.discard()">{{ 'WORKOUT.CLIMBING.LIVE.DISCARD' | translate }}</ion-button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .live-bar {
        margin: 8px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--ion-color-primary-tint, #e8f0fe);
        color: var(--ion-color-primary-contrast, inherit);
      }
      .live-bar--summary {
        background: var(--ion-background-color-step-50, #f7f7f7);
        color: inherit;
      }
      .live-bar__row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      .live-bar__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--ion-color-danger);
      }
      .live-bar__elapsed {
        margin-inline-start: auto;
        font-variant-numeric: tabular-nums;
        font-size: 1.2rem;
      }
      .live-bar__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }
      .live-bar__title {
        margin: 0 0 4px;
        font-size: 1.1rem;
      }
      .live-bar__hint,
      .live-bar__duration,
      .live-bar__error {
        display: block;
        font-size: 0.85rem;
      }
    `,
  ],
  imports: [IonButton, IonInput, IonItem, IonList, IonNote, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimbingLiveBarComponent {
  @Input({ required: true }) live!: ClimbingLiveController;
}
