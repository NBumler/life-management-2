import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AycmCheckInRepository } from '../../../core/data/aycm-check-in.repository';
import { AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { AycmSettingsRepository } from '../../../core/data/aycm-settings.repository';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { today } from '../../../shared/local-date';
import { passCostComputable, passCostHuf, worthItHuf } from './aycm-pass-cost';
import {
  StatsWindow,
  allTimeRange,
  customRange,
  filterCheckIns,
  groupByPartner,
  summarize,
  visitList,
  windowRange,
} from './aycm-stats';

const CHECK_IN_URL = '/tabs/menu/aycm/check-in';

/**
 * documentation/Subfeatures/AYCM Statisztikák.md — read-only. Preset + custom + all-time windows over
 * the live AycmCheckIn snapshots: a summary (count / Σ value / "megéri-e" or `~` / Σ co-payment), a
 * per-partner breakdown, a monthly chart and a visit list. No entity, no OpenAPI, no outbox — every
 * number is a pure-TS computation.
 */
@Component({
  selector: 'app-aycm-stats',
  templateUrl: 'aycm-stats.page.html',
  imports: [
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AycmStatsPage implements OnInit, ViewWillEnter {
  private readonly router = inject(Router);
  private readonly checkInRepo = inject(AycmCheckInRepository);
  private readonly partnerRepo = inject(AycmPartnerRepository);
  private readonly settingsRepo = inject(AycmSettingsRepository);
  private readonly expenseRepo = inject(RecurringExpenseRepository);
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly window = signal<StatsWindow>('THIS_MONTH');
  readonly windows: readonly StatsWindow[] = [
    'THIS_MONTH',
    'PREV_MONTH',
    'LAST_3_MONTHS',
    'THIS_YEAR',
    'ALL_TIME',
    'CUSTOM',
  ];

  /** CUSTOM window endpoints (`YYYY-MM-DD`), seeded to the running calendar month. */
  readonly customFrom = signal(windowRange('THIS_MONTH', today()).from);
  readonly customTo = signal(windowRange('THIS_MONTH', today()).to);
  /** The user typed a start after the end — the range still works (endpoints swap), but flag it. */
  readonly customRangeReversed = computed(() => this.customFrom() > this.customTo());

  private readonly range = computed(() => {
    const w = this.window();
    if (w === 'CUSTOM') {
      return customRange(this.customFrom(), this.customTo());
    }
    if (w === 'ALL_TIME') {
      return allTimeRange(this.checkInRepo.checkIns(), today());
    }
    return windowRange(w, today());
  });
  private readonly windowCheckIns = computed(() => {
    const { from, to } = this.range();
    return filterCheckIns(this.checkInRepo.checkIns(), from, to);
  });

  readonly summary = computed(() => summarize(this.windowCheckIns()));
  readonly breakdown = computed(() => groupByPartner(this.windowCheckIns(), this.partnerRepo.partners()));
  readonly visits = computed(() => visitList(this.windowCheckIns(), this.partnerRepo.partners()));

  /** Mean co-payment per visit (whole Ft), or null for an empty window. */
  readonly coPaymentAvgHuf = computed<number | null>(() => {
    const { visitCount, coPaymentSumHuf } = this.summary();
    return visitCount === 0 ? null : Math.round(coPaymentSumHuf / visitCount);
  });

  private readonly financeEnabled = this.featureFlags.isEnabled('menu.penzugyek');

  readonly passComputable = computed(() =>
    passCostComputable(this.financeEnabled, this.settingsRepo.settings(), this.expenseRepo.items()),
  );

  /** Signed whole Ft, or null when the pass cost is not computable (rendered as `~`). */
  readonly worthItHuf = computed<number | null>(() => {
    if (!this.passComputable()) {
      return null;
    }
    const cost = passCostHuf(this.settingsRepo.settings(), this.expenseRepo.items(), this.range().monthCount);
    return worthItHuf(this.summary().visitValueSumHuf, cost);
  });

  /**
   * Reload unconditionally on every entry (not `!loaded()`-guarded): Ionic keeps the page alive
   * across tab switches, so `ngOnInit` runs once — without this a Check-In / partner rename that
   * landed via a background sync pull (SQLite updated, repository signals not) would never reach the
   * windows. The re-entry hook is `ionViewWillEnter`.
   */
  async ngOnInit(): Promise<void> {
    const loads: Promise<void>[] = [
      this.checkInRepo.load(),
      this.partnerRepo.load(),
      this.settingsRepo.load(),
    ];
    if (this.financeEnabled) {
      loads.push(this.expenseRepo.load());
    }
    await Promise.all(loads);
  }

  ionViewWillEnter(): void {
    void this.ngOnInit();
  }

  setWindow(value: string | undefined): void {
    if (this.windows.includes(value as StatsWindow)) {
      this.window.set(value as StatsWindow);
    }
  }

  setCustomFrom(value: string | null | undefined): void {
    if (value) {
      this.customFrom.set(value.slice(0, 10));
    }
  }

  setCustomTo(value: string | null | undefined): void {
    if (value) {
      this.customTo.set(value.slice(0, 10));
    }
  }

  openVisit(date: string): void {
    void this.router.navigate([CHECK_IN_URL], { queryParams: { date } });
  }
}
