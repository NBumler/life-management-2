import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

export type AutoRouteHintStep = 'start' | 'end' | 'next';
/** backlog/221 — miért nem lett útvonal: a pont túl messze van a turistautaktól, vagy nincs köztük összeköttetés. */
export type AutoRouteProblem = 'too-far' | 'not-found';

const STEP_KEYS: Record<AutoRouteHintStep, string> = {
	start: 'TURA.AUTO_PICK_START',
	end: 'TURA.AUTO_PICK_END',
	next: 'TURA.AUTO_PICK_NEXT',
};

const PROBLEM_KEYS: Record<AutoRouteProblem, string> = {
	'too-far': 'TURA.AUTO_TOO_FAR',
	'not-found': 'TURA.AUTO_NO_ROUTE',
};

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis — az automatikus mód tipp-sávja (kezdő- / végpont
 * kiválasztása). backlog/182 — tervezés közben a tipp helyén töltésjelző áll, hogy a hosszabb
 * (offline) tervezés alatt is látsszon, hogy a koppintás célba ért. backlog/206 — a mód a sikeres
 * tervezés után bekapcsolva marad, a következő koppintás a vonal végétől tervez tovább (`next`).
 * backlog/221 — a sikertelen tervezés oka tanáccsal itt jelenik meg (nem felugró ablakban), a lépés-tipp
 * fölött; a kezdőpont és a mód megmarad, csak a végpontot kell újra választani.
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
			@if (problemKey(); as key) {
				<span class="auto-route-problem" role="alert">{{ key | translate }}</span>
			}
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

		.auto-route-problem {
			display: block;
			color: var(--ion-color-danger);
			font-weight: 600;
		}
	`,
	imports: [IonSpinner, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoRouteHintComponent {
	readonly routing = input(false);
	readonly step = input<AutoRouteHintStep>('start');
	readonly problem = input<AutoRouteProblem | null>(null);
	protected readonly stepKey = computed(() => STEP_KEYS[this.step()]);
	protected readonly problemKey = computed(() => {
		const problem = this.problem();
		return problem === null ? null : PROBLEM_KEYS[problem];
	});
}
