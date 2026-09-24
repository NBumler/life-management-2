import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
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
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { today } from '../../../shared/local-date';
import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { WEEK_DAYS, addLocalDays, isSlotCompleted, mondayOf, resolveEffectiveWeek } from './weekly-plan-adherence';

/**
 * backlog/127 — how an edit applies: `FROM_NOW` saves this week's schedule, which every later week
 * without its own row then inherits; `THIS_WEEK_ONLY` is a one-off exception — the following week is
 * pinned to the schedule that applied before the edit, so it resumes there.
 */
export type WeeklyEditMode = 'FROM_NOW' | 'THIS_WEEK_ONLY';

interface DayCell {
  dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum;
  date: string;
  /** This week's own slot id for the day; null when the day has no own live slot (none, or inherited). */
  slotId: string | null;
  planId: string | null;
  planName: string | null;
  completed: boolean;
}

/**
 * documentation/Subfeatures/Heti terv.md "Heti dashboard" — a 7-day view of the current calendar
 * week: assign an active template to each day, a "Teljesítve" badge per adherence
 * (`weekly-plan-adherence.ts`), a thumb-zone "Edzés indítása" CTA that opens the live view preloaded
 * from the plan, plus prev/next week nav. backlog/127: a week without its own schedule inherits the
 * last earlier one (`resolveEffectiveWeek`); an edit applies "from now" or "only this week".
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
      .schedule-meta {
        padding: 0 16px 8px;
      }
      .inherited-note {
        display: block;
        margin-bottom: 8px;
      }
    `,
  ],
  imports: [
    RouterLink,
    IonHeader,
    IonContent,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonButtons,
    IonIcon,
    IonSelect,
    IonSelectOption,
    WorkoutSegmentHeaderComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyPlanPage implements OnInit, ViewWillEnter {
  private readonly planRepository = inject(WorkoutPlanRepository);
  private readonly weeklyRepository = inject(WeeklyPlanRepository);
  private readonly sessionRepository = inject(WorkoutSessionRepository);

  readonly weekStart = signal(mondayOf(today()));

  readonly activePlans = computed(() => this.planRepository.activePlans());

  readonly effective = computed(() => resolveEffectiveWeek(this.weeklyRepository.items(), this.weekStart()));

  readonly editMode = signal<WeeklyEditMode>('FROM_NOW');

  readonly days = computed<DayCell[]>(() => {
    const start = this.weekStart();
    const effective = this.effective();
    const slots = effective.slots;
    const sessions = this.sessionRepository.items();
    const plans = this.planRepository.items();
    return WEEK_DAYS.map((dayOfWeek, index) => {
      const slot = slots.find((entry) => entry.dayOfWeek === dayOfWeek) ?? null;
      const planId = slot?.planId ?? null;
      const plan = planId === null ? undefined : plans.find((entry) => entry.id === planId && !entry.deleted);
      return {
        dayOfWeek,
        date: addLocalDays(start, index),
        // an inherited slot row belongs to another week — never carry its id into this week's save
        slotId: effective.inherited ? null : (slot?.id ?? null),
        planId,
        planName: plan?.name ?? (planId !== null ? '—' : null),
        completed: planId !== null && isSlotCompleted(sessions, start, planId),
      };
    });
  });


  async ngOnInit(): Promise<void> {
    await Promise.all([this.planRepository.load(), this.weeklyRepository.load(), this.sessionRepository.load()]);
  }

  ionViewWillEnter(): void {
    void this.sessionRepository.reload();
  }

  shiftWeek(deltaWeeks: number): void {
    this.weekStart.set(addLocalDays(this.weekStart(), deltaWeeks * 7));
  }

  goToday(): void {
    this.weekStart.set(mondayOf(today()));
  }

  /**
   * Assign / change / clear a day. `planId === ''` (the "none" option) clears the slot. The whole
   * week's effective schedule (own or inherited) is saved as this week's own row.
   */
  async assignDay(day: DayCell, planId: string): Promise<void> {
    const next = planId === '' ? null : planId;
    if (next === day.planId) {
      return;
    }
    const weekStart = this.weekStart();
    const before = this.days();
    if (this.editMode() === 'THIS_WEEK_ONLY') {
      await this.pinFollowingWeek(weekStart, before);
    }
    // Carry each day's own slot id through so re-assigning a day updates the same row (and undeletes
    // it if it was cleared before) instead of relying on the deterministic-id fallback.
    const slots = before
      .map((cell) => ({
        dayOfWeek: cell.dayOfWeek,
        planId: cell.dayOfWeek === day.dayOfWeek ? next : cell.planId,
        id: cell.slotId ?? undefined,
      }))
      .filter((cell): cell is { dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum; planId: string; id: string | undefined } => cell.planId !== null);
    await this.weeklyRepository.saveWeek(weekStart, slots);
  }

  /**
   * "Csak erre a hétre": unless the following week already has its own schedule, give it one equal to
   * what applied before this edit — otherwise it would inherit the exception.
   */
  private async pinFollowingWeek(weekStart: string, before: DayCell[]): Promise<void> {
    const nextWeekStart = addLocalDays(weekStart, 7);
    if (this.weeklyRepository.byWeekStart(nextWeekStart) !== undefined) {
      return;
    }
    await this.weeklyRepository.saveWeek(
      nextWeekStart,
      before
        .filter((cell) => cell.planId !== null)
        .map((cell) => ({ dayOfWeek: cell.dayOfWeek, planId: cell.planId as string })),
    );
  }
}
