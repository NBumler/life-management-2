import { computed, signal } from '@angular/core';

/**
 * backlog/190 — a rajzolt útvonal: a teljes vonal (`coordinates`, ez mentődik) és benne a felhasználó
 * által kijelölt pontok indexei (`waypointIndexes`, növekvő sorrendben). Egy automatikusan tervezett
 * szakasz sok töréspontja csak a vonal része; kijelölt pont belőle csak a kezdő- és a végpont.
 * Tiszta függvények, hogy MapLibre nélkül tesztelhetők legyenek (mint a hike-routes-geojson.ts).
 */
export interface RouteDraft {
	readonly coordinates: number[][];
	readonly waypointIndexes: readonly number[];
}

export const EMPTY_ROUTE_DRAFT: RouteDraft = { coordinates: [], waypointIndexes: [] };

/** Kézi rajzolás: minden koppintás egy kijelölt pont a vonal végén. */
export function withManualPoint(draft: RouteDraft, point: number[]): RouteDraft {
	return {
		coordinates: [...draft.coordinates, point],
		waypointIndexes: [...draft.waypointIndexes, draft.coordinates.length],
	};
}

/**
 * Egy kész vonal (automatikus tervezés, átvett ajánlott túra): kijelölt pont a két vége, plusz a
 * megadott belső indexek (pl. az átvett túra napváltói).
 */
export function routeDraftFromPath(path: readonly number[][], interiorIndexes: readonly number[] = []): RouteDraft {
	if (path.length === 0) {
		return EMPTY_ROUTE_DRAFT;
	}
	const last = path.length - 1;
	const indexes = new Set([0, ...interiorIndexes.filter((index) => index > 0 && index < last), last]);
	return { coordinates: [...path], waypointIndexes: [...indexes].sort((a, b) => a - b) };
}

/** A térképen körrel jelölt pontok. */
export function waypointCoordinates(draft: RouteDraft): number[][] {
	return draft.waypointIndexes.map((index) => draft.coordinates[index]);
}

/** A napváltónak választható pontok: a kijelöltek a két végpont nélkül. */
export function interiorWaypointIndexes(draft: RouteDraft): number[] {
	const last = draft.coordinates.length - 1;
	return draft.waypointIndexes.filter((index) => index > 0 && index < last);
}

/**
 * backlog/190 — a rajz lépésenként vonható vissza: egy lépés egy kézi pont, egy teljes automatikus
 * szakasz vagy egy átvett ajánlott túra. Minden lépés előtt az előző állapot a verembe kerül, így a
 * visszavonás azt is helyreállítja, amit egy lépés lecserélt (pl. az automatikus tervezés a korábbi rajzot).
 */
export class RouteDraftEditor {
	private readonly current = signal<RouteDraft>(EMPTY_ROUTE_DRAFT);
	private readonly history = signal<readonly RouteDraft[]>([]);

	readonly draft = this.current.asReadonly();
	readonly canUndo = computed(() => this.history().length > 0);

	apply(next: RouteDraft): void {
		this.history.update((steps) => [...steps, this.current()]);
		this.current.set(next);
	}

	undo(): void {
		const steps = this.history();
		if (steps.length === 0) {
			return;
		}
		this.current.set(steps[steps.length - 1]);
		this.history.set(steps.slice(0, -1));
	}

	/** Törlés / mentés után: üres rajz, üres visszavonás-verem. */
	reset(): void {
		this.current.set(EMPTY_ROUTE_DRAFT);
		this.history.set([]);
	}
}
