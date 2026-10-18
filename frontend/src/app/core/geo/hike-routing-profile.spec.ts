import { HIKE_COST_CLASS, buildHikeGraph } from './hike-routing-profile';
import { WayFeature } from './way-tile-codec';

describe('buildHikeGraph', () => {
	const start: [number, number] = [19.0, 47.0];
	const goal: [number, number] = [19.1, 47.0];

	it('finds the shortest path across connected trail segments', () => {
		const ways: WayFeature[] = [
			{ costClass: HIKE_COST_CLASS.TRAIL, coordinates: [start, [19.05, 47.0]] },
			{ costClass: HIKE_COST_CLASS.TRAIL, coordinates: [[19.05, 47.0], goal] },
		];
		const graph = buildHikeGraph(ways);

		const path = graph.shortestPath(graph.snapToNearestEdge(...start, 100)!, graph.snapToNearestEdge(...goal, 100)!);

		expect(path).not.toBeNull();
	});

	it('ignores the cost class entirely — the geometrically shorter segment always wins, unlike the bike profile', () => {
		const a: [number, number] = [19.0, 47.0];
		const b: [number, number] = [19.2, 47.0];
		const detourVia: [number, number] = [19.1, 47.05];
		// A hosszabb (kerülő) szakasz a bicikli-táblában a LEGOLCSÓBB osztályt kapja (0 = CYCLEWAY),
		// a rövidebb a LEGDRÁGÁBBAT (4 = MAIN_ROAD) — ha a turistaút-profil ezt figyelembe venné, a
		// kerülőt választaná. A várt eredmény a rövidebb (direkt), mert a turistaúton nincs osztály-szorzó.
		const ways: WayFeature[] = [
			{ costClass: 0, coordinates: [a, detourVia, b] },
			{ costClass: 4, coordinates: [a, b] },
		];
		const graph = buildHikeGraph(ways);

		const path = graph.shortestPath(graph.snapToNearestEdge(...a, 100)!, graph.snapToNearestEdge(...b, 100)!)!;
		const visited = path.map((node) => graph.coordinateOf(node));

		expect(visited.some(([lon, lat]) => Math.abs(lon - detourVia[0]) < 1e-9 && Math.abs(lat - detourVia[1]) < 1e-9)).toBeFalse();
	});

	it('returns null for disconnected trail segments', () => {
		const graph = buildHikeGraph([
			{ costClass: HIKE_COST_CLASS.TRAIL, coordinates: [start, [19.05, 47.0]] },
			{ costClass: HIKE_COST_CLASS.TRAIL, coordinates: [[25.0, 47.0], [25.1, 47.0]] },
		]);

		const a = graph.snapToNearestEdge(...start, 100)!;
		const b = graph.snapToNearestEdge(25.1, 47.0, 100)!;

		expect(graph.shortestPath(a, b)).toBeNull();
	});
});
