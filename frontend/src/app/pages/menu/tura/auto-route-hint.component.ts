import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

export type AutoRouteHintStep = 'start' | 'end' | 'next';

const STEP_KEYS: Record<AutoRouteHintStep, string> = {
	start: 'TURA.AUTO_PICK_START',
	end: 'TURA.AUTO_PICK_END',
	next: 'TURA.AUTO_PICK_NEXT',
};

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis — az automatikus mód tipp-sávja (kezdő- / végpont
 * kiválasztása). backlog/182 — tervezés közben a tipp helyén töltésjelző áll, hogy a hosszabb
 * (offline) tervezés alatt is látsszon, hogy a koppintás célba ért. backlog/206 — a mód a sikeres
 * tervezés után bekapcsolva marad, a következő koppintás a vonal végétől tervez tovább (`next`).
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
			<span>{{ stepKey() | translate }}</span>
		}
	`,
	styles: `
		.auto-routing-hint {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.auto-routing-hint ion-spinner {
			width: 20px;
			height: 20px;
		}
	`,
	imports: [IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoRouteHintComponent {
	readonly routing = input(false);
	readonly step = input<AutoRouteHintStep>('start');
	protected readonly stepKey = computed(() => STEP_KEYS[this.step()]);
}
