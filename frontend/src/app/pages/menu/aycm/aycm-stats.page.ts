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
import { StatsWindow, filterCheckIns, groupByPartner, summarize, visitList, windowRange } from './aycm-stats';

const CHECK_IN_URL = '/tabs/menu/aycm/check-in';

/**
 * documentation/Subfeatures/AYCM Statisztikák.md — read-only. Three preset windows over the live
 * AycmCheckIn snapshots: a summary (count / Σ value / "megéri-e" or `~`), a per-partner breakdown
 * and a visit list. No entity, no OpenAPI, no outbox — every number is a pure-TS computation.
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
  readonly windows: readonly StatsWindow[] = ['THIS_MONTH', 'PREV_MONTH', 'LAST_3_MONTHS'];

  private readonly range = computed(() => windowRange(this.window(), today()));
  private readonly windowCheckIns = computed(() => {
    const { from, to } = this.range();
    return filterCheckIns(this.checkInRepo.checkIns(), from, to);
  });

  readonly summary = computed(() => summarize(this.windowCheckIns()));
  readonly breakdown = computed(() => groupByPartner(this.windowCheckIns(), this.partnerRepo.partners()));
  readonly visits = computed(() => visitList(this.windowCheckIns(), this.partnerRepo.partners()));

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
    if (value === 'THIS_MONTH' || value === 'PREV_MONTH' || value === 'LAST_3_MONTHS') {
      this.window.set(value);
    }
  }

  openVisit(date: string): void {
    void this.router.navigate([CHECK_IN_URL], { queryParams: { date } });
  }
}
