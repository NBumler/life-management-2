import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { today } from '../../../../shared/local-date';
import { CLIMBING_STATS_PERIODS, ClimbingStatsPeriodDays, computeClimbingStats } from '../climbing-stats';
import { CLIMBING_CONTEXTS } from '../climbing-contexts';

interface OutcomeSlice {
  readonly labelKey: string;
  readonly count: number;
  readonly pct: number;
}

interface PyramidBar {
  readonly label: string;
  readonly sends: number;
  readonly ratio: number;
}

interface ContextView {
  readonly key: string;
  readonly labelKey: string;
  readonly hasData: boolean;
  readonly sessionCount: number;
  readonly attemptCount: number;
  readonly maxGradeLabel: string | null;
  readonly totalVolume: number;
  readonly successPct: number;
  readonly outcomes: readonly OutcomeSlice[];
  readonly pyramid: readonly PyramidBar[];
}

/**
 * documentation/Features/Mászónapló.md "Statisztikák (2.0 scope)" — the Mászás hub's stats screen
 * (reached from the header chart button). Per dashboard context: all-time max grade, total volume and
 * success-rate breakdown, plus a period-scoped grade pyramid (30 / 90 / 365 days). All figures come
 * from the pure `computeClimbingStats()`; this page only builds render view-models (percentages, bar
 * ratios) on top.
 */
@Component({
  selector: 'app-climbing-stats',
  templateUrl: 'climbing-stats.page.html',
  styleUrls: ['climbing-stats.page.scss'],
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
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonProgressBar,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimbingStatsPage implements OnInit {
  private readonly repository = inject(ClimbingSessionRepository);

  readonly periods = CLIMBING_STATS_PERIODS;
  readonly period = signal<ClimbingStatsPeriodDays>(90);

  private readonly stats = computed(() => computeClimbingStats(this.repository.items(), this.period(), today()));

  readonly totalVolume = computed(() => this.stats().totalVolume);

  readonly contexts = computed<ContextView[]>(() =>
    this.stats().contexts.map((ctx) => {
      const label = CLIMBING_CONTEXTS.find((c) => c.key === ctx.key)?.labelKey ?? ctx.key;
      const { onsight, flash, redpoint, failed, total } = ctx.outcomes;
      const pct = (n: number): number => (total > 0 ? (n / total) * 100 : 0);
      const maxSends = ctx.pyramid.reduce((max, row) => Math.max(max, row.sends), 0);
      return {
        key: ctx.key,
        labelKey: label,
        hasData: ctx.sessionCount > 0,
        sessionCount: ctx.sessionCount,
        attemptCount: ctx.attemptCount,
        maxGradeLabel: ctx.maxGradeLabel,
        totalVolume: ctx.totalVolume,
        successPct: pct(onsight + flash + redpoint),
        outcomes: [
          { labelKey: 'WORKOUT.CLIMBING.ASCENT_STYLE.ONSIGHT', count: onsight, pct: pct(onsight) },
          { labelKey: 'WORKOUT.CLIMBING.ASCENT_STYLE.FLASH', count: flash, pct: pct(flash) },
          { labelKey: 'WORKOUT.CLIMBING.ASCENT_STYLE.REDPOINT', count: redpoint, pct: pct(redpoint) },
          { labelKey: 'WORKOUT.CLIMBING.STATS_PAGE.OUTCOME_FAILED', count: failed, pct: pct(failed) },
        ],
        pyramid: ctx.pyramid.map((row) => ({
          label: row.label,
          sends: row.sends,
          ratio: maxSends > 0 ? row.sends / maxSends : 0,
        })),
      };
    }),
  );

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  setPeriod(value: string | undefined): void {
    const days = Number(value) as ClimbingStatsPeriodDays;
    if (this.periods.includes(days)) {
      this.period.set(days);
    }
  }
}
