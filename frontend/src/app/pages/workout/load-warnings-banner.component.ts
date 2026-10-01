import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ClimbingSessionRepository } from '../../core/data/climbing-session.repository';
import { WorkoutSessionRepository } from '../../core/data/workout-session.repository';
import { today } from '../../shared/local-date';
import { loadWarningsFor } from './load-warnings';

/**
 * backlog/138 — non-blocking training-load banner on the Heti terv dashboard and the Edzésnapló list.
 * Reads the local climbing + workout logs only (works Full-offline); renders nothing without warnings.
 */
@Component({
  selector: 'app-load-warnings-banner',
  template: `
    @for (warning of warnings(); track warning.code) {
      <div class="load-warning" [class.info]="warning.severity === 'info'" role="note">
        <ion-icon [name]="warning.severity === 'info' ? 'help-circle-outline' : 'alert-circle'" aria-hidden="true"></ion-icon>
        <span>{{ 'WORKOUT.LOAD_WARNING.' + warning.code | translate }}</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 0 16px;
      }
      .load-warning {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 8px 0;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.875rem;
        background: rgba(var(--ion-color-warning-rgb), 0.15);
        color: var(--ion-text-color);
      }
      .load-warning.info {
        background: rgba(var(--ion-color-medium-rgb), 0.15);
      }
      .load-warning ion-icon {
        flex: none;
        font-size: 1.125rem;
        margin-top: 1px;
        color: var(--ion-color-warning-shade);
      }
      .load-warning.info ion-icon {
        color: var(--ion-color-medium);
      }
    `,
  ],
  imports: [IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadWarningsBannerComponent implements OnInit {
  private readonly climbingRepository = inject(ClimbingSessionRepository);
  private readonly workoutRepository = inject(WorkoutSessionRepository);

  readonly warnings = computed(() => loadWarningsFor(today(), this.climbingRepository.items(), this.workoutRepository.items()));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.climbingRepository.load(), this.workoutRepository.load()]);
  }
}
