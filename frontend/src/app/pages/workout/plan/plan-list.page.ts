import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';

type PlanFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

interface PlanGroup {
  label: string | null;
  plans: WorkoutPlan[];
}

/**
 * documentation/Subfeatures/Heti terv.md "Sablonok lista" — the template catalog. Aktív / Inaktív /
 * Mind filter (default Aktív), a per-row active toggle (no edit-mode needed), optional `goalLabel`
 * group headers. Tapping a row opens the nested editor.
 */
@Component({
  selector: 'app-plan-list',
  templateUrl: 'plan-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonToggle,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanListPage implements OnInit {
  private readonly repository = inject(WorkoutPlanRepository);

  readonly filter = signal<PlanFilter>('ACTIVE');

  readonly groups = computed<PlanGroup[]>(() => {
    const filter = this.filter();
    const plans = this.repository
      .items()
      .filter((plan) => !plan.deleted)
      .filter((plan) => (filter === 'ALL' ? true : filter === 'ACTIVE' ? plan.active : !plan.active));

    const byLabel = new Map<string | null, WorkoutPlan[]>();
    for (const plan of plans) {
      const key = plan.goalLabel?.trim() ? plan.goalLabel.trim() : null;
      const list = byLabel.get(key) ?? [];
      list.push(plan);
      byLabel.set(key, list);
    }
    return [...byLabel.entries()]
      .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
      .map(([label, groupPlans]) => ({ label, plans: groupPlans }));
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.groups().length === 0);
  readonly liveExerciseCount = (plan: WorkoutPlan): number => plan.exercises.filter((exercise) => !exercise.deleted).length;

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  setFilter(value: string): void {
    this.filter.set(value as PlanFilter);
  }

  async toggleActive(plan: WorkoutPlan, active: boolean): Promise<void> {
    if (plan.active !== active) {
      await this.repository.setActive(plan, active);
    }
  }
}
