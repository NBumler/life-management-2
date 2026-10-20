import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { markingBadge } from './curated-route-text';

/**
 * backlog/216 — a turistajelzés kis ikonja (fehér alapon a jelzés színes sávja, alakzata vagy betűje,
 * mint a fán a festett jel) a katalógus-túra neve előtt. Díszítő elem: a jelzés nevét a sor szövege
 * mondja ki, ezért a képernyőolvasó elől rejtett. Ismeretlen / színtelen jelzésre nem rajzol semmit.
 */
@Component({
	selector: 'app-marking-badge',
	template: `
		@if (badge(); as badge) {
			<span class="badge" aria-hidden="true" [style.--marking-color]="badge.color" [style.--marking-casing]="badge.casing">
				@if (badge.glyph === null) {
					<span class="stripe"></span>
				} @else {
					<span class="glyph">{{ badge.glyph }}</span>
				}
			</span>
		}
	`,
	styleUrl: 'marking-badge.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkingBadgeComponent {
	readonly symbol = input<string | null | undefined>(null);

	protected readonly badge = computed(() => markingBadge(this.symbol()));
}
