import { haversineMeters } from './geo-math';

/**
 * backlog/151 + backlog/150 — közös, eszközön futó útvonal-gráf és A* (a backend `RouteSuggestionService`
 * 2.2 fázisos keresésének általánosítása). Turistaút- és bicikli-profil is ugyanezt használja: a
 * gráf-forrás a hívóé, a profil a `costFactor`-ban él (1 = légvonal-hossz, <1 = kedvezőbb szakasz,
 * >1 = kedvezőtlenebb). A heurisztika a legkisebb szorzóval skálázódik, hogy elfogadható maradjon.
 */

const MAX_SNAP_NODE_KEY_PRECISION = 1_000_000;

interface Edge {
	to: string;
	weight: number;
}

interface RawEdge {
	from: string;
	to: string;
	costFactor: number;
}

/** Minimum-heap "lazy deletion" mintával — a `closed` halmaz szűri ki az elavult bejegyzéseket, nincs decrease-key. */
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

export class RouteGraph {
	private readonly coordinateByNode = new Map<string, [number, number]>();
	private readonly adjacency = new Map<string, Edge[]>();
	private readonly rawEdges: RawEdge[] = [];
	private virtualNodeCounter = 0;

	/** `minCostFactor`: a gráfban előforduló legkisebb `costFactor` — az A* heurisztika ezzel skálázódik. */
	constructor(private readonly minCostFactor = 1) {}

	private static key(lon: number, lat: number): string {
		return `${Math.round(lon * MAX_SNAP_NODE_KEY_PRECISION)}:${Math.round(lat * MAX_SNAP_NODE_KEY_PRECISION)}`;
	}

	addEdge(lon1: number, lat1: number, lon2: number, lat2: number, costFactor = 1): void {
		const from = RouteGraph.key(lon1, lat1);
		const to = RouteGraph.key(lon2, lat2);
		if (from === to) {
			return;
		}
		if (!this.coordinateByNode.has(from)) {
			this.coordinateByNode.set(from, [lon1, lat1]);
		}
		if (!this.coordinateByNode.has(to)) {
			this.coordinateByNode.set(to, [lon2, lat2]);
		}
		this.connect(from, to, haversineMeters(lon1, lat1, lon2, lat2) * costFactor);
		this.rawEdges.push({ from, to, costFactor });
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

	/** Merőleges vetítés az a→b szakaszra, lokális egyenközű síkbeli közelítésben. A `t` [0,1]-re szorítva. */
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

	/** A pontot a legközelebbi élre illeszti, és ott virtuális csomópontot szúr be. `null`, ha `maxDistanceMeters`-nél messzebb van. */
	snapToNearestEdge(lon: number, lat: number, maxDistanceMeters: number): string | null {
		let bestEdge: RawEdge | null = null;
		let bestPoint: [number, number] | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const edge of this.rawEdges) {
			const a = this.coordinateOf(edge.from);
			const b = this.coordinateOf(edge.to);
			const projected = RouteGraph.projectOntoSegment(lon, lat, a, b);
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
		this.connect(virtualNode, bestEdge.from, haversineMeters(bestPoint[0], bestPoint[1], a[0], a[1]) * bestEdge.costFactor);
		this.connect(virtualNode, bestEdge.to, haversineMeters(bestPoint[0], bestPoint[1], b[0], b[1]) * bestEdge.costFactor);
		return virtualNode;
	}

	private heuristic(node: string, goalPoint: [number, number]): number {
		const point = this.coordinateOf(node);
		return haversineMeters(point[0], point[1], goalPoint[0], goalPoint[1]) * this.minCostFactor;
	}

	/** A* a költség-súlyozott gráfon; `null`, ha nincs összeköttetés. */
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
				return RouteGraph.reconstructPath(cameFrom, current);
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
