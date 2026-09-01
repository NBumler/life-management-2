import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Gesture,
  GestureController,
  GestureDetail,
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
import { today } from '../../../shared/local-date';
import { CalendarSource, buildCalendarOccurrences, groupOccurrencesByDate } from './calendar-occurrence';
import { MonthGridDay, buildMonthGrid } from './calendar-month-grid';

/** Minimum horizontal travel (px) for a swipe to count as a month change — below this it's a tap/scroll. */
const SWIPE_DISTANCE_PX = 60;

/**
 * documentation/Features/Naptár.md "Hónap rács": aktuális hónap nyitáskor, mai nap kiemelve, hét
 * hétfővel kezdődik, chevronok a hónapváltáshoz, "Ma" gomb, cellánként dátumszám + darabszám-badge.
 * Hónapváltás: chevron **és** vízszintes swipe a rácson (Ionic Gesture API).
 * Nincs saját adat/mutáció — csak a két producer store-ját olvassa.
 */
@Component({
  selector: 'app-calendar-month',
  templateUrl: 'calendar-month.page.html',
  styleUrls: ['calendar-month.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent, IonIcon, IonChip, IonLabel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarMonthPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly householdTaskRepository = inject(HouseholdTaskRepository);
  private readonly householdRoomRepository = inject(HouseholdRoomRepository);
  private readonly eventRepository = inject(CalendarEventRepository);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly translate = inject(TranslateService);
  private readonly gestureController = inject(GestureController);

  private readonly monthGrid = viewChild.required<ElementRef<HTMLElement>>('monthGrid');
  private swipeGesture?: Gesture;

  private readonly todayIso = today();
  readonly viewYear = signal(Number(this.todayIso.slice(0, 4)));
  readonly viewMonth = signal(Number(this.todayIso.slice(5, 7)));
  /** documentation/Features/Naptár.md: no selection before the first tap — only set when returning from the day list. */
  readonly highlightedDate = signal<string | null>(this.route.snapshot.queryParamMap.get('highlight'));

  readonly eventsSourceAvailable = this.featureFlags.isEnabled('feladatok.esemenyek');
  /**
   * documentation/Features/Naptár.md "Producer registry": a chip csak élő producerből lehet aktív —
   * ha az Események flag ki van kapcsolva, az EVENT forrás nem csak a chipen tűnik el, a vetítésből
   * is ki kell esnie.
   */
  readonly activeSources = signal<ReadonlySet<CalendarSource>>(
    new Set<CalendarSource>(this.eventsSourceAvailable ? ['HOUSEHOLD_TASK', 'EVENT'] : ['HOUSEHOLD_TASK']),
  );

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
    const monthNames = this.translate.instant('TASKS.CALENDAR.MONTH_NAMES') as string[];
    return `${monthNames[this.viewMonth() - 1]} ${this.viewYear()}`;
  });

  readonly weekdayNames = this.translate.instant('TASKS.CALENDAR.WEEKDAY_NAMES') as string[];

  async ngOnInit(): Promise<void> {
    const monthParam = this.route.snapshot.queryParamMap.get('month');
    if (monthParam !== null) {
      const [year, month] = monthParam.split('-').map(Number);
      this.viewYear.set(year);
      this.viewMonth.set(month);
    }
    await Promise.all([this.householdTaskRepository.load(), this.householdRoomRepository.load(), this.eventRepository.load()]);
  }

  ngAfterViewInit(): void {
    // documentation/Features/Naptár.md: swipe left → next month, swipe right → previous month.
    // `direction: 'x'` lets ion-content keep its vertical scroll; callbacks run inside the Angular
    // zone (2nd arg `true`) so the viewYear/viewMonth signal writes trigger change detection.
    this.swipeGesture = this.gestureController.create(
      {
        el: this.monthGrid().nativeElement,
        gestureName: 'calendar-month-swipe',
        direction: 'x',
        // Match the action distance: a shorter horizontal drag must not capture the gesture, because
        // the browser then suppresses the trailing click and the day-cell tap is silently lost.
        threshold: SWIPE_DISTANCE_PX,
        onEnd: (detail) => this.onSwipeEnd(detail),
      },
      true,
    );
    this.swipeGesture.enable(true);
  }

  ngOnDestroy(): void {
    this.swipeGesture?.destroy();
  }

  private onSwipeEnd(detail: GestureDetail): void {
    if (Math.abs(detail.deltaX) < SWIPE_DISTANCE_PX) {
      return;
    }
    if (detail.deltaX < 0) {
      this.nextMonth();
    } else {
      this.prevMonth();
    }
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
