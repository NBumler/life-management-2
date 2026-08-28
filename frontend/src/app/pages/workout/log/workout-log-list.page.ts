import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';

/**
 * documentation/Subfeatures/Edzésnapló.md — the Edzés tab's default segment. This is the shell
 * placeholder from the tab-scaffold commit (A0); the real dashboard/list (session list, "Új edzés" /
 * "Terv indítása" / "Ugyanaz mint legutóbb" CTAs, kcal column) lands with the Edzésnapló slice.
 */
@Component({
  selector: 'app-workout-log-list',
  templateUrl: 'workout-log-list.page.html',
  imports: [IonHeader, IonContent, IonList, IonItem, IonLabel, WorkoutSegmentHeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutLogListPage {}
