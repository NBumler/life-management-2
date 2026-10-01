import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActionSheetController, IonButton } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { ClimbingSessionRepository } from '../../../core/data/climbing-session.repository';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { today } from '../../../shared/local-date';
import { loadWarningsFor } from '../load-warnings';
import { planGroupKey } from '../plan/plan-group-activation';
import { doneToday, planHasFingerLoad, suggestNextPlan, todaySlotPlan } from '../rotation-suggestion';

const ACTIVE_ROUTE = '/tabs/workout/log/active';

/**
 * documentation/Subfeatures/Edzésnapló.md "Terv indítása" (backlog/054 + backlog/139) — the Edzésnapló
 * dashboard's plan quick start: today's weekly slot (takes precedence), the rotation's "next suggested"
 * template (least recently done active one), a rest / prehab hint when the load rules say so, and a
 * picker over every active template. All one-tap starts preload the live view via `?planId=`.
 */
@Component({
  selector: 'app-plan-quick-start',
  template: `
    @if (hasPlans()) {
      <div class="quick-start">
        @if (restHint()) {
          <p class="rest-hint">{{ 'WORKOUT.LOG.QUICK.REST_HINT' | translate }}</p>
        }
        @if (todayPlan(); as plan) {
          <div class="qs-row">
            <div class="qs-text">
              <span class="qs-label">{{ 'WORKOUT.LOG.QUICK.TODAY_SLOT' | translate }}</span>
              <strong>{{ plan.name }}</strong>
            </div>
            <ion-button size="small" [fill]="restHint() ? 'outline' : 'solid'" [routerLink]="activeRoute" [queryParams]="{ planId: plan.id }">
              {{ 'WORKOUT.LOG.QUICK.START' | translate }}
            </ion-button>
          </div>
          @if (todayPlanFingerWarning()) {
            <p class="finger-note">{{ 'WORKOUT.LOG.QUICK.SLOT_FINGERS_NEAR_CLIMB' | translate }}</p>
          }
        }
        @if (rotation(); as rotationResult) {
          @let next = rotationResult.candidate;
          <div class="qs-row">
            <div class="qs-text">
              <span class="qs-label">
                {{ (todayPlan() ? 'WORKOUT.LOG.QUICK.ALTERNATIVE' : 'WORKOUT.LOG.QUICK.NEXT') | translate }}
              </span>
              <strong>{{ next.plan.name }}</strong>
              <span class="qs-sub">
                @if (next.lastDate) {
                  {{ 'WORKOUT.LOG.QUICK.LAST_DONE' | translate: { date: next.lastDate } }}
                } @else {
                  {{ 'WORKOUT.LOG.QUICK.NEVER_DONE' | translate }}
                }
              </span>
            </div>
            <ion-button
              size="small"
              [fill]="todayPlan() || restHint() ? 'outline' : 'solid'"
              [routerLink]="activeRoute"
              [queryParams]="{ planId: next.plan.id }"
            >
              {{ 'WORKOUT.LOG.QUICK.START' | translate }}
            </ion-button>
          </div>
          @if (rotationResult.fingerFallback) {
            <p class="finger-note">{{ 'WORKOUT.LOG.QUICK.ALL_PLANS_HAVE_FINGERS' | translate }}</p>
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
      .rest-hint {
        margin: 4px 0 8px;
        font-size: 0.875rem;
        color: var(--ion-color-warning-shade);
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
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly activeRoute = ACTIVE_ROUTE;
  private readonly todayIso = today();

  readonly hasPlans = computed(() => this.planRepository.items().some((plan) => !plan.deleted && plan.active));

  /** Today's weekly slot plan — hidden once a session from it is logged today. */
  readonly todayPlan = computed(() => {
    const plan = todaySlotPlan(this.weeklyRepository.items(), this.planRepository.items(), this.todayIso);
    return plan !== null && plan.active && !doneToday(this.sessionRepository.items(), plan.id, this.todayIso) ? plan : null;
  });

  /** backlog/138 / backlog/143 — today's load rules, planned climbs and the weekly schedule included. */
  private readonly warningCodes = computed(
    () =>
      new Set(
        loadWarningsFor(this.todayIso, {
          climbingSessions: this.climbingRepository.items(),
          workoutSessions: this.sessionRepository.items(),
          events: this.eventRepository.items(),
          weeklyPlans: this.weeklyRepository.items(),
          workoutPlans: this.planRepository.items(),
        }).map((warning) => warning.code),
      ),
  );

  /** A climb today (logged or planned) or tomorrow (planned) — finger work is not suggested (backlog/143). */
  private readonly avoidFingers = computed(() => {
    const codes = this.warningCodes();
    return codes.has('CLIMBED_TODAY') || codes.has('CLIMB_PLANNED_TODAY') || codes.has('CLIMB_TOMORROW');
  });

  /**
   * backlog/139 — the rotation's next template; only an alternative when today has a slot. backlog/143:
   * near a climb, finger-loading templates are skipped (or flagged when nothing else is left).
   */
  readonly rotation = computed(() =>
    suggestNextPlan(this.planRepository.items(), this.sessionRepository.items(), this.todayIso, {
      excludeId: this.todayPlan()?.id ?? null,
      avoidFingers: this.avoidFingers(),
    }),
  );

  /** backlog/143 — today's slot is a finger day, but there is a climb today / tomorrow. */
  readonly todayPlanFingerWarning = computed(() => {
    const plan = this.todayPlan();
    return plan !== null && this.avoidFingers() && planHasFingerLoad(plan);
  });

  /** backlog/138 "nincs pihenőnap" / "mászónap" (logged or planned, backlog/143) — shown first; the starts stay available. */
  readonly restHint = computed(() => {
    const codes = this.warningCodes();
    return codes.has('NO_REST_DAY') || codes.has('CLIMBED_TODAY') || codes.has('CLIMB_PLANNED_TODAY');
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
