import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonSpinner, IonTitle } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis — az automatikus mód tipp-sávja (kezdő- / végpont
 * kiválasztása). backlog/182 — tervezés közben a tipp helyén töltésjelző áll, hogy a hosszabb
 * (offline) tervezés alatt is látsszon, hogy a koppintás célba ért.
 */
@Component({
	selector: 'app-auto-route-hint',
	template: `
		@if (routing()) {
			<div class="auto-routing-hint">
				<ion-spinner name="crescent"></ion-spinner>
				<span>{{ 'TURA.AUTO_ROUTING' | translate }}</span>
			</div>
		} @else {
			<ion-title size="small">{{ (pickingEnd() ? 'TURA.AUTO_PICK_END' : 'TURA.AUTO_PICK_START') | translate }}</ion-title>
		}
	`,
	styles: `
		.auto-routing-hint {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 0 16px;
			font-size: 14px;
		}

		.auto-routing-hint ion-spinner {
			width: 20px;
			height: 20px;
		}
	`,
	imports: [IonSpinner, IonTitle, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoRouteHintComponent {
	readonly routing = input(false);
	readonly pickingEnd = input(false);
}
