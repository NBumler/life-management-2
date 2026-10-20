import { CuratedRoute } from '../../../api/model/curatedRoute';
import { catalogEmptyStateKey, curatedRouteTitle, markingBadge, visibleCuratedRoutes } from './curated-route-text';

function route(id: string, name: string, distanceMeters: number, symbol: string | null = null): CuratedRoute {
	return {
		id,
		name,
		symbol,
		difficulty: 'EASY',
		activityType: 'HIKING',
		coordinates: [
			[19, 47],
			[19.1, 47.1],
		],
		distanceMeters,
		elevationGainMeters: 0,
		elevationLossMeters: 0,
		estimatedDurationMinutes: 0,
	};
}

describe('curatedRouteTitle', () => {
	it('drops the marking letter and the parentheses around the route', () => {
		expect(curatedRouteTitle('P (Dömös – Budaörs)', 'PIROS_SAV')).toBe('Dömös – Budaörs');
		expect(curatedRouteTitle('K+ (Recsk – Domoszlói kapu)', 'KEK_KERESZT')).toBe('Recsk – Domoszlói kapu');
	});

	it('also unwraps a route whose closing parenthesis is missing in OSM', () => {
		expect(curatedRouteTitle('Z (Petőfiszállás - madármegfigyelő', 'ZOLD_SAV')).toBe('Petőfiszállás - madármegfigyelő');
	});

	it('drops a comma-separated marking letter and keeps the rest', () => {
		expect(curatedRouteTitle('K, OKT 16. (Dobogókő – Visegrád)', 'KEK_SAV')).toBe('OKT 16. (Dobogókő – Visegrád)');
		expect(curatedRouteTitle('S, Jubileumi körtúra', 'SARGA_SAV')).toBe('Jubileumi körtúra');
	});

	it('keeps the name when the letter does not match the marking colour', () => {
		expect(curatedRouteTitle('K (Kő-hegy – Pomáz)', 'ZOLD_SAV')).toBe('K (Kő-hegy – Pomáz)');
	});

	it('keeps the name without a marking, or when it has no marking prefix', () => {
		expect(curatedRouteTitle('P (Dömös – Budaörs)', null)).toBe('P (Dömös – Budaörs)');
		expect(curatedRouteTitle('Mária-út, M81-01 (Vác – Nézsa)', 'LILA_M')).toBe('Mária-út, M81-01 (Vác – Nézsa)');
		expect(curatedRouteTitle('Pilisi kör', 'PIROS_SAV')).toBe('Pilisi kör');
		expect(curatedRouteTitle('Zöld (Nagy-hideg-hegy)', 'ZOLD_SAV')).toBe('Zöld (Nagy-hideg-hegy)');
	});
});

describe('markingBadge', () => {
	it('is a coloured stripe for a stripe marking', () => {
		expect(markingBadge('PIROS_SAV')).toEqual({ color: '#d32f2f', casing: '#ffffff', glyph: null });
	});

	it('carries the shape glyph or the marking letter', () => {
		expect(markingBadge('KEK_KERESZT')?.glyph).toBe('+');
		expect(markingBadge('LILA_M')?.glyph).toBe('M');
		expect(markingBadge('ZOLD_JEL')?.glyph).toBeNull();
	});

	it('is null without a colour', () => {
		expect(markingBadge(null)).toBeNull();
		expect(markingBadge('EGYEB')).toBeNull();
	});
});

describe('visibleCuratedRoutes', () => {
	const routes = [
		route('a', 'K, OKT 10. (Bodajk – Szárliget)', 30_000, 'KEK_SAV'),
		route('b', 'Z (Ábrahámhegy – Raposka)', 8_000, 'ZOLD_SAV'),
		route('c', 'K, OKT 2. (Sárvár – Sümeg)', 50_000, 'KEK_SAV'),
		route('d', 'P (Zebegény – Nagymaros)', 12_000, 'PIROS_SAV'),
	];

	it('sorts by title in the language alphabet, numbers by value', () => {
		expect(visibleCuratedRoutes(routes, '', 'name', 'hu').map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
	});

	it('sorts by distance, shortest first', () => {
		expect(visibleCuratedRoutes(routes, '', 'distance', 'hu').map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
	});

	it('searches the whole name, accent- and case-insensitively', () => {
		expect(visibleCuratedRoutes(routes, 'abrahAM', 'name', 'hu').map((r) => r.id)).toEqual(['b']);
		expect(visibleCuratedRoutes(routes, 'okt', 'name', 'hu').map((r) => r.id)).toEqual(['c', 'a']);
	});

	it('does not reorder the input array', () => {
		visibleCuratedRoutes(routes, '', 'distance', 'hu');
		expect(routes.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
	});
});

describe('catalogEmptyStateKey (backlog/191, 227)', () => {
	const done = { loading: false, loadFailed: false, unfiltered: true, visibleCount: 0 };

	it('says nothing while loading — not even after a failure or with a filter', () => {
		expect(catalogEmptyStateKey({ ...done, loading: true })).toBeNull();
		expect(catalogEmptyStateKey({ ...done, loading: true, loadFailed: true, unfiltered: false })).toBeNull();
	});

	it('says nothing when there is something to list', () => {
		expect(catalogEmptyStateKey({ ...done, visibleCount: 3 })).toBeNull();
	});

	it('after the load: offline, empty catalog, or nothing matches the filter', () => {
		expect(catalogEmptyStateKey({ ...done, loadFailed: true })).toBe('TURA.CATALOG.OFFLINE');
		expect(catalogEmptyStateKey(done)).toBe('TURA.CATALOG.EMPTY');
		expect(catalogEmptyStateKey({ ...done, unfiltered: false })).toBe('TURA.CATALOG.NO_RESULTS');
	});
});
