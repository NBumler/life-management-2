import { ChangeDetectionStrategy, Component, Input, OnInit, signal } from '@angular/core';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  PopoverController,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { RPE_VALUES, SET_TYPES, SetSide } from './workout-fields';

/** The per-set options edited behind the "1 M" badge: type, one-sided set (backlog/134), RPE (backlog/135). */
export interface SetOptions {
  setType: string;
  side: SetSide | null;
  rpe: number | null;
}

const BOTH = 'BOTH';

/**
 * The popover behind a set row's type badge in the three workout editors (plan-edit,
 * workout-session-edit, active-workout). The phone-width set table has no room for a side or RPE
 * column (backlog/124), so every per-set option lives here. Changes are reported live through
 * `changed`; the popover stays open until tapped away.
 */
@Component({
  selector: 'app-set-options-popover',
  template: `
    <ion-list lines="none">
      <ion-list-header>
        <ion-label>{{ 'WORKOUT.SESSION.FIELD_SET_TYPE' | translate }}</ion-label>
      </ion-list-header>
      <ion-radio-group [value]="setType()" (ionChange)="pickType($event.detail.value)">
        @for (type of setTypes; track type) {
          <ion-item>
            <ion-radio [value]="type" justify="space-between">{{ ('WORKOUT.SESSION.SET_TYPE.' + type) | translate }}</ion-radio>
          </ion-item>
        }
      </ion-radio-group>

      <ion-list-header>
        <ion-label>{{ 'WORKOUT.SESSION.FIELD_SIDE' | translate }}</ion-label>
      </ion-list-header>
      <ion-item>
        <ion-segment [value]="sideValue()" (ionChange)="pickSide($any($event.detail.value))">
          <ion-segment-button value="BOTH">{{ 'WORKOUT.SESSION.SIDE.BOTH' | translate }}</ion-segment-button>
          <ion-segment-button value="LEFT">{{ 'WORKOUT.SESSION.SIDE.LEFT' | translate }}</ion-segment-button>
          <ion-segment-button value="RIGHT">{{ 'WORKOUT.SESSION.SIDE.RIGHT' | translate }}</ion-segment-button>
        </ion-segment>
      </ion-item>

      <ion-list-header>
        <ion-label>{{ rpeLabelKey | translate }}</ion-label>
      </ion-list-header>
      <div class="rpe-grid">
        <ion-button size="small" [fill]="rpe() === null ? 'solid' : 'outline'" (click)="pickRpe(null)">–</ion-button>
        @for (value of rpeValues; track value) {
          <ion-button size="small" [fill]="rpe() === value ? 'solid' : 'outline'" (click)="pickRpe(value)">{{ value }}</ion-button>
        }
      </div>
    </ion-list>
  `,
  styles: `
    .rpe-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px;
      padding: 0 12px 12px;

      > ion-button {
        margin: 0;
        --padding-start: 0;
        --padding-end: 0;
      }
    }
  `,
  imports: [
    IonList,
    IonListHeader,
    IonLabel,
    IonItem,
    IonRadioGroup,
    IonRadio,
    IonSegment,
    IonSegmentButton,
    IonButton,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetOptionsPopoverComponent implements OnInit {
  @Input() initial: SetOptions = { setType: 'WORKING', side: null, rpe: null };
  /** "RPE" in the log, "Cél RPE" in the template editor. */
  @Input() rpeLabelKey = 'WORKOUT.SESSION.FIELD_RPE';
  @Input() changed: (options: SetOptions) => void = () => undefined;

  readonly setTypes = SET_TYPES;
  readonly rpeValues = RPE_VALUES;

  readonly setType = signal('WORKING');
  readonly side = signal<SetSide | null>(null);
  readonly rpe = signal<number | null>(null);
  readonly sideValue = () => this.side() ?? BOTH;

  ngOnInit(): void {
    this.setType.set(this.initial.setType);
    this.side.set(this.initial.side);
    this.rpe.set(this.initial.rpe);
  }

  pickType(value: string): void {
    this.setType.set(value);
    this.emit();
  }

  pickSide(value: string): void {
    this.side.set(value === 'LEFT' || value === 'RIGHT' ? value : null);
    this.emit();
  }

  pickRpe(value: number | null): void {
    this.rpe.set(value);
    this.emit();
  }

  private emit(): void {
    this.changed({ setType: this.setType(), side: this.side(), rpe: this.rpe() });
  }
}

/** Opens the set-options popover anchored at the tapped badge; `changed` fires on every pick. */
export async function presentSetOptions(
  popovers: PopoverController,
  event: Event,
  initial: SetOptions,
  changed: (options: SetOptions) => void,
  rpeLabelKey?: string,
): Promise<void> {
  const popover = await popovers.create({
    component: SetOptionsPopoverComponent,
    componentProps: { initial, changed, ...(rpeLabelKey ? { rpeLabelKey } : {}) },
    event,
    size: 'auto',
  });
  await popover.present();
}
