import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * backlog/200 — nem blokkoló, lebegő jelzés a térkép-kártya fölött, középen („Közelíts rá…”, és
 * backlog/226 óta „Turistautak betöltése…”). `busy` = töltésjelző a szöveg előtt; `infoLabel` megadásakor
 * egy „i” gomb, ami az `info` eseményt adja. backlog/228: a page stílus-budgetje miatt külön komponens.
 */
@Component({
	selector: 'app-map-hint',
	templateUrl: 'map-hint.component.html',
	styleUrl: 'map-hint.component.scss',
	imports: [IonButton, IonIcon, IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapHintComponent {
	readonly textKey = input.required<string>();
	readonly busy = input(false);
	readonly infoLabelKey = input<string | null>(null);

	readonly info = output<void>();
}
