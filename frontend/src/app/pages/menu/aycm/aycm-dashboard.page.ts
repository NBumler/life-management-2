import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ActionSheetButton,
  ActionSheetController,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { AycmCheckInRepository } from '../../../core/data/aycm-check-in.repository';
import { AycmSettingsRepository } from '../../../core/data/aycm-settings.repository';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { today } from '../../../shared/local-date';
import { monthlyEquivalentHuf } from '../finance/recurring-expense-math';
import { linkedCountingExpense, passCostComputable, passCostHuf, worthItHuf } from './aycm-pass-cost';
import { filterCheckIns, summarize, windowRange } from './aycm-stats';

const HUB_URL = '/tabs/menu/aycm';
const CHECK_IN_URL = '/tabs/menu/aycm/check-in';
const NEW_EXPENSE_URL = '/tabs/menu/finance/recurring-expenses/new';

/**
 * documentation/Features/AYCM tracker.md — the hub. Pure consumer (finance P3 pattern): no entity,
 * no OpenAPI, no offline wiring of its own. Four cards over the current calendar month's live
 * Check-Ins (client TZ) plus the linked monthly pass:
 *   1. E havi látogatások — count (always a number, 0 OK).
 *   2. E havi érték — Σ visitValueHuf (always a number, 0 Ft, never `~`).
 *   3. Megéri-e — `passCostComputable` → signed `Σ − monthlyEquivalentHuf` Ft, else `~`. Tap → stats.
 *   4. Bérlet — linked expense name + monthly equivalent when `passCostComputable`, else `~` + a
 *      picker (only "beszámított" rows; clear allowed) / a deep-link to create a RecurringExpense.
 * The deep-link round-trips through `?returnTo` / `?createdExpenseId` (see the spec's "Visszatérés
 * mechanizmusa"): the create form navigates back here with the new id, which we auto-link and strip.
 */
@Component({
  selector: 'app-aycm-dashboard',
  templateUrl: 'aycm-dashboard.page.html',
  styleUrl: 'aycm-dashboard.page.scss',
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
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonFab,
    IonFabButton,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AycmDashboardPage implements OnInit, ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly translate = inject(TranslateService);
  private readonly checkInRepo = inject(AycmCheckInRepository);
  private readonly settingsRepo = inject(AycmSettingsRepository);
  private readonly expenseRepo = inject(RecurringExpenseRepository);
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly financeEnabled = this.featureFlags.isEnabled('menu.penzugyek');

  private readonly monthRange = computed(() => windowRange('THIS_MONTH', today()));
  private readonly monthCheckIns = computed(() =>
    filterCheckIns(this.checkInRepo.checkIns(), this.monthRange().from, this.monthRange().to),
  );
  private readonly summary = computed(() => summarize(this.monthCheckIns()));

  readonly visitCount = computed(() => this.summary().visitCount);
  readonly visitValueSumHuf = computed(() => this.summary().visitValueSumHuf);

  readonly passComputable = computed(() =>
    passCostComputable(this.financeEnabled, this.settingsRepo.settings(), this.expenseRepo.items()),
  );

  /** Signed whole Ft, or null → the `~` state (Pénzügyek flag off / no counting link). */
  readonly worthItHuf = computed<number | null>(() => {
    if (!this.passComputable()) {
      return null;
    }
    const passCost = passCostHuf(this.settingsRepo.settings(), this.expenseRepo.items(), this.monthRange().monthCount);
    return worthItHuf(this.visitValueSumHuf(), passCost);
  });

  private readonly linkedExpense = computed(() =>
    linkedCountingExpense(this.settingsRepo.settings(), this.expenseRepo.items()),
  );
  readonly linkedExpenseName = computed(() => this.linkedExpense()?.name ?? null);
  readonly linkedExpenseMonthlyHuf = computed<number | null>(() => {
    const row = this.linkedExpense();
    return row ? monthlyEquivalentHuf(row) : null;
  });

  async ngOnInit(): Promise<void> {
    await this.loadAll();
    await this.consumeCreatedExpenseParam();
  }

  ionViewWillEnter(): void {
    void this.ngOnInit();
  }

  /**
   * Reload unconditionally on every entry (not `!loaded()`-guarded): Ionic keeps the page alive
   * across tab switches, so `ngOnInit` runs once — without this a Check-In / pass change that landed
   * via a background sync pull (SQLite updated, repository signals not) would never reach the cards.
   */
  private async loadAll(): Promise<void> {
    const loads: Promise<void>[] = [this.checkInRepo.load(), this.settingsRepo.load()];
    if (this.financeEnabled) {
      loads.push(this.expenseRepo.load());
    }
    await Promise.all(loads);
  }

  /**
   * The Rendszeres kiadások create form navigates back here with `?createdExpenseId=<uuid>` after a
   * save. Auto-link it, then strip the param (`replaceUrl`) so a page re-entry can't re-apply it.
   */
  private async consumeCreatedExpenseParam(): Promise<void> {
    const createdId = this.route.snapshot.queryParamMap.get('createdExpenseId');
    if (createdId === null || !this.financeEnabled) {
      return;
    }
    await this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    if (!this.expenseRepo.loaded()) {
      await this.expenseRepo.load();
    }
    await this.settingsRepo.linkExpense(createdId);
  }

  /** documentation/AYCM tracker.md "FAB": today already has a live Check-In → open its editor, not a 2nd create. */
  openCheckIn(): void {
    const hasToday = this.checkInRepo.checkInForDate(today()) !== null;
    void this.router.navigate([CHECK_IN_URL], hasToday ? { queryParams: { date: today() } } : {});
  }

  async openPass(): Promise<void> {
    if (!this.financeEnabled) {
      return;
    }
    const counting = this.expenseRepo.items().filter((e) => !e.deleted && e.active);
    const currentId = this.settingsRepo.settings()?.linkedRecurringExpenseId ?? null;

    const buttons: ActionSheetButton[] = counting.map((e) => ({
      text: this.translate.instant('AYCM.DASHBOARD.PICKER_OPTION', {
        name: e.name,
        amount: monthlyEquivalentHuf(e),
      }),
      handler: () => void this.settingsRepo.linkExpense(e.id),
    }));
    if (currentId !== null) {
      buttons.push({
        text: this.translate.instant('AYCM.DASHBOARD.PICKER_CLEAR'),
        role: 'destructive',
        handler: () => void this.settingsRepo.linkExpense(null),
      });
    }
    buttons.push({
      text: this.translate.instant('AYCM.DASHBOARD.PICKER_NEW_EXPENSE'),
      handler: () => void this.router.navigate([NEW_EXPENSE_URL], { queryParams: { returnTo: HUB_URL } }),
    });
    buttons.push({ text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' });

    const sheet = await this.actionSheetController.create({
      header: this.translate.instant('AYCM.DASHBOARD.PICKER_HEADER'),
      buttons,
    });
    await sheet.present();
  }
}
