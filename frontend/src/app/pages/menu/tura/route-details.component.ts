import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ElevationProfilePoint } from '../../../api/model/elevationProfilePoint';
import { HikeRouteDay } from '../../../api/model/hikeRouteDay';
import { LanguageService } from '../../../core/config/language.service';
import { ElevationProfileComponent } from './elevation-profile.component';
import { distanceText, durationText, elevationText } from './hike-text';

/** Ami egy útvonalról vagy egy napjáról kiírható: a mentett útvonal, a katalógus-túra és a piszkozat metrikája is ilyen. */
export interface RouteStats {
	readonly distanceMeters?: number | null;
	readonly elevationGainMeters?: number | null;
	readonly elevationLossMeters?: number | null;
	readonly estimatedDurationMinutes?: number | null;
}

/**
 * backlog/212, backlog/218, backlog/209 — az útvonal-kártya közös része: a statisztika, a magasságprofil
 * a skálájával (backlog/219) és a napok listája a napi értékekkel. Egy mentett útvonal, egy ajánlott túra
 * előnézete és a piszkozat is ezt mutatja a félmagas lapon; a név és a gombok a lap fejlécében vannak.
 */
@Component({
	selector: 'app-route-details',
	templateUrl: 'route-details.component.html',
	styleUrl: 'route-details.component.scss',
	imports: [IonSpinner, TranslatePipe, ElevationProfileComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDetailsComponent {
	private readonly language = inject(LanguageService);

	readonly stats = input.required<RouteStats | null>();
	readonly profile = input<readonly ElevationProfilePoint[] | null>(null);
	readonly profileLoading = input(false);
	readonly markerDistances = input<readonly number[]>([]);
	/** Csak többnapos útvonalnál jelenik meg; a piszkozat a saját, szerkeszthető listáját mutatja helyette. */
	readonly days = input<readonly HikeRouteDay[] | null>(null);

	protected readonly durationText = durationText;

	protected distance(meters: number | null | undefined): string {
		return distanceText(meters, this.language.activeLanguage());
	}

	protected elevation(meters: number | null | undefined): string {
		return elevationText(meters, this.language.activeLanguage());
	}
}
