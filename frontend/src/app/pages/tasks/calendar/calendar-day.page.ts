import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { addDaysToDate } from '../../../core/data/event-occurrence';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { CalendarOccurrence, CalendarSource, buildCalendarOccurrences, occurrencesForDate } from './calendar-occurrence';

/**
 * documentation/Features/Naptár.md "Napi lista": pipa csak completable-ön (háztartás — ugyanaz a
 * mutáció, mint a listáról), esemény sorra tap → sorozat szerkesztő, nincs create.
 */
@Component({
  selector: 'app-calendar-day',
  templateUrl: 'calendar-day.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonList, IonItem, IonLabel, IonCheckbox, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarDayPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly householdTaskRepository = inject(HouseholdTaskRepository);
  private readonly householdRoomRepository = inject(HouseholdRoomRepository);
  private readonly eventRepository = inject(CalendarEventRepository);

  private readonly todayIso = today();
  readonly date = signal(this.route.snapshot.paramMap.get('date') ?? this.todayIso);
  readonly activeSources = signal<ReadonlySet<CalendarSource>>(new Set<CalendarSource>(['HOUSEHOLD_TASK', 'EVENT']));

  readonly rows = computed(() =>
    occurrencesForDate(
      buildCalendarOccurrences(
        this.householdTaskRepository.items(),
        this.householdRoomRepository.items(),
        this.eventRepository.items(),
        this.todayIso,
        this.activeSources(),
      ),
      this.date(),
    ),
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.householdTaskRepository.load(), this.householdRoomRepository.load(), this.eventRepository.load()]);
  }

  timeLabel(row: CalendarOccurrence): string | null {
    return row.allDay || row.startTime === null || row.endTime === null ? null : `${row.startTime}–${row.endTime}`;
  }

  prevDay(): void {
    this.date.set(addDaysToDate(this.date(), -1));
  }

  nextDay(): void {
    this.date.set(addDaysToDate(this.date(), 1));
  }

  goToday(): void {
    this.date.set(this.todayIso);
  }

  async open(row: CalendarOccurrence): Promise<void> {
    const path = row.source === 'HOUSEHOLD_TASK' ? '/tabs/tasks/household' : '/tabs/tasks/events';
    await this.router.navigate([path, row.sourceEntityId]);
  }

  async complete(row: CalendarOccurrence): Promise<void> {
    const task = this.householdTaskRepository.items().find((item) => item.id === row.sourceEntityId);
    if (task !== undefined) {
      await this.householdTaskRepository.complete(task, this.todayIso, new Date().toISOString());
    }
  }

  async goBack(): Promise<void> {
    await this.router.navigate(['/tabs/tasks/calendar'], { queryParams: { highlight: this.date(), month: this.date().slice(0, 7) } });
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
