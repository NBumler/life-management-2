import { RouteSuggestion } from '../../../api/model/routeSuggestion';
import { TrailSegment } from '../../../api/model/trailSegment';
import { haversineMeters } from '../../../core/geo/geo-math';
import { RouteGraph } from '../../../core/geo/route-graph';

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — a backend `RouteSuggestionService` (2.2 fázis)
 * gráf-keresésének on-device megfelelője. A gráf-motor a `core/geo/route-graph.ts`-ben él (közös a
 * bicikli-profillal); itt csak a turistaút-szakaszokból építjük fel a gráfot. Nem a szerver
 * bbox-táguló keresését ismétli: a kliens a ténylegesen betöltött szakaszokon keres.
 */

const MAX_SNAP_DISTANCE_METERS = 2_000;

function buildGraph(segments: readonly TrailSegment[]): RouteGraph {
	const graph = new RouteGraph();
	for (const segment of segments) {
		const coordinates = segment.coordinates;
		for (let i = 0; i + 1 < coordinates.length; i++) {
			const [lon1, lat1] = coordinates[i];
			const [lon2, lat2] = coordinates[i + 1];
			graph.addEdge(lon1, lat1, lon2, lat2);
		}
	}
	return graph;
}

function notFound(): RouteSuggestion {
	return { found: false, coordinates: [], distanceMeters: 0 };
}

/** Offline megfelelője a backend `RouteSuggestionService#suggest`-nek — ugyanazon `TrailSegment`-eken dolgozik, amiket a hívó (már betöltött viewport vagy letöltött offline régió) ad át. */
export function suggestRouteOffline(segments: readonly TrailSegment[], start: readonly number[], end: readonly number[]): RouteSuggestion {
	const graph = buildGraph(segments);
	const startNode = graph.snapToNearestEdge(start[0], start[1], MAX_SNAP_DISTANCE_METERS);
	const endNode = graph.snapToNearestEdge(end[0], end[1], MAX_SNAP_DISTANCE_METERS);
	if (startNode === null || endNode === null) {
		return notFound();
	}
	const pathNodes = graph.shortestPath(startNode, endNode);
	if (pathNodes === null) {
		return notFound();
	}

	const coordinates: number[][] = [[start[0], start[1]]];
	for (const node of pathNodes) {
		const point = graph.coordinateOf(node);
		const last = coordinates[coordinates.length - 1];
		if (haversineMeters(last[0], last[1], point[0], point[1]) > 0.1) {
			coordinates.push([point[0], point[1]]);
		}
	}
	const last = coordinates[coordinates.length - 1];
	if (haversineMeters(last[0], last[1], end[0], end[1]) > 0.1) {
		coordinates.push([end[0], end[1]]);
	}

	let distanceMeters = 0;
	for (let i = 1; i < coordinates.length; i++) {
		distanceMeters += haversineMeters(coordinates[i - 1][0], coordinates[i - 1][1], coordinates[i][0], coordinates[i][1]);
	}

	return { found: true, coordinates, distanceMeters };
}
