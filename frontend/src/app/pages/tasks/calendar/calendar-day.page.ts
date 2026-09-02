import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonChip,
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

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { addDaysToDate } from '../../../core/data/event-occurrence';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { today } from '../../../shared/local-date';
import { CalendarOccurrence, CalendarSource, buildCalendarOccurrences, occurrencesForDate } from './calendar-occurrence';

/**
 * documentation/Features/Naptár.md "Napi lista": pipa csak completable-ön (háztartás — ugyanaz a
 * mutáció, mint a listáról), esemény sorra tap → sorozat szerkesztő, nincs create. "A szűrő a hónap
 * és a napi listán ugyanaz; a napi képernyőn is látszanak / állíthatók" — ugyanazok a forrás-chipek.
 */
@Component({
  selector: 'app-calendar-day',
  templateUrl: 'calendar-day.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonChip,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarDayPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly householdTaskRepository = inject(HouseholdTaskRepository);
  private readonly householdRoomRepository = inject(HouseholdRoomRepository);
  private readonly eventRepository = inject(CalendarEventRepository);
  private readonly featureFlags = inject(FeatureFlagsService);

  private readonly todayIso = today();
  readonly date = signal(this.route.snapshot.paramMap.get('date') ?? this.todayIso);
  /**
   * documentation/Features/Naptár.md: the grid returns to the month it was opened *from*, not the
   * currently-viewed day's month (which can drift via the day chevrons or an adjacent-month cell).
   * `null` on a deep link → fall back to the viewed day's month.
   */
  private readonly originMonth = this.route.snapshot.queryParamMap.get('from');

  readonly eventsSourceAvailable = this.featureFlags.isEnabled('feladatok.esemenyek');
  readonly activeSources = signal<ReadonlySet<CalendarSource>>(
    new Set<CalendarSource>(this.eventsSourceAvailable ? ['HOUSEHOLD_TASK', 'EVENT'] : ['HOUSEHOLD_TASK']),
  );

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

  toggleSource(source: CalendarSource): void {
    const next = new Set(this.activeSources());
    if (next.has(source)) {
      next.delete(source);
    } else {
      next.add(source);
    }
    this.activeSources.set(next);
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
    await this.router.navigate(['/tabs/tasks/calendar'], {
      queryParams: { highlight: this.date(), month: this.originMonth ?? this.date().slice(0, 7) },
    });
  }
}
