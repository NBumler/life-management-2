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

/** Egy napváltó: a kijelölt belső pont koordináta-indexe és az opcionális éjszakázó hely neve. */
export interface DayBreak {
	readonly waypointIndex: number;
	readonly overnightName: string;
}

/** backlog/208 — amit a kuka a vonalon kívül még elvisz, és a visszavonása visszaad. */
export interface ClearedDraftDetails {
	readonly name: string;
	readonly dayBreaks: readonly DayBreak[];
}

interface UndoStep {
	readonly draft: RouteDraft;
	/** Csak a kuka lépésén van: a törléskor elvitt név és napváltók. */
	readonly cleared?: ClearedDraftDetails;
}

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
 * backlog/208 — a kuka is egy ilyen lépés: a visszavonása a vonal mellett a nevet és a napváltókat is visszaadja.
 */
export class RouteDraftEditor {
	private readonly current = signal<RouteDraft>(EMPTY_ROUTE_DRAFT);
	private readonly history = signal<readonly UndoStep[]>([]);

	readonly draft = this.current.asReadonly();
	readonly canUndo = computed(() => this.history().length > 0);
	/** backlog/208 — a toast „Visszavonás” gombja csak akkor hat, ha a kuka óta nem történt újabb lépés. */
	readonly lastStepIsClear = computed(() => {
		const steps = this.history();
		return steps.length > 0 && steps[steps.length - 1].cleared !== undefined;
	});

	apply(next: RouteDraft): void {
		this.history.update((steps) => [...steps, { draft: this.current() }]);
		this.current.set(next);
	}

	/** backlog/208 — a kuka: üres rajz, de visszavonható lépésként. */
	clear(details: ClearedDraftDetails): void {
		this.history.update((steps) => [...steps, { draft: this.current(), cleared: details }]);
		this.current.set(EMPTY_ROUTE_DRAFT);
	}

	/** Egy lépés vissza; ha az a kuka volt, a vele elvitt nevet és napváltókat adja vissza. */
	undo(): ClearedDraftDetails | null {
		const steps = this.history();
		if (steps.length === 0) {
			return null;
		}
		const step = steps[steps.length - 1];
		this.current.set(step.draft);
		this.history.set(steps.slice(0, -1));
		return step.cleared ?? null;
	}

	/** Mentés után: üres rajz, üres visszavonás-verem. */
	reset(): void {
		this.current.set(EMPTY_ROUTE_DRAFT);
		this.history.set([]);
	}

	/** backlog/213 — a helyben megőrzött piszkozat visszatöltése; a visszavonás-verem nem őrződik meg. */
	restore(draft: RouteDraft): void {
		this.current.set(draft);
		this.history.set([]);
	}
}
