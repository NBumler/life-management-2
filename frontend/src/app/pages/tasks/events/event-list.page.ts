import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { matchesSearch } from '../../../shared/text-search';
import { EventOccurrenceRow, buildEventOccurrenceRows, groupEventOccurrences } from './event-sections';

/** documentation/Features/Események.md: hub tile list — sections Ma/Közelgő/Múlt built from horizon occurrences, not the raw rows. */
@Component({
  selector: 'app-event-list',
  templateUrl: 'event-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventListPage implements OnInit {
  private readonly repository = inject(CalendarEventRepository);

  readonly query = signal('');
  private readonly today = new Date().toISOString().slice(0, 10);

  private readonly occurrenceRows = computed(() => buildEventOccurrenceRows(this.repository.items(), this.today));

  private readonly filteredRows = computed(() => {
    const query = this.query();
    return this.occurrenceRows().filter((row) => matchesSearch(query, row.title) || matchesSearch(query, row.location ?? ''));
  });

  readonly sections = computed(() => groupEventOccurrences(this.filteredRows(), this.today));
  readonly isEmpty = computed(() => this.repository.items().length === 0);
  readonly hasNoResults = computed(() => !this.isEmpty() && this.filteredRows().length === 0);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  timeLabel(row: EventOccurrenceRow): string | null {
    if (row.allDay) {
      return null;
    }
    return row.startTime !== null && row.endTime !== null ? `${row.startTime}–${row.endTime}` : null;
  }
}
