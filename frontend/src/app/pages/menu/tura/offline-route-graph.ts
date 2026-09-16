import { RouteSuggestion } from '../../../api/model/routeSuggestion';
import { TrailSegment } from '../../../api/model/trailSegment';

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — a backend `RouteSuggestionService` (2.2 fázis) A*
 * gráf-keresésének 1:1 TS-portja, on-device (offline) automatikus útvonal-generáláshoz. Nem a
 * szerver bbox-táguló keresését ismétli (nincs rá szükség: a kliens csak a ténylegesen betöltött,
 * a térkép-viewportból vagy egy letöltött offline régióból származó `TrailSegment`-eken keres) —
 * ha a betöltött adatban nincs összeköttetés, a felhasználó közelebb kell hogy hozza a két pontot
 * (vagy a viewportot), ugyanúgy, ahogy online módban is a látható turistaút-hálózaton tervez.
 */

const MAX_SNAP_DISTANCE_METERS = 2_000;
const NODE_KEY_PRECISION = 1_000_000;
const EARTH_RADIUS_METERS = 6_371_000;

function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

interface Edge {
	to: string;
	weight: number;
}

interface RawEdge {
	from: string;
	to: string;
}

/** Minimum-heap a Java `PriorityQueue`-hoz hasonló "lazy deletion" mintával — a `closed` halmaz szűri ki az elavult bejegyzéseket ahelyett, hogy egy decrease-key műveletet kellene implementálni. */
class MinHeap {
	private readonly entries: { node: string; fScore: number }[] = [];

	push(node: string, fScore: number): void {
		this.entries.push({ node, fScore });
		let index = this.entries.length - 1;
		while (index > 0) {
			const parent = (index - 1) >> 1;
			if (this.entries[parent].fScore <= this.entries[index].fScore) {
				break;
			}
			[this.entries[parent], this.entries[index]] = [this.entries[index], this.entries[parent]];
			index = parent;
		}
	}

	pop(): string | undefined {
		if (this.entries.length === 0) {
			return undefined;
		}
		const top = this.entries[0];
		const last = this.entries.pop();
		if (this.entries.length > 0 && last) {
			this.entries[0] = last;
			let index = 0;
			for (;;) {
				const left = index * 2 + 1;
				const right = index * 2 + 2;
				let smallest = index;
				if (left < this.entries.length && this.entries[left].fScore < this.entries[smallest].fScore) {
					smallest = left;
				}
				if (right < this.entries.length && this.entries[right].fScore < this.entries[smallest].fScore) {
					smallest = right;
				}
				if (smallest === index) {
					break;
				}
				[this.entries[smallest], this.entries[index]] = [this.entries[index], this.entries[smallest]];
				index = smallest;
			}
		}
		return top.node;
	}

	get isEmpty(): boolean {
		return this.entries.length === 0;
	}
}

class Graph {
	private readonly coordinateByNode = new Map<string, [number, number]>();
	private readonly adjacency = new Map<string, Edge[]>();
	private readonly rawEdges: RawEdge[] = [];
	private virtualNodeCounter = 0;

	private static key(lon: number, lat: number): string {
		return `${Math.round(lon * NODE_KEY_PRECISION)}:${Math.round(lat * NODE_KEY_PRECISION)}`;
	}

	addEdge(lon1: number, lat1: number, lon2: number, lat2: number): void {
		const from = Graph.key(lon1, lat1);
		const to = Graph.key(lon2, lat2);
		if (from === to) {
			return;
		}
		if (!this.coordinateByNode.has(from)) {
			this.coordinateByNode.set(from, [lon1, lat1]);
		}
		if (!this.coordinateByNode.has(to)) {
			this.coordinateByNode.set(to, [lon2, lat2]);
		}
		const weight = haversineMeters(lon1, lat1, lon2, lat2);
		this.connect(from, to, weight);
		this.rawEdges.push({ from, to });
	}

	coordinateOf(node: string): [number, number] {
		const point = this.coordinateByNode.get(node);
		if (!point) {
			throw new Error(`Unknown graph node: ${node}`);
		}
		return point;
	}

	private connect(from: string, to: string, weight: number): void {
		if (!this.adjacency.has(from)) {
			this.adjacency.set(from, []);
		}
		if (!this.adjacency.has(to)) {
			this.adjacency.set(to, []);
		}
		this.adjacency.get(from)!.push({ to, weight });
		this.adjacency.get(to)!.push({ to: from, weight });
	}

	/** Merőleges vetítés az a→b szakaszra, lokális egyenközű síkbeli közelítésben — ld. a backend `RouteSuggestionService.Graph#projectOntoSegment` ugyanezen dokumentációját. */
	private static projectOntoSegment(lon: number, lat: number, a: [number, number], b: [number, number]): [number, number] {
		const lonScale = Math.cos((a[1] * Math.PI) / 180);
		const ax = a[0] * lonScale;
		const ay = a[1];
		const bx = b[0] * lonScale;
		const by = b[1];
		const px = lon * lonScale;
		const py = lat;
		const dx = bx - ax;
		const dy = by - ay;
		const lengthSquared = dx * dx + dy * dy;
		let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
		t = Math.max(0, Math.min(1, t));
		return [(ax + t * dx) / lonScale, ay + t * dy];
	}

	snapToNearestEdge(lon: number, lat: number, maxDistanceMeters: number): string | null {
		let bestEdge: RawEdge | null = null;
		let bestPoint: [number, number] | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const edge of this.rawEdges) {
			const a = this.coordinateOf(edge.from);
			const b = this.coordinateOf(edge.to);
			const projected = Graph.projectOntoSegment(lon, lat, a, b);
			const distance = haversineMeters(lon, lat, projected[0], projected[1]);
			if (distance < bestDistance) {
				bestDistance = distance;
				bestEdge = edge;
				bestPoint = projected;
			}
		}
		if (!bestEdge || !bestPoint || bestDistance > maxDistanceMeters) {
			return null;
		}
		const virtualNode = `virtual:${this.virtualNodeCounter++}`;
		this.coordinateByNode.set(virtualNode, bestPoint);
		const a = this.coordinateOf(bestEdge.from);
		const b = this.coordinateOf(bestEdge.to);
		this.connect(virtualNode, bestEdge.from, haversineMeters(bestPoint[0], bestPoint[1], a[0], a[1]));
		this.connect(virtualNode, bestEdge.to, haversineMeters(bestPoint[0], bestPoint[1], b[0], b[1]));
		return virtualNode;
	}

	private heuristic(node: string, goalPoint: [number, number]): number {
		const point = this.coordinateOf(node);
		return haversineMeters(point[0], point[1], goalPoint[0], goalPoint[1]);
	}

	shortestPath(start: string, goal: string): string[] | null {
		if (start === goal) {
			return [start];
		}
		const goalPoint = this.coordinateOf(goal);
		const gScore = new Map<string, number>([[start, 0]]);
		const cameFrom = new Map<string, string>();
		const closed = new Set<string>();
		const open = new MinHeap();
		open.push(start, this.heuristic(start, goalPoint));

		while (!open.isEmpty) {
			const current = open.pop();
			if (current === undefined || closed.has(current)) {
				continue;
			}
			closed.add(current);
			if (current === goal) {
				return Graph.reconstructPath(cameFrom, current);
			}
			const currentG = gScore.get(current) ?? Number.POSITIVE_INFINITY;
			for (const edge of this.adjacency.get(current) ?? []) {
				if (closed.has(edge.to)) {
					continue;
				}
				const tentativeG = currentG + edge.weight;
				if (tentativeG < (gScore.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
					cameFrom.set(edge.to, current);
					gScore.set(edge.to, tentativeG);
					open.push(edge.to, tentativeG + this.heuristic(edge.to, goalPoint));
				}
			}
		}
		return null;
	}

	private static reconstructPath(cameFrom: Map<string, string>, goal: string): string[] {
		const path: string[] = [goal];
		let current = goal;
		while (cameFrom.has(current)) {
			current = cameFrom.get(current)!;
			path.unshift(current);
		}
		return path;
	}
}

function buildGraph(segments: readonly TrailSegment[]): Graph {
	const graph = new Graph();
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
