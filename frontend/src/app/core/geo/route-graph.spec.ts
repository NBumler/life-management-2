import { RouteGraph } from './route-graph';

describe('RouteGraph', () => {
	it('finds the shortest path across connected edges', () => {
		const graph = new RouteGraph();
		graph.addEdge(19.0, 47.0, 19.1, 47.0);
		graph.addEdge(19.1, 47.0, 19.2, 47.0);
		const start = graph.snapToNearestEdge(19.0, 47.0, 100);
		const end = graph.snapToNearestEdge(19.2, 47.0, 100);

		expect(start).not.toBeNull();
		expect(end).not.toBeNull();
		expect(graph.shortestPath(start!, end!)).not.toBeNull();
	});

	it('prefers a cheaper (lower cost-factor) detour over a short expensive edge', () => {
		const graph = new RouteGraph(0.5);
		graph.addEdge(19.0, 47.0, 19.1, 47.0, 3);
		graph.addEdge(19.0, 47.0, 19.0, 47.02, 0.5);
		graph.addEdge(19.0, 47.02, 19.1, 47.02, 0.5);
		graph.addEdge(19.1, 47.02, 19.1, 47.0, 0.5);
		const start = graph.snapToNearestEdge(19.0, 47.0, 100)!;
		const end = graph.snapToNearestEdge(19.1, 47.0, 100)!;

		const path = graph.shortestPath(start, end)!;
		const viaDetour = path.some((node) => {
			const [, lat] = graph.coordinateOf(node);
			return Math.abs(lat - 47.02) < 1e-6;
		});
		expect(viaDetour).toBeTrue();
	});

	it('returns null when the two points are in disconnected components', () => {
		const graph = new RouteGraph();
		graph.addEdge(19.0, 47.0, 19.1, 47.0);
		graph.addEdge(25.0, 47.0, 25.1, 47.0);
		const start = graph.snapToNearestEdge(19.0, 47.0, 100)!;
		const end = graph.snapToNearestEdge(25.1, 47.0, 100)!;

		expect(graph.shortestPath(start, end)).toBeNull();
	});
});
