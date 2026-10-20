import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ElevationProfilePoint } from '../../../api/model/elevationProfilePoint';
import { LanguageService } from '../../../core/config/language.service';
import { elevationProfileChart } from './elevation-profile-svg';
import { distanceText, elevationText } from './hike-text';

const CHART_WIDTH = 300;
const CHART_HEIGHT = 60;

/**
 * backlog/219 — a magasságprofil skálával: bal oldalt a legmagasabb és a legalacsonyabb pont, alatta a
 * táv-tengely (0 és a teljes táv), a napváltóknál függőleges, sorszámozott jelölő. A `compact` változat
 * (a lebegő piszkozat-kártyán) csak a magasság-sávot írja ki, táv-tengely nélkül.
 */
@Component({
	selector: 'app-elevation-profile',
	templateUrl: 'elevation-profile.component.html',
	styleUrl: 'elevation-profile.component.scss',
	imports: [TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElevationProfileComponent {
	private readonly language = inject(LanguageService);

	readonly profile = input.required<readonly ElevationProfilePoint[]>();
	/** A napváltók távolsága az indulástól (m). */
	readonly markerDistances = input<readonly number[]>([]);
	readonly compact = input(false);

	protected readonly width = CHART_WIDTH;
	protected readonly height = CHART_HEIGHT;
	protected readonly chart = computed(() => elevationProfileChart(this.profile(), CHART_WIDTH, CHART_HEIGHT, this.markerDistances()));
	protected readonly labels = computed(() => {
		const chart = this.chart();
		const language = this.language.activeLanguage();
		return chart === null
			? null
			: {
					max: elevationText(chart.maxElevationMeters, language),
					min: elevationText(chart.minElevationMeters, language),
					start: distanceText(0, language),
					total: distanceText(chart.totalDistanceMeters, language),
				};
	});
}
