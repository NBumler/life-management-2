import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, IonItem, IonLabel, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ClimbingLiveSessionService, liveRoute } from '../../../core/data/climbing-live-session.service';
import { CLIMBING_CONTEXTS } from './climbing-contexts';
import { formatElapsed } from './naplo/climbing-live-controller';

/**
 * backlog/122 — the prominent "Folyamatban: <kontextus>, <eltelt idő>" strip on the climbing hub and
 * the kontextus lists while a live session runs (also after an app restart — it reads the persisted
 * draft); a tap opens the live screen.
 */
@Component({
  selector: 'app-climbing-live-banner',
  template: `
    @if (draft(); as d) {
      <ion-item class="live-banner" button detail="true" [routerLink]="route()" lines="none">
        <ion-icon slot="start" name="radio-button-on-outline" color="danger" aria-hidden="true"></ion-icon>
        <ion-label>
          <h2>{{ 'WORKOUT.CLIMBING.LIVE.HUB_BANNER' | translate: { context: (contextLabel() | translate) } }}</h2>
        </ion-label>
        <ion-note slot="end" class="live-banner__elapsed">{{ elapsed() }}</ion-note>
      </ion-item>
    }
  `,
  styles: [
    `
      .live-banner {
        --background: var(--ion-color-primary-tint, #e8f0fe);
        margin: 8px;
        border-radius: 10px;
      }
      .live-banner__elapsed {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
    `,
  ],
  imports: [RouterLink, IonItem, IonIcon, IonLabel, IonNote, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimbingLiveBannerComponent implements OnInit, OnDestroy {
  private readonly service = inject(ClimbingLiveSessionService);

  readonly draft = this.service.draft;
  private readonly nowMs = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly route = computed(() => {
    const draft = this.draft();
    return draft ? liveRoute(draft.contextKey) : '/';
  });

  readonly contextLabel = computed(() => CLIMBING_CONTEXTS.find((ctx) => ctx.key === this.draft()?.contextKey)?.labelKey ?? '');

  readonly elapsed = computed(() => {
    const draft = this.draft();
    return draft ? formatElapsed((draft.endedAtMs ?? this.nowMs()) - draft.startedAtMs) : '';
  });

  ngOnInit(): void {
    void this.service.refresh();
    this.timer = setInterval(() => this.nowMs.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
  }
}
