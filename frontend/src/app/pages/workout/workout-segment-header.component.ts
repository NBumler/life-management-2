import { ChangeDetectionStrategy, Component, inject, input, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

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
      <ion-segment #segment scrollable [value]="current()" (ionChange)="switchSection($any($event.target).value)">
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

  private readonly segment = viewChild<IonSegment>('segment');

  readonly current = input.required<WorkoutSection>();

  readonly visibleSections: readonly WorkoutSectionDef[] = WORKOUT_SECTIONS.filter(
    (def) => def.flag === null || this.featureFlags.isEnabled(def.flag),
  );

  constructor() {
    // Ionic's router outlet keeps each Edzés page (and this segment) alive in the nav stack instead
    // of recreating it. Tapping a button mutates `ion-segment.value` before we navigate away, and the
    // `[value]="current()"` binding never re-applies on return (the input hasn't changed), so the
    // cached page would show the wrong segment checked. Re-assert on every navigation — same fix as
    // the food tab's per-page `ionViewWillEnter` (fix 42a1750), centralised here because Ionic only
    // fires that hook on the routed page, not on a child component. The freshly-entered page's own
    // view may not be queried yet when its NavigationEnd lands (`segment()` still undefined) — that
    // first paint is already covered by the `[value]` binding, so a no-op here is fine.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const segment = this.segment();
        if (segment) {
          segment.value = this.current();
        }
      });
  }

  switchSection(section: string): void {
    navigateWorkoutSection(this.router, section, this.current());
  }
}
