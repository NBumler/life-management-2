import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** backlog/201 — egy koppintott turistaút a kártyán. */
export interface TappedTrail {
	readonly label: string;
	readonly color: string;
	readonly routeName: string | null;
}

/**
 * backlog/201 — a koppintott turistaút(ak) a lebegő kártyán: színminta, a jelzés és a túraútvonal neve.
 * backlog/228: a page stílus-budgetje miatt külön komponens.
 */
@Component({
	selector: 'app-tapped-trails',
	templateUrl: 'tapped-trails.component.html',
	styleUrl: 'tapped-trails.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TappedTrailsComponent {
	readonly trails = input.required<readonly TappedTrail[]>();
}
