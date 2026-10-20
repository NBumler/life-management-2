import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/** A rajzolás módja; `none` = egyik sem aktív. */
export type DrawMode = 'none' | 'manual' | 'auto';

/**
 * backlog/205, backlog/206 — a térkép alján a fő műveletek ikonnal és felirattal; az aktív mód a kiemelő
 * színt kapja. Az állapot a page-é. backlog/228: a page stílus-budgetje miatt külön komponens.
 */
@Component({
	selector: 'app-tura-mode-bar',
	templateUrl: 'tura-mode-bar.component.html',
	styleUrl: 'tura-mode-bar.component.scss',
	imports: [IonIcon, IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraModeBarComponent {
	readonly mode = input.required<DrawMode>();
	/** Az automatikus tervezés fut. */
	readonly routing = input(false);
	readonly canUndo = input.required<boolean>();
	readonly canClear = input.required<boolean>();

	readonly toggleManual = output<void>();
	readonly toggleAuto = output<void>();
	readonly undo = output<void>();
	readonly clear = output<void>();
}
