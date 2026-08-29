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
import { WEEK_DAYS, addLocalDays, isSlotCompleted, mondayOf } from './weekly-plan-adherence';

interface DayCell {
  dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum;
  date: string;
  /** The existing slot's id for this day, or null when the day has no live slot yet. */
  slotId: string | null;
  planId: string | null;
  planName: string | null;
  completed: boolean;
}

/**
 * documentation/Subfeatures/Heti terv.md "Heti dashboard" — a 7-day view of the current calendar
 * week: assign an active template to each day, a "Teljesítve" badge per adherence
 * (`weekly-plan-adherence.ts`), a thumb-zone "Edzés indítása" CTA that opens the live view preloaded
 * from the plan, plus prev/next week nav and "Másolás következő hétre".
 */
@Component({
  selector: 'app-weekly-plan',
  templateUrl: 'weekly-plan.page.html',
  imports: [
    RouterLink,
    IonHeader,
    IonContent,
    IonList,
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

  readonly week = computed(() => this.weeklyRepository.byWeekStart(this.weekStart()));

  readonly days = computed<DayCell[]>(() => {
    const start = this.weekStart();
    const slots = (this.week()?.slots ?? []).filter((slot) => !slot.deleted);
    const sessions = this.sessionRepository.items();
    const plans = this.planRepository.items();
    return WEEK_DAYS.map((dayOfWeek, index) => {
      const slot = slots.find((entry) => entry.dayOfWeek === dayOfWeek) ?? null;
      const planId = slot?.planId ?? null;
      const plan = planId === null ? undefined : plans.find((entry) => entry.id === planId && !entry.deleted);
      return {
        dayOfWeek,
        date: addLocalDays(start, index),
        slotId: slot?.id ?? null,
        planId,
        planName: plan?.name ?? (planId !== null ? '—' : null),
        completed: planId !== null && isSlotCompleted(sessions, start, planId),
      };
    });
  });

  readonly hasAnySlot = computed(() => this.days().some((day) => day.planId !== null));

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

  /** Assign / change / clear a day. `planId === ''` (the "none" option) clears the slot. */
  async assignDay(day: DayCell, planId: string): Promise<void> {
    const next = planId === '' ? null : planId;
    if (next === day.planId) {
      return;
    }
    // Carry each day's existing slot id through so re-assigning a day updates the same row (and
    // undeletes it if it was cleared before) instead of relying on the deterministic-id fallback.
    const slots = this.days()
      .map((cell) => ({
        dayOfWeek: cell.dayOfWeek,
        planId: cell.dayOfWeek === day.dayOfWeek ? next : cell.planId,
        id: cell.slotId ?? undefined,
      }))
      .filter((cell): cell is { dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum; planId: string; id: string | undefined } => cell.planId !== null);
    await this.weeklyRepository.saveWeek(this.weekStart(), slots);
  }

  async copyToNextWeek(): Promise<void> {
    const current = this.days().filter((day) => day.planId !== null);
    if (current.length === 0) {
      return;
    }
    const nextWeekStart = addLocalDays(this.weekStart(), 7);
    await this.weeklyRepository.saveWeek(
      nextWeekStart,
      current.map((day) => ({ dayOfWeek: day.dayOfWeek, planId: day.planId as string })),
    );
    this.weekStart.set(nextWeekStart);
  }
}
