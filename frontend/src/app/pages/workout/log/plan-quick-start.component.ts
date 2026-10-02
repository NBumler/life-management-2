import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActionSheetController, IonButton } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CurrentDayService } from '../../../core/config/current-day.service';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { ClimbingSessionRepository } from '../../../core/data/climbing-session.repository';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { planGroupKey } from '../plan/plan-group-activation';
import { planHasFingerLoad } from '../rotation-suggestion';
import { ForecastDay, forecastInputsFrom, nextForecastWorkout, trainingForecast } from '../training-forecast';
import { WEEK_DAYS, addLocalDays, mondayOf, weekDates } from '../weekly-plan/weekly-plan-adherence';

const ACTIVE_ROUTE = '/tabs/workout/log/active';
/** How far ahead the "Következő" workout is looked for. */
const NEXT_LOOKAHEAD_DAYS = 14;

/**
 * documentation/Subfeatures/Edzésnapló.md "Terv indítása" (backlog/054, backlog/144) — the Edzésnapló
 * dashboard's plan quick start, driven by the rotation forecast (`training-forecast.ts`): today's
 * suggestion with a one-tap start, or why today is a climbing / rest day, or "done for today"; then
 * the next forecast workout; plus a picker over every active template. Starts preload the live view
 * via `?planId=`.
 */
@Component({
  selector: 'app-plan-quick-start',
  template: `
    @if (hasPlans()) {
      <div class="quick-start">
        @if (todayForecast(); as day) {
          <div class="qs-row">
            <div class="qs-text">
              @switch (todayState()) {
                @case ('SUGGESTED') {
                  <span class="qs-label">{{ 'WORKOUT.LOG.QUICK.TODAY_SUGGESTION' | translate }}</span>
                  <strong>{{ day.plan?.name }}</strong>
                  <span class="qs-sub">
                    @if (day.reason === 'OVERRIDE') {
                      {{ 'WORKOUT.LOG.QUICK.MANUAL' | translate }}
                    } @else if (lastDoneOf(day); as last) {
                      {{ 'WORKOUT.LOG.QUICK.LAST_DONE' | translate: { date: last } }}
                    } @else {
                      {{ 'WORKOUT.LOG.QUICK.NEVER_DONE' | translate }}
                    }
                  </span>
                }
                @case ('DONE') {
                  <span class="qs-label">{{ 'WORKOUT.LOG.QUICK.TODAY' | translate }}</span>
                  <strong>{{ 'WORKOUT.LOG.QUICK.DONE_TODAY' | translate }}</strong>
                  @if (day.plan) {
                    <span class="qs-sub">{{ day.plan.name }}</span>
                  }
                }
                @case ('CLIMB') {
                  <span class="qs-label">{{ 'WORKOUT.LOG.QUICK.TODAY' | translate }}</span>
                  <strong>{{ 'WORKOUT.LOG.QUICK.CLIMB_DAY' | translate }}</strong>
                  <span class="qs-sub">{{ 'WORKOUT.LOG.QUICK.CLIMB_DAY_SUB' | translate }}</span>
                }
                @case ('REST') {
                  <span class="qs-label">{{ 'WORKOUT.LOG.QUICK.TODAY' | translate }}</span>
                  <strong>{{ 'WORKOUT.LOG.QUICK.REST_DAY' | translate }}</strong>
                  <span class="qs-sub">
                    @if (day.reason === 'OVERRIDE') {
                      {{ 'WORKOUT.LOG.QUICK.MANUAL' | translate }}
                    } @else {
                      {{ 'WORKOUT.LOG.QUICK.REST_AFTER_BLOCK' | translate: { count: day.blockLength } }}
                    }
                  </span>
                }
              }
            </div>
            @if (todayState() === 'SUGGESTED' && day.plan; as plan) {
              <ion-button size="small" [routerLink]="activeRoute" [queryParams]="{ planId: plan.id }">
                {{ 'WORKOUT.LOG.QUICK.START' | translate }}
              </ion-button>
            }
          </div>
          @if (fingerNote(); as note) {
            <p class="finger-note">{{ note | translate }}</p>
          }
        }
        @if (todayState() !== 'SUGGESTED') {
          @if (nextWorkout(); as next) {
            <div class="qs-row">
              <div class="qs-text">
                <span class="qs-label">{{ 'WORKOUT.LOG.QUICK.NEXT' | translate }}</span>
                <strong>{{ next.plan?.name }}</strong>
                <span class="qs-sub">{{ 'WORKOUT.WEEKLY.DAY.' + weekdayOf(next.date) | translate }} · {{ next.date }}</span>
              </div>
            </div>
          }
        }
        <ion-button size="small" fill="clear" (click)="openPlanPicker()">{{ 'WORKOUT.LOG.QUICK.PICK_PLAN' | translate }}</ion-button>
      </div>
    }
  `,
  styles: [
    `
      .quick-start {
        margin: 8px 16px;
        padding: 8px 12px 4px;
        border-radius: 8px;
        background: var(--ion-color-light, #f4f5f8);
      }
      .finger-note {
        margin: 0 0 4px;
        font-size: 0.75rem;
        color: var(--ion-color-warning-shade);
      }
      .qs-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 0;
      }
      .qs-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .qs-text strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .qs-label,
      .qs-sub {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
      }
    `,
  ],
  imports: [IonButton, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanQuickStartComponent implements OnInit {
  private readonly planRepository = inject(WorkoutPlanRepository);
  private readonly weeklyRepository = inject(WeeklyPlanRepository);
  private readonly sessionRepository = inject(WorkoutSessionRepository);
  private readonly climbingRepository = inject(ClimbingSessionRepository);
  private readonly eventRepository = inject(CalendarEventRepository);
  private readonly currentDay = inject(CurrentDayService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly activeRoute = ACTIVE_ROUTE;

  readonly hasPlans = computed(() => this.planRepository.items().some((plan) => !plan.deleted && plan.active));

  private readonly inputs = computed(() =>
    forecastInputsFrom(this.currentDay.day(), {
      climbingSessions: this.climbingRepository.items(),
      workoutSessions: this.sessionRepository.items(),
      events: this.eventRepository.items(),
      weeklyPlans: this.weeklyRepository.items(),
      workoutPlans: this.planRepository.items(),
    }),
  );

  /** backlog/144 — today … +14 days of the rotation forecast. */
  private readonly forecast = computed(() => {
    const inputs = this.inputs();
    return trainingForecast(inputs, addLocalDays(inputs.today, NEXT_LOOKAHEAD_DAYS));
  });

  readonly todayForecast = computed<ForecastDay | null>(() => this.forecast()[0] ?? null);

  /** What today's row says: a workout to start, done for today, a climbing day or a rest day. */
  readonly todayState = computed<'SUGGESTED' | 'DONE' | 'CLIMB' | 'REST'>(() => {
    const day = this.todayForecast();
    if (day === null || day.kind === 'REST') {
      return 'REST';
    }
    if (day.kind === 'CLIMB') {
      return 'CLIMB';
    }
    return day.reason === 'LOGGED' ? 'DONE' : 'SUGGESTED';
  });

  readonly nextWorkout = computed(() => nextForecastWorkout(this.forecast(), this.currentDay.day()));

  /**
   * backlog/143 / backlog/144 — the suggestion has finger work before a planned climb: every template
   * has it (rotation fallback), or the day was overridden to a finger template by hand.
   */
  readonly fingerNote = computed<string | null>(() => {
    const day = this.todayForecast();
    if (this.todayState() !== 'SUGGESTED' || day?.plan == null) {
      return null;
    }
    if (day.fingerFallback) {
      return 'WORKOUT.LOG.QUICK.ALL_PLANS_HAVE_FINGERS';
    }
    const climbTomorrow = this.inputs().plannedClimbs.has(addLocalDays(day.date, 1));
    return day.reason === 'OVERRIDE' && climbTomorrow && planHasFingerLoad(day.plan) ? 'WORKOUT.LOG.QUICK.OVERRIDE_FINGERS_NEAR_CLIMB' : null;
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

  /** `YYYY-MM-DD` of the latest live session from the day's template, if any. */
  lastDoneOf(day: ForecastDay): string | null {
    const planId = day.plan?.id;
    const dates = this.sessionRepository
      .items()
      .filter((session) => !session.deleted && session.planId === planId)
      .map((session) => session.date)
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }

  /** `WEEK_DAYS` key of a date (for the `WORKOUT.WEEKLY.DAY.*` label). */
  weekdayOf(date: string): string {
    return WEEK_DAYS[weekDates(mondayOf(date)).indexOf(date)];
  }

  /** backlog/054 — every active template, `goalLabel` groups first (alphabetical), ungrouped last. */
  async openPlanPicker(): Promise<void> {
    const plans = this.planRepository
      .activePlans()
      .map((plan) => ({ plan, group: planGroupKey(plan) }))
      .sort((a, b) => (a.group === b.group ? 0 : a.group === null ? 1 : b.group === null ? -1 : a.group.localeCompare(b.group)));
    const sheet = await this.actionSheetController.create({
      header: this.translate.instant('WORKOUT.LOG.QUICK.PICK_PLAN'),
      buttons: [
        ...plans.map(({ plan, group }) => ({
          text: group === null ? plan.name : `${group} · ${plan.name}`,
          handler: () => void this.router.navigate([ACTIVE_ROUTE], { queryParams: { planId: plan.id } }),
        })),
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }
}
