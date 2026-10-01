import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ActionSheetController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { GroupActivationMode, planGroupActivationChanges, planGroupKey } from './plan-group-activation';

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
    IonIcon,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanListPage implements OnInit {
  private readonly repository = inject(WorkoutPlanRepository);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  readonly filter = signal<PlanFilter>('ACTIVE');

  readonly groups = computed<PlanGroup[]>(() => {
    const filter = this.filter();
    const plans = this.repository
      .items()
      .filter((plan) => !plan.deleted)
      .filter((plan) => (filter === 'ALL' ? true : filter === 'ACTIVE' ? plan.active : !plan.active));

    const byLabel = new Map<string | null, WorkoutPlan[]>();
    for (const plan of plans) {
      const key = planGroupKey(plan);
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

  /** backlog/140 — the `goalLabel` group header's ⋮ menu: one-tap focus switch (e.g. "OAPU mód"). */
  async openGroupMenu(label: string): Promise<void> {
    const option = (mode: GroupActivationMode, key: string) => ({
      text: this.translate.instant(key),
      handler: () => void this.applyGroupActivation(label, mode),
    });
    const sheet = await this.actionSheetController.create({
      header: label,
      buttons: [
        option('ACTIVATE', 'WORKOUT.PLAN.GROUP_ACTIVATE'),
        option('DEACTIVATE', 'WORKOUT.PLAN.GROUP_DEACTIVATE'),
        option('ONLY', 'WORKOUT.PLAN.GROUP_ONLY'),
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** Each changed template goes through the regular nested-PUT `setActive` (local write + outbox). */
  async applyGroupActivation(label: string, mode: GroupActivationMode): Promise<void> {
    const changes = planGroupActivationChanges(this.repository.items(), label, mode);
    for (const change of changes) {
      await this.repository.setActive(change.plan, change.active);
    }
    const toast = await this.toastController.create({
      message: this.translate.instant('WORKOUT.PLAN.GROUP_CHANGED', { count: changes.length }),
      duration: 2000,
    });
    await toast.present();
  }
}
