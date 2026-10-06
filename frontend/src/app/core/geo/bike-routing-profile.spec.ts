import { BIKE_COST_CLASS, BikeWay } from './bike-tile-codec';
import { buildBikeGraph } from './bike-routing-profile';

describe('buildBikeGraph', () => {
	const start: [number, number] = [19.0, 47.0];
	const goal: [number, number] = [19.01, 47.0];
	const detourVia: [number, number] = [19.005, 47.005];

	it('prefers a dedicated cycleway detour over a shorter main road', () => {
		const ways: BikeWay[] = [
			{ costClass: BIKE_COST_CLASS.MAIN_ROAD, coordinates: [start, goal] },
			{ costClass: BIKE_COST_CLASS.CYCLEWAY, coordinates: [start, detourVia, goal] },
		];
		const graph = buildBikeGraph(ways);

		const path = graph.shortestPath(graph.snapToNearestEdge(...start, 1)!, graph.snapToNearestEdge(...goal, 1)!);

		expect(path).not.toBeNull();
		const visited = path!.map((node) => graph.coordinateOf(node));
		expect(visited.some(([lon, lat]) => Math.abs(lon - detourVia[0]) < 1e-9 && Math.abs(lat - detourVia[1]) < 1e-9)).toBeTrue();
	});

	it('returns null for disconnected bicycle networks', () => {
		const graph = buildBikeGraph([
			{ costClass: BIKE_COST_CLASS.QUIET_ROAD, coordinates: [start, goal] },
			{ costClass: BIKE_COST_CLASS.QUIET_ROAD, coordinates: [[20.0, 46.0], [20.01, 46.0]] },
		]);

		const a = graph.snapToNearestEdge(...start, 1)!;
		const b = graph.snapToNearestEdge(20.0, 46.0, 1)!;

		expect(graph.shortestPath(a, b)).toBeNull();
	});
});
