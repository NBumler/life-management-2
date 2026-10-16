import { haversineMeters } from './geo-math';

/**
 * backlog/151 + backlog/150 — közös, eszközön futó útvonal-gráf és A* (a backend `RouteSuggestionService`
 * 2.2 fázisos keresésének általánosítása). Turistaút- és bicikli-profil is ugyanezt használja: a
 * gráf-forrás a hívóé, a profil a `costFactor`-ban él (1 = légvonal-hossz, <1 = kedvezőbb szakasz,
 * >1 = kedvezőtlenebb). A heurisztika a legkisebb szorzóval skálázódik, hogy elfogadható maradjon.
 *
 * backlog/150 teljesítmény-kör (2026-10-17): valódi bicikli-csomagon (100k+ út, 500k+ él) mérve a
 * korábbi sztring-kulcsos változat 8–12 s-ot vett igénybe egy 50 km-es útvonalra (cél: < 2 s). A
 * csomópont-azonosító ezért egész szám (nem sztring), az illesztés (`snapToNearestEdge`) pedig
 * rácsos térbeli indexet használ a teljes élhalmaz helyett. A nyilvános felület (csomópont-azonosító
 * mint `number`, egyébként átlátszó típus) viselkedése nem változik, csak gyorsabb.
 */

/** Csomópont-azonosító: ≥0 valódi, rácsból képzett csomópont; <0 `snapToNearestEdge` szülte virtuális csomópont. */
type NodeId = number;

/** A csomópont-dedup pontossága (rácsra kerekítés), ugyanaz, mint a bicikli-csempe kvantálása. */
const NODE_KEY_PRECISION = 1_000_000;

/** A snap-rács cellamérete fokban (~0,7–1,1 km); kompromisszum a cellánkénti él-szám és a cellaszám közt. */
const SNAP_GRID_CELL_DEG = 0.01;

/** Egy hosszú (kerülő-kódolt) él ennél több cellát nem foglalhat el a rácsban — a középpontjába indexeljük helyette. */
const MAX_GRID_CELLS_PER_EDGE = 400;

interface Edge {
	to: NodeId;
	weight: number;
}

interface RawEdge {
	from: NodeId;
	to: NodeId;
	costFactor: number;
}

/** Minimum-heap "lazy deletion" mintával — a `closed` halmaz szűri ki az elavult bejegyzéseket, nincs decrease-key. */
class MinHeap {
	private readonly entries: { node: NodeId; fScore: number }[] = [];

	push(node: NodeId, fScore: number): void {
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

	pop(): NodeId | undefined {
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
	/** Csomópont-dedup építéskor: lon-egész → lat-egész → azonosító. Beágyazott egész kulcsok, nincs sztring-összefűzés. */
	private readonly nodeIndexByLon = new Map<number, Map<number, NodeId>>();
	private readonly lonByNode: number[] = [];
	private readonly latByNode: number[] = [];
	private nextNodeId = 0;

	private readonly virtualCoordinates = new Map<NodeId, [number, number]>();
	private virtualNodeCounter = 0;

	/** Valódi csomópontra tömb (gyors, index=azonosító); virtuálisra Map, mert ritka és negatív az id. */
	private readonly adjacency: Edge[][] = [];
	private readonly virtualAdjacency = new Map<NodeId, Edge[]>();

	/** Snap-rács: `"cellX:cellY"` → az ott (részben) áthaladó élek. Csak az illesztéshez kell. */
	private readonly edgeGrid = new Map<string, RawEdge[]>();

	/** `minCostFactor`: a gráfban előforduló legkisebb `costFactor` — az A* heurisztika ezzel skálázódik. */
	constructor(private readonly minCostFactor = 1) {}

	private static cellOf(lon: number, lat: number): [number, number] {
		return [Math.floor(lon / SNAP_GRID_CELL_DEG), Math.floor(lat / SNAP_GRID_CELL_DEG)];
	}

	private static gridKey(cellX: number, cellY: number): string {
		return `${cellX}:${cellY}`;
	}

	/** A koordinátához tartozó csomópont-azonosító; első előfordulásnál létrehozza. */
	private nodeIdFor(lon: number, lat: number): NodeId {
		const lonInt = Math.round(lon * NODE_KEY_PRECISION);
		const latInt = Math.round(lat * NODE_KEY_PRECISION);
		let byLat = this.nodeIndexByLon.get(lonInt);
		if (!byLat) {
			byLat = new Map();
			this.nodeIndexByLon.set(lonInt, byLat);
		}
		let id = byLat.get(latInt);
		if (id === undefined) {
			id = this.nextNodeId++;
			byLat.set(latInt, id);
			this.lonByNode[id] = lon;
			this.latByNode[id] = lat;
		}
		return id;
	}

	addEdge(lon1: number, lat1: number, lon2: number, lat2: number, costFactor = 1): void {
		const from = this.nodeIdFor(lon1, lat1);
		const to = this.nodeIdFor(lon2, lat2);
		if (from === to) {
			return;
		}
		this.connect(from, to, haversineMeters(lon1, lat1, lon2, lat2) * costFactor);
		this.indexEdge({ from, to, costFactor });
	}

	coordinateOf(node: NodeId): [number, number] {
		if (node >= 0) {
			const lon = this.lonByNode[node];
			if (lon === undefined) {
				throw new Error(`Unknown graph node: ${node}`);
			}
			return [lon, this.latByNode[node]];
		}
		const point = this.virtualCoordinates.get(node);
		if (!point) {
			throw new Error(`Unknown graph node: ${node}`);
		}
		return point;
	}

	/** Valódi csomópontra tömb-slot (gyors), virtuálisra Map-bejegyzés — mindkettő ugyanazt az `Edge[]`-et adja vissza. */
	private edgesOf(node: NodeId): Edge[] {
		if (node >= 0) {
			return (this.adjacency[node] ??= []);
		}
		let edges = this.virtualAdjacency.get(node);
		if (!edges) {
			edges = [];
			this.virtualAdjacency.set(node, edges);
		}
		return edges;
	}

	private connect(from: NodeId, to: NodeId, weight: number): void {
		this.edgesOf(from).push({ to, weight });
		this.edgesOf(to).push({ to: from, weight });
	}

	/** Az élt a rács minden érintett cellájába beteszi, hogy `snapToNearestEdge` ne a teljes élhalmazon keressen. */
	private indexEdge(edge: RawEdge): void {
		const a = this.coordinateOf(edge.from);
		const b = this.coordinateOf(edge.to);
		let [minX, minY] = RouteGraph.cellOf(Math.min(a[0], b[0]), Math.min(a[1], b[1]));
		let [maxX, maxY] = RouteGraph.cellOf(Math.max(a[0], b[0]), Math.max(a[1], b[1]));
		if ((maxX - minX + 1) * (maxY - minY + 1) > MAX_GRID_CELLS_PER_EDGE) {
			// Szokatlanul hosszú (pl. kerülő-kódolt) él: csak a középpontja cellájába indexeljük — a
			// lekérdezés a tényleges vetítést úgyis kiszámolja, ez csak a jelölt-halmazt szűkíti.
			[minX, minY] = RouteGraph.cellOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
			maxX = minX;
			maxY = minY;
		}
		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				const key = RouteGraph.gridKey(x, y);
				let bucket = this.edgeGrid.get(key);
				if (!bucket) {
					bucket = [];
					this.edgeGrid.set(key, bucket);
				}
				bucket.push(edge);
			}
		}
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
	snapToNearestEdge(lon: number, lat: number, maxDistanceMeters: number): NodeId | null {
		// A rács fokban van, a táv méterben — a hosszúsági fok méter-megfelelője szélességtől függ
		// (cos(lat)), ezért külön margót számolunk a két tengelyre, nem egyetlen közös sugarat.
		const latRad = (lat * Math.PI) / 180;
		const latMarginDeg = maxDistanceMeters / 111_320;
		const lonMarginDeg = maxDistanceMeters / (111_320 * Math.max(0.1, Math.cos(latRad)));
		const [cx, cy] = RouteGraph.cellOf(lon, lat);
		const rangeX = Math.max(1, Math.ceil(lonMarginDeg / SNAP_GRID_CELL_DEG));
		const rangeY = Math.max(1, Math.ceil(latMarginDeg / SNAP_GRID_CELL_DEG));

		let bestEdge: RawEdge | null = null;
		let bestPoint: [number, number] | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		const seen = new Set<RawEdge>();
		for (let x = cx - rangeX; x <= cx + rangeX; x++) {
			for (let y = cy - rangeY; y <= cy + rangeY; y++) {
				const bucket = this.edgeGrid.get(RouteGraph.gridKey(x, y));
				if (!bucket) {
					continue;
				}
				for (const edge of bucket) {
					if (seen.has(edge)) {
						continue;
					}
					seen.add(edge);
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
			}
		}
		if (!bestEdge || !bestPoint || bestDistance > maxDistanceMeters) {
			return null;
		}
		const virtualNode = -(this.virtualNodeCounter++ + 1);
		this.virtualCoordinates.set(virtualNode, bestPoint);
		const a = this.coordinateOf(bestEdge.from);
		const b = this.coordinateOf(bestEdge.to);
		this.connect(virtualNode, bestEdge.from, haversineMeters(bestPoint[0], bestPoint[1], a[0], a[1]) * bestEdge.costFactor);
		this.connect(virtualNode, bestEdge.to, haversineMeters(bestPoint[0], bestPoint[1], b[0], b[1]) * bestEdge.costFactor);
		return virtualNode;
	}

	private heuristic(node: NodeId, goalPoint: [number, number]): number {
		const point = this.coordinateOf(node);
		return haversineMeters(point[0], point[1], goalPoint[0], goalPoint[1]) * this.minCostFactor;
	}

	/** A* a költség-súlyozott gráfon; `null`, ha nincs összeköttetés. */
	shortestPath(start: NodeId, goal: NodeId): NodeId[] | null {
		if (start === goal) {
			return [start];
		}
		const goalPoint = this.coordinateOf(goal);
		const gScore = new Map<NodeId, number>([[start, 0]]);
		const cameFrom = new Map<NodeId, NodeId>();
		const closed = new Set<NodeId>();
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
			for (const edge of this.edgesOf(current)) {
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

	private static reconstructPath(cameFrom: Map<NodeId, NodeId>, goal: NodeId): NodeId[] {
		const path: NodeId[] = [goal];
		let current = goal;
		while (cameFrom.has(current)) {
			current = cameFrom.get(current)!;
			path.unshift(current);
		}
		return path;
	}
}
