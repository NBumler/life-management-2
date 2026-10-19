import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TrailSegment } from '../../api/model/trailSegment';
import { LonLatBbox, bboxOf, bboxesIntersect, expandBboxMeters, haversineMeters, polylineLengthMeters, withExactEndpoints } from './geo-math';
import { RouteGraph } from './route-graph';
import { MAX_SNAP_DISTANCE_METERS } from './routing.service';

/**
 * backlog/181 — a gráf csak a kezdő- és végpont bbox-ának ennyivel tágított környezetéből épül
 * (legalább `MIN_ROUTE_GRAPH_MARGIN_METERS`, de a két pont légvonalbeli távolságának
 * `ROUTE_GRAPH_MARGIN_FACTOR`-szorosa, hogy egy kerülő út is beleférjen). Ami ezen kívül esik, azt
 * a következő szint (backend, majd a build-asset gráf) találja meg.
 */
export const MIN_ROUTE_GRAPH_MARGIN_METERS = 2_000;
export const ROUTE_GRAPH_MARGIN_FACTOR = 0.5;

/** Szakaszonként egyszer számolt bbox — a `TrailSegment` objektumok a cache-ben változatlanok, így a `WeakMap` biztonságos. */
const segmentBboxes = new WeakMap<TrailSegment, LonLatBbox>();

export function trailSegmentBbox(segment: TrailSegment): LonLatBbox {
	let bbox = segmentBboxes.get(segment);
	if (bbox === undefined) {
		bbox = bboxOf(segment.coordinates);
		segmentBboxes.set(segment, bbox);
	}
	return bbox;
}

/** A `start`–`end` útvonalhoz szükséges környezet: a két pont bbox-a + a fenti margó. */
export function routeGraphBbox(start: readonly number[], end: readonly number[]): LonLatBbox {
	const direct = haversineMeters(start[0], start[1], end[0], end[1]);
	const margin = Math.max(MIN_ROUTE_GRAPH_MARGIN_METERS, direct * ROUTE_GRAPH_MARGIN_FACTOR);
	return expandBboxMeters(bboxOf([start, end]), margin);
}

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — a backend `RouteSuggestionService` (2.2 fázis)
 * gráf-keresésének on-device megfelelője. A gráf-motor a `core/geo/route-graph.ts`-ben él (közös a
 * bicikli-profillal); itt csak a turistaút-szakaszokból építjük fel a gráfot. Nem a szerver
 * bbox-táguló keresését ismétli: a kliens a ténylegesen betöltött szakaszokon keres.
 *
 * backlog/177 — a `pages/menu/tura/`-ból költözött ide (a `core/data/route-suggestion.repository`
 * hívja, a `core` nem függhet a `pages`-től); az illesztési küszöb a `RoutingService` `HIKE`
 * profiljáé, nem külön konstans.
 */

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
	const area = routeGraphBbox(start, end);
	const graph = buildGraph(segments.filter((segment) => bboxesIntersect(trailSegmentBbox(segment), area)));
	const maxSnap = MAX_SNAP_DISTANCE_METERS.HIKE;
	const startNode = graph.snapToNearestEdge(start[0], start[1], maxSnap);
	const endNode = graph.snapToNearestEdge(end[0], end[1], maxSnap);
	if (startNode === null || endNode === null) {
		return notFound();
	}
	const pathNodes = graph.shortestPath(startNode, endNode);
	if (pathNodes === null) {
		return notFound();
	}

	const coordinates = withExactEndpoints(
		pathNodes.map((node) => graph.coordinateOf(node)),
		start,
		end,
	);

	return { found: true, coordinates, distanceMeters: polylineLengthMeters(coordinates) };
}
