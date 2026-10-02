import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ActionSheetButton,
  ActionSheetController,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { CurrentDayService } from '../../../core/config/current-day.service';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { projectEventOccurrences } from '../../../core/data/event-occurrence';
import { ClimbingSessionRepository } from '../../../core/data/climbing-session.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { LoadWarningsBannerComponent } from '../load-warnings-banner.component';
import { ForecastDay, forecastInputsFrom, trainingForecast } from '../training-forecast';
import { DayLoad, dailyTrainingLoad, weekLoadSummary } from '../training-load';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { WEEK_DAYS, addLocalDays, mondayOf } from './weekly-plan-adherence';

/** A manual override choice: back to the automatic forecast, a template, or a forced rest day. */
export type OverrideChoice = { kind: 'AUTO' } | { kind: 'PLAN'; planId: string } | { kind: 'REST' };

interface DayCell {
  dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum;
  date: string;
  /** backlog/137 — the day's actual training load (climbing / workout / finger load / rest). */
  load: DayLoad;
  /** Before today — the row shows only what was logged. */
  past: boolean;
  /** Today or later — a climb can be planned, the forecast shows, the day can be overridden. */
  plannable: boolean;
  /** backlog/144 — the forecast for today / a future day (null for a past day). */
  forecast: ForecastDay | null;
  /** Names of the templates of the day's logged workouts (`null` entry = an ad-hoc workout). */
  loggedWorkouts: (string | null)[];
  /** This week's own live override slot for the day, if any. */
  overrideSlot: WeeklyPlanSlot | null;
}

/**
 * documentation/Subfeatures/Heti terv.md "Heti dashboard" (backlog/144) — a 7-day view of a calendar
 * week. Past days show what was logged; today and the future show the rotation forecast
 * (`training-forecast.ts`): the suggested template, a rest day or a planned climb. A forecast chip
 * opens an action sheet to override the day by hand (a template or a rest day, saved as this week's
 * WeeklyPlan slot — no inheritance) or to put it back to automatic. "+ Mászás" plans a climb
 * (backlog/143). Prev / next week nav; "ma" follows `CurrentDayService`.
 */
@Component({
  selector: 'app-weekly-plan',
  templateUrl: 'weekly-plan.page.html',
  styles: [
    `
      /* Prev / week-label / next on one row — the wrapping <ion-buttons> are block-level flex
         hosts, so without an explicit flex row they stacked into three lines. */
      .week-nav {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
      }
      .week-nav > ion-button {
        flex: 1;
        min-width: 0;
      }
      .week-nav ion-buttons {
        flex: none;
      }
      .load-summary {
        display: block;
        padding: 0 16px 8px;
      }
      .climb-toggle,
      .forecast-chip {
        margin: 0;
        --padding-start: 8px;
        --padding-end: 8px;
        height: 24px;
        font-size: 0.75rem;
        text-transform: none;
      }
      /* A long template name wraps instead of being clipped next to the row's start button. */
      .forecast-chip {
        height: auto;
        min-height: 24px;
        max-width: 100%;
        --padding-top: 3px;
        --padding-bottom: 3px;
      }
      .forecast-chip::part(native) {
        white-space: normal;
        text-align: start;
      }
      .load-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin: 2px 0 4px;
      }
    `,
  ],
  imports: [
    RouterLink,
    IonHeader,
    IonContent,
    IonList,
    IonNote,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonButtons,
    IonIcon,
    WorkoutSegmentHeaderComponent,
    LoadWarningsBannerComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyPlanPage implements OnInit, ViewWillEnter {
  private readonly planRepository = inject(WorkoutPlanRepository);
  private readonly weeklyRepository = inject(WeeklyPlanRepository);
  private readonly sessionRepository = inject(WorkoutSessionRepository);
  private readonly climbingRepository = inject(ClimbingSessionRepository);
  private readonly eventRepository = inject(CalendarEventRepository);
  private readonly currentDay = inject(CurrentDayService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly weekStart = signal(mondayOf(this.currentDay.day()));

  readonly activePlans = computed(() => this.planRepository.activePlans());

  private readonly forecastInputs = computed(() =>
    forecastInputsFrom(this.currentDay.day(), {
      climbingSessions: this.climbingRepository.items(),
      workoutSessions: this.sessionRepository.items(),
      events: this.eventRepository.items(),
      weeklyPlans: this.weeklyRepository.items(),
      workoutPlans: this.planRepository.items(),
    }),
  );

  /** backlog/137 / backlog/143 — per-day load of the shown week (logged, plus planned climbs from today). */
  readonly weekLoad = computed<DayLoad[]>(() => {
    const inputs = this.forecastInputs();
    return dailyTrainingLoad(
      WEEK_DAYS.map((_, index) => addLocalDays(this.weekStart(), index)),
      inputs.climbingSessions,
      inputs.workoutSessions,
      { dates: inputs.plannedClimbs, today: inputs.today },
    );
  });

  readonly loadSummary = computed(() => weekLoadSummary(this.weekLoad(), this.currentDay.day()));

  /** backlog/144 — the forecast from today to the end of the shown week, by date. */
  private readonly weekForecast = computed(() => {
    const weekEnd = addLocalDays(this.weekStart(), 6);
    return new Map(trainingForecast(this.forecastInputs(), weekEnd).map((day) => [day.date, day]));
  });

  readonly days = computed<DayCell[]>(() => {
    const today = this.currentDay.day();
    const load = this.weekLoad();
    const forecast = this.weekForecast();
    const plans = this.planRepository.items();
    const sessions = this.sessionRepository.items();
    const ownSlots = (this.weeklyRepository.byWeekStart(this.weekStart())?.slots ?? []).filter((slot) => !slot.deleted);
    return WEEK_DAYS.map((dayOfWeek, index) => {
      const date = load[index].date;
      return {
        dayOfWeek,
        date,
        load: load[index],
        past: date < today,
        plannable: date >= today,
        forecast: forecast.get(date) ?? null,
        loggedWorkouts: sessions
          .filter((session) => !session.deleted && session.date === date)
          .map((session) => plans.find((plan) => plan.id === session.planId)?.name ?? null),
        overrideSlot: ownSlots.find((slot) => slot.dayOfWeek === dayOfWeek) ?? null,
      };
    });
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.planRepository.load(),
      this.weeklyRepository.load(),
      this.sessionRepository.load(),
      this.climbingRepository.load(),
      this.eventRepository.load(),
    ]);
  }

  ionViewWillEnter(): void {
    this.currentDay.refresh();
    void this.sessionRepository.reload();
    void this.climbingRepository.load({ force: true });
    void this.eventRepository.load();
  }

  /** The forecast chip is shown on today / future days that are not (yet) logged and not climbing days. */
  showsForecastChip(day: DayCell): boolean {
    return day.forecast !== null && day.forecast.reason !== 'LOGGED' && day.forecast.kind !== 'CLIMB';
  }

  /** Today's still-pending forecast workout — the row's "Edzés indítása" CTA. */
  todayStartPlan(day: DayCell): WorkoutPlan | null {
    const forecast = day.forecast;
    if (day.date !== this.currentDay.day() || forecast === null || forecast.kind !== 'WORKOUT' || forecast.reason === 'LOGGED') {
      return null;
    }
    return forecast.plan;
  }

  /**
   * backlog/143 — the day row's "+ Mászás" toggle. Off → a one-off all-day `CLIMBING` event for the day;
   * on → its one-off climbing events are deleted. A day covered only by a recurring climbing event can't
   * drop one occurrence (no instance exceptions, see Események) — the toggle opens that event instead.
   */
  async toggleClimb(day: DayCell): Promise<void> {
    const climbingEvents = this.eventRepository
      .items()
      .filter((event) => !event.deleted && event.activityType === CalendarEvent.ActivityTypeEnum.Climbing)
      .filter((event) => projectEventOccurrences(event, this.currentDay.day()).includes(day.date));
    if (climbingEvents.length === 0) {
      await this.eventRepository.save({
        title: this.translate.instant('TASKS.EVENTS.CLIMBING_TITLE'),
        location: null,
        notes: null,
        allDay: true,
        date: day.date,
        startTime: null,
        endTime: null,
        frequency: null,
        interval: 1,
        activityType: CalendarEvent.ActivityTypeEnum.Climbing,
      });
      return;
    }
    const oneOffs = climbingEvents.filter((event) => !event.frequency);
    if (oneOffs.length === 0) {
      await this.router.navigate(['/tabs/tasks/events', climbingEvents[0].id]);
      return;
    }
    for (const event of oneOffs) {
      await this.eventRepository.remove(event.id);
    }
  }

  shiftWeek(deltaWeeks: number): void {
    this.weekStart.set(addLocalDays(this.weekStart(), deltaWeeks * 7));
  }

  goToday(): void {
    this.weekStart.set(mondayOf(this.currentDay.day()));
  }

  /** backlog/144 — the override action sheet: automatic (when overridden), every active template, rest day. */
  async openOverride(day: DayCell): Promise<void> {
    const buttons: ActionSheetButton[] = [];
    if (day.overrideSlot !== null) {
      buttons.push({
        text: this.translate.instant('WORKOUT.WEEKLY.OVERRIDE_AUTO'),
        handler: () => void this.setOverride(day, { kind: 'AUTO' }),
      });
    }
    for (const plan of this.activePlans()) {
      buttons.push({ text: plan.name, handler: () => void this.setOverride(day, { kind: 'PLAN', planId: plan.id }) });
    }
    buttons.push(
      { text: this.translate.instant('WORKOUT.WEEKLY.OVERRIDE_REST'), handler: () => void this.setOverride(day, { kind: 'REST' }) },
      { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
    );
    const sheet = await this.actionSheetController.create({
      header: `${this.translate.instant('WORKOUT.WEEKLY.DAY.' + day.dayOfWeek)} · ${day.date}`,
      subHeader: this.translate.instant('WORKOUT.WEEKLY.OVERRIDE_HINT'),
      buttons,
    });
    await sheet.present();
  }

  /**
   * backlog/144 — saves the day's override as this week's own slot set (every other own slot kept with
   * its id); `AUTO` drops the day's slot so the forecast decides again. Only today / future days.
   */
  async setOverride(day: DayCell, choice: OverrideChoice): Promise<void> {
    if (!day.plannable) {
      return;
    }
    const weekStart = this.weekStart();
    const own = (this.weeklyRepository.byWeekStart(weekStart)?.slots ?? []).filter((slot) => !slot.deleted);
    const others = own
      .filter((slot) => slot.dayOfWeek !== day.dayOfWeek)
      .map((slot) => ({ id: slot.id, dayOfWeek: slot.dayOfWeek, kind: slot.kind, planId: slot.planId ?? null }));
    if (choice.kind === 'AUTO') {
      if (day.overrideSlot === null) {
        return;
      }
      await this.weeklyRepository.saveWeek(weekStart, others);
      return;
    }
    const slot = {
      id: day.overrideSlot?.id,
      dayOfWeek: day.dayOfWeek,
      kind: choice.kind === 'REST' ? WeeklyPlanSlot.KindEnum.Rest : WeeklyPlanSlot.KindEnum.Plan,
      planId: choice.kind === 'PLAN' ? choice.planId : null,
    };
    await this.weeklyRepository.saveWeek(weekStart, [...others, slot]);
  }
}
