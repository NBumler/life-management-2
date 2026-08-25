import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { LifePlan } from '../../../api/model/lifePlan';
import { LifePlanRepository } from '../../../core/data/life-plan.repository';
import { matchesSearch } from '../../../shared/text-search';
import { groupLifePlans, isLifePlanOverdue, lifePlanLagDays } from './life-plan-sections';

/** documentation/Subfeatures/Élet tervek.md: hub tile list — sections Folyamatban / Terv / Kész, search, no checkbox (tap row -> editor). */
@Component({
  selector: 'app-life-plan-list',
  templateUrl: 'life-plan-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifePlanListPage implements OnInit {
  private readonly repository = inject(LifePlanRepository);

  readonly query = signal('');
  private readonly today = new Date().toISOString().slice(0, 10);

  private readonly filteredPlans = computed(() => {
    const query = this.query();
    return this.repository.items().filter((plan) => matchesSearch(query, plan.title) || matchesSearch(query, plan.notes ?? ''));
  });

  readonly sections = computed(() => groupLifePlans(this.filteredPlans(), this.today));
  readonly isEmpty = computed(() => this.repository.items().length === 0);
  readonly hasNoResults = computed(() => !this.isEmpty() && this.filteredPlans().length === 0);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  isOverdue(plan: LifePlan): boolean {
    return isLifePlanOverdue(plan, this.today);
  }

  lagDays(plan: LifePlan): number {
    return plan.targetDate === null || plan.targetDate === undefined ? 0 : lifePlanLagDays(plan.targetDate, this.today);
  }
}
