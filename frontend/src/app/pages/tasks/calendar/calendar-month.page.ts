import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { CalendarSource, buildCalendarOccurrences, groupOccurrencesByDate } from './calendar-occurrence';
import { MonthGridDay, buildMonthGrid } from './calendar-month-grid';

/**
 * documentation/Features/Naptár.md "Hónap rács": aktuális hónap nyitáskor, mai nap kiemelve, hét
 * hétfővel kezdődik, chevronok a hónapváltáshoz, "Ma" gomb, cellánként dátumszám + darabszám-badge.
 * Nincs saját adat/mutáció — csak a két producer store-ját olvassa.
 */
@Component({
  selector: 'app-calendar-month',
  templateUrl: 'calendar-month.page.html',
  styleUrls: ['calendar-month.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent, IonIcon, IonChip, IonLabel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarMonthPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly householdTaskRepository = inject(HouseholdTaskRepository);
  private readonly householdRoomRepository = inject(HouseholdRoomRepository);
  private readonly eventRepository = inject(CalendarEventRepository);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly translate = inject(TranslateService);

  private readonly todayIso = today();
  readonly viewYear = signal(Number(this.todayIso.slice(0, 4)));
  readonly viewMonth = signal(Number(this.todayIso.slice(5, 7)));
  /** documentation/Features/Naptár.md: no selection before the first tap — only set when returning from the day list. */
  readonly highlightedDate = signal<string | null>(this.route.snapshot.queryParamMap.get('highlight'));

  readonly eventsSourceAvailable = this.featureFlags.isEnabled('feladatok.esemenyek');
  readonly activeSources = signal<ReadonlySet<CalendarSource>>(new Set<CalendarSource>(['HOUSEHOLD_TASK', 'EVENT']));

  private readonly occurrencesByDate = computed(() =>
    groupOccurrencesByDate(
      buildCalendarOccurrences(
        this.householdTaskRepository.items(),
        this.householdRoomRepository.items(),
        this.eventRepository.items(),
        this.todayIso,
        this.activeSources(),
      ),
    ),
  );

  readonly grid = computed(() => buildMonthGrid(this.viewYear(), this.viewMonth()));

  readonly monthLabel = computed(() => {
    const monthNames = this.translate.instant('CALENDAR.MONTH_NAMES') as string[];
    return `${monthNames[this.viewMonth() - 1]} ${this.viewYear()}`;
  });

  readonly weekdayNames = this.translate.instant('CALENDAR.WEEKDAY_NAMES') as string[];

  async ngOnInit(): Promise<void> {
    const monthParam = this.route.snapshot.queryParamMap.get('month');
    if (monthParam !== null) {
      const [year, month] = monthParam.split('-').map(Number);
      this.viewYear.set(year);
      this.viewMonth.set(month);
    }
    await Promise.all([this.householdTaskRepository.load(), this.householdRoomRepository.load(), this.eventRepository.load()]);
  }

  badgeCount(day: MonthGridDay): number {
    return this.occurrencesByDate().get(day.date)?.length ?? 0;
  }

  badgeLabel(day: MonthGridDay): string {
    const count = this.badgeCount(day);
    if (count === 0) {
      return '';
    }
    return count >= 100 ? '99+' : String(count);
  }

  isOverdue(day: MonthGridDay): boolean {
    return day.date < this.todayIso && (this.occurrencesByDate().get(day.date)?.some((occurrence) => occurrence.overdue) ?? false);
  }

  isToday(day: MonthGridDay): boolean {
    return day.date === this.todayIso;
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

  prevMonth(): void {
    this.shiftMonth(-1);
  }

  nextMonth(): void {
    this.shiftMonth(1);
  }

  goToday(): void {
    this.viewYear.set(Number(this.todayIso.slice(0, 4)));
    this.viewMonth.set(Number(this.todayIso.slice(5, 7)));
  }

  async openDay(day: MonthGridDay): Promise<void> {
    await this.router.navigate(['/tabs/tasks/calendar', day.date]);
  }

  private shiftMonth(delta: number): void {
    let year = this.viewYear();
    let month = this.viewMonth() + delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
