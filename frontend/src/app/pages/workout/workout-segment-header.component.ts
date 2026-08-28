import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { WORKOUT_SECTIONS, WorkoutSection, WorkoutSectionDef, navigateWorkoutSection } from './workout-sections';

/**
 * documentation/Features/Edzés.md — the shared top segment for every Edzés-tab page. Renders only the
 * segments whose `edzes.*` flag is on (Frontend.md "Tab registry": disabling a flag removes the
 * segment, never leaves a disabled-looking button). Each page drops this in its `<ion-header>` and
 * passes its own `current` section; navigation is delegated to `navigateWorkoutSection`.
 *
 * Unlike the food tab (which duplicates the `<ion-segment>` markup across five pages), this is a
 * single component so adding/renaming a segment is one edit.
 */
@Component({
  selector: 'app-workout-segment-header',
  template: `
    <ion-toolbar>
      <ion-segment scrollable [value]="current()" (ionChange)="switchSection($any($event.target).value)">
        @for (def of visibleSections; track def.section) {
          <ion-segment-button [value]="def.section">
            <ion-label>{{ def.labelKey | translate }}</ion-label>
          </ion-segment-button>
        }
      </ion-segment>
      <ion-buttons slot="end">
        <ion-button routerLink="/tabs/workout/exercises" [attr.aria-label]="'WORKOUT.EXERCISES.TITLE' | translate">
          <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  `,
  imports: [IonToolbar, IonSegment, IonSegmentButton, IonLabel, IonButtons, IonButton, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutSegmentHeaderComponent {
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly router = inject(Router);

  readonly current = input.required<WorkoutSection>();

  readonly visibleSections: readonly WorkoutSectionDef[] = WORKOUT_SECTIONS.filter(
    (def) => def.flag === null || this.featureFlags.isEnabled(def.flag),
  );

  switchSection(section: string): void {
    navigateWorkoutSection(this.router, section, this.current());
  }
}
