import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ProfileRepository } from '../../../core/data/profile.repository';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { today } from '../../../shared/local-date';
import { computeNetPay } from '../../../shared/net-pay-calculator';
import { sumMonthlyEquivalentHuf } from './recurring-expense-math';

/**
 * documentation/Features/Pénzügyek.md — the hub. Consumer only: no entity, no OpenAPI, no formula of
 * its own. Three cards, each a number or `~` per the shared "hiányos → `~`" pattern:
 *   1. Nettó — computeNetPay(profile); `~` only when gross is empty. → net-pay
 *   2. Havi kiadások — Σ monthlyEquivalentHuf over the counts-in rows; empty → 0 Ft, never `~`. → recurring-expenses
 *   3. Maradék — net − havi kiadás (signed, no clamp) when net is a number, else `~`. → recurring-expenses
 */
@Component({
  selector: 'app-finance-dashboard',
  templateUrl: 'finance-dashboard.page.html',
  styleUrl: 'finance-dashboard.page.scss',
  imports: [
    RouterLink,
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceDashboardPage implements OnInit {
  private readonly profileRepository = inject(ProfileRepository);
  private readonly recurringExpenseRepository = inject(RecurringExpenseRepository);

  private readonly netPay = computed(() =>
    computeNetPay(
      {
        grossMonthlySalaryHuf: this.profileRepository.profile()?.grossMonthlySalaryHuf ?? null,
        birthDate: this.profileRepository.profile()?.birthDate ?? null,
      },
      today(),
    ),
  );

  /** number, or null when gross is empty (rendered as `~`). */
  readonly netHuf = computed<number | null>(() => {
    const calc = this.netPay();
    return calc.computable ? calc.net : null;
  });

  readonly monthlyExpensesHuf = computed(() =>
    sumMonthlyEquivalentHuf(this.recurringExpenseRepository.items()),
  );

  /** number (signed, no clamp), or null when net is `~`. */
  readonly remainderHuf = computed<number | null>(() => {
    const net = this.netHuf();
    return net === null ? null : net - this.monthlyExpensesHuf();
  });

  async ngOnInit(): Promise<void> {
    // Both are `providedIn: 'root'` singletons — skip the re-query/re-fetch when a sibling finance
    // screen already loaded them (same guard as recurring-expense-edit.page.ts).
    const loads: Promise<void>[] = [];
    if (!this.profileRepository.loaded()) {
      loads.push(this.profileRepository.load());
    }
    if (!this.recurringExpenseRepository.loaded()) {
      loads.push(this.recurringExpenseRepository.load());
    }
    await Promise.all(loads);
  }
}
