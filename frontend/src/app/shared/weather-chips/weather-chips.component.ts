import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IonChip, IonLabel, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WEATHER_TAGS, WeatherTag, canonicalWeather, toggleWeather } from '../climbing/weather';

/**
 * backlog/119 — multi-select toggle chips for a climbing session's weather: any combination can be on
 * at once (contradicting tags too). The caller owns the list; every tap emits the new canonical list.
 */
@Component({
  selector: 'app-weather-chips',
  template: `
    <div class="weather">
      <ion-note class="weather__label">{{ label }}</ion-note>
      <div class="weather__chips" role="group" [attr.aria-label]="label">
        @for (tag of tags; track tag) {
          <ion-chip
            class="weather-chip"
            role="checkbox"
            [attr.data-tag]="tag"
            [attr.aria-checked]="selected().includes(tag)"
            [outline]="!selected().includes(tag)"
            [color]="selected().includes(tag) ? 'primary' : undefined"
            (click)="toggle(tag)"
          >
            <ion-label>{{ 'WORKOUT.CLIMBING.WEATHER.' + tag | translate }}</ion-label>
          </ion-chip>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .weather {
        padding: 8px 16px 4px;
      }
      .weather__label {
        display: block;
        font-size: 0.8rem;
        margin-bottom: 4px;
      }
      .weather__chips {
        display: flex;
        flex-wrap: wrap;
      }
    `,
  ],
  imports: [IonChip, IonLabel, IonNote, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherChipsComponent {
  @Input() label = '';

  @Input()
  set value(tags: readonly string[] | null | undefined) {
    this.selected.set(canonicalWeather(tags));
  }

  @Output() readonly valueChange = new EventEmitter<WeatherTag[]>();

  readonly tags = WEATHER_TAGS;
  readonly selected = signal<WeatherTag[]>([]);

  toggle(tag: WeatherTag): void {
    const next = toggleWeather(this.selected(), tag);
    this.selected.set(next);
    this.valueChange.emit(next);
  }
}
