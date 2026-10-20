import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../../core/config/language.service';
import { RouteDayMetrics } from '../../../core/geo/route-metrics';
import { daySummaryText, distanceText, durationText, elevationText } from './hike-text';
import { DayBreak } from './route-draft';

/** Egy napváltó-választó opciója: a kijelölt pont koordináta-indexe, sorszáma és helye az indulástól. */
export interface WaypointOption {
	readonly index: number;
	readonly number: number;
	readonly distance: string;
}

/**
 * backlog/209 — a piszkozat napjainak szerkesztése a részletek-lapon, napi értékekkel; a napváltó a
 * térképen a sorszámos hold-jelölő. Az állapot (napváltók, napi metrika) a page-é; ez csak megjeleníti
 * és a változtatásokat visszaadja. backlog/228: a page stílus-budgetje miatt külön komponens.
 */
@Component({
	selector: 'app-days-editor',
	templateUrl: 'days-editor.component.html',
	styleUrl: 'days-editor.component.scss',
	imports: [NgTemplateOutlet, IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaysEditorComponent {
	private readonly language = inject(LanguageService);

	readonly dayBreaks = input.required<readonly DayBreak[]>();
	/** Soronként a választható pontok (a még nem használtak és a sor saját értéke). */
	readonly options = input.required<readonly (readonly WaypointOption[])[]>();
	/** A napi metrika napváltónként + az utolsó nap; `null` = még számol. */
	readonly days = input.required<readonly RouteDayMetrics[] | null>();
	readonly canAdd = input.required<boolean>();
	readonly addBlockedKey = input.required<string>();

	readonly add = output<void>();
	readonly remove = output<number>();
	readonly changeIndex = output<{ position: number; waypointIndex: number }>();
	readonly changeOvernightName = output<{ position: number; overnightName: string }>();

	protected readonly durationText = durationText;
	protected readonly daySummaryText = daySummaryText;

	protected distance(meters: number | null | undefined): string {
		return distanceText(meters, this.language.activeLanguage());
	}

	protected elevation(meters: number | null | undefined): string {
		return elevationText(meters, this.language.activeLanguage());
	}
}
