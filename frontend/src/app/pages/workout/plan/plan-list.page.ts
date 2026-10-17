import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ActionSheetController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
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
  NavController,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { StretchPlan } from '../../../api/model/stretchPlan';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { StretchPlanRepository, liveStretchItems } from '../../../core/data/stretch-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { EXERCISE_TYPES, EXERCISE_TYPE_LABEL_KEYS, ExerciseType, toggleInSet } from '../exercises/catalog-filter';
import { stretchPlanDurationMinutes } from '../stretch/stretch-timing';
import { GroupActivationMode, planGroupActivationChanges, planGroupKey } from './plan-group-activation';

type PlanFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

/** backlog/168 — one row of the merged template list: a strength or a stretching template. */
export type TemplateEntry = { type: 'STRENGTH'; plan: WorkoutPlan } | { type: 'STRETCH'; plan: StretchPlan };

interface PlanGroup {
  label: string | null;
  entries: TemplateEntry[];
}

/**
 * documentation/Subfeatures/Heti terv.md "Sablonok lista" — the template catalog, strength and
 * stretching templates together (backlog/168). Aktív / Inaktív / Mind filter (default Aktív), type
 * chips (Erősítés / Nyújtás, multi-select like the Gyakorlat catalog), a per-row active toggle,
 * optional `goalLabel` group headers shared by both types. Tapping a row opens its own editor.
 */
@Component({
  selector: 'app-plan-list',
  templateUrl: 'plan-list.page.html',
  styles: [
    `
    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 12px 6px;
    }
  `,
  ],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonChip,
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
  private readonly stretchRepository = inject(StretchPlanRepository);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly navController = inject(NavController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  readonly types = EXERCISE_TYPES;
  readonly typeLabelKeys = EXERCISE_TYPE_LABEL_KEYS;
  /** backlog/168 — `edzes.nyujtas` off: no stretching rows, no type chips, "Új sablon" goes straight to strength. */
  readonly stretchEnabled = this.featureFlags.isEnabled('edzes.nyujtas');

  readonly filter = signal<PlanFilter>('ACTIVE');
  readonly typeFilter = signal<ReadonlySet<ExerciseType>>(new Set());

  private readonly entries = computed<TemplateEntry[]>(() => {
    const strength: TemplateEntry[] = this.repository.items().map((plan) => ({ type: 'STRENGTH', plan }));
    const stretch: TemplateEntry[] = this.stretchEnabled
      ? this.stretchRepository.items().map((plan) => ({ type: 'STRETCH', plan }))
      : [];
    return [...strength, ...stretch].filter((entry) => !entry.plan.deleted);
  });

  readonly groups = computed<PlanGroup[]>(() => {
    const filter = this.filter();
    const types = this.typeFilter();
    const entries = this.entries()
      .filter((entry) => types.size === 0 || types.has(entry.type))
      .filter((entry) => (filter === 'ALL' ? true : filter === 'ACTIVE' ? entry.plan.active : !entry.plan.active));

    const byLabel = new Map<string | null, TemplateEntry[]>();
    for (const entry of entries) {
      const key = planGroupKey(entry.plan);
      const list = byLabel.get(key) ?? [];
      list.push(entry);
      byLabel.set(key, list);
    }
    return [...byLabel.entries()]
      .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
      .map(([label, groupEntries]) => ({ label, entries: groupEntries }));
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.groups().length === 0);
  readonly liveExerciseCount = (plan: WorkoutPlan): number => plan.exercises.filter((exercise) => !exercise.deleted).length;
  readonly liveItemCount = (plan: StretchPlan): number => liveStretchItems(plan).length;
  readonly stretchMinutes = (plan: StretchPlan): number => stretchPlanDurationMinutes(liveStretchItems(plan));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.stretchEnabled ? this.stretchRepository.load() : Promise.resolve()]);
  }

  setFilter(value: string): void {
    this.filter.set(value as PlanFilter);
  }

  toggleType(type: ExerciseType): void {
    this.typeFilter.update((current) => toggleInSet(current, type));
  }

  rowLink(entry: TemplateEntry): string[] {
    return entry.type === 'STRETCH' ? ['stretch', entry.plan.id] : [entry.plan.id];
  }

  trackEntry(entry: TemplateEntry): string {
    return `${entry.type}:${entry.plan.id}`;
  }

  asStrength(entry: TemplateEntry): WorkoutPlan | null {
    return entry.type === 'STRENGTH' ? entry.plan : null;
  }

  asStretch(entry: TemplateEntry): StretchPlan | null {
    return entry.type === 'STRETCH' ? entry.plan : null;
  }

  async toggleActive(entry: TemplateEntry, active: boolean): Promise<void> {
    if (entry.plan.active === active) {
      return;
    }
    if (entry.type === 'STRETCH') {
      await this.stretchRepository.setActive(entry.plan, active);
    } else {
      await this.repository.setActive(entry.plan, active);
    }
  }

  /** backlog/168 — "Új sablon": pick the type first (strength only when stretching is off). */
  async addTemplate(): Promise<void> {
    if (!this.stretchEnabled) {
      await this.navController.navigateForward('/tabs/workout/weekly-plan/plans/new');
      return;
    }
    const sheet = await this.actionSheetController.create({
      header: this.translate.instant('WORKOUT.PLAN.ADD'),
      buttons: [
        {
          text: this.translate.instant('WORKOUT.PLAN.ADD_STRENGTH'),
          handler: () => void this.navController.navigateForward('/tabs/workout/weekly-plan/plans/new'),
        },
        {
          text: this.translate.instant('WORKOUT.PLAN.ADD_STRETCH'),
          handler: () => void this.navController.navigateForward('/tabs/workout/weekly-plan/plans/stretch/new'),
        },
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
      ],
    });
    await sheet.present();
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

  /**
   * Each changed template goes through its own regular nested-PUT `setActive` (local write + outbox).
   * backlog/168: strength and stretching templates of the same label form one group.
   */
  async applyGroupActivation(label: string, mode: GroupActivationMode): Promise<void> {
    const strengthChanges = planGroupActivationChanges(this.repository.items(), label, mode);
    const stretchChanges = this.stretchEnabled ? planGroupActivationChanges(this.stretchRepository.items(), label, mode) : [];
    for (const change of strengthChanges) {
      await this.repository.setActive(change.plan, change.active);
    }
    for (const change of stretchChanges) {
      await this.stretchRepository.setActive(change.plan, change.active);
    }
    const toast = await this.toastController.create({
      message: this.translate.instant('WORKOUT.PLAN.GROUP_CHANGED', { count: strengthChanges.length + stretchChanges.length }),
      duration: 2000,
    });
    await toast.present();
  }
}
