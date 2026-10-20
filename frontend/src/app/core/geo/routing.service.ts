import { Injectable, inject } from '@angular/core';

import { BboxTuple, GeoAssetService } from './geo-asset.service';
import { buildBikeGraph } from './bike-routing-profile';
import { bboxOf, expandBboxMeters, isNearAnyLine } from './geo-math';
import { buildHikeGraph } from './hike-routing-profile';
import { RouteGraph } from './route-graph';
import { WayFeature } from './way-tile-codec';

/**
 * backlog/150 + backlog/151 — eszközön futó útvonal-számítás a geo-csomag úthálózatán
 * (Backend-offline first §14). Csak a két pont körüli csempéket tölti be, így a memória és az idő
 * a távolsággal nő, nem az ország méretével. Ha a pont a csomagon kívül van, vagy nincs összefüggő
 * út, `null` (nem becslés).
 */

export type RouteProfile = 'BIKE' | 'HIKE';

/**
 * Profilonkénti illesztési küszöb: a bicikli-hálózat sűrűbb, a turistaút ritkább. A `HIKE` értéket a
 * viewport-szakaszokon kereső `segment-route-graph.ts` is ezt használja (backlog/177).
 */
export const MAX_SNAP_DISTANCE_METERS: Readonly<Record<RouteProfile, number>> = {
	BIKE: 500,
	HIKE: 2_000,
};

/** A két pont körüli keresési sáv fokban (~5 km), hogy a kerülő utak is bekerüljenek. */
const SEARCH_MARGIN_DEG = 0.05;

/** Ennyi, egy térséghez tartozó felépített gráfot tartunk memóriában profilonként (FIFO-kiszorítás, mint a geo-asset csempe-cache-ben). */
const MAX_CACHED_GRAPHS_PER_PROFILE = 3;

interface ProfileAdapter {
	waysIntersecting(geo: GeoAssetService, bbox: BboxTuple): Promise<{ tileFiles: string[]; ways: WayFeature[] }>;
	buildGraph(ways: readonly WayFeature[]): RouteGraph;
}

const ADAPTERS: Readonly<Record<RouteProfile, ProfileAdapter>> = {
	BIKE: { waysIntersecting: (geo, bbox) => geo.bikeWaysIntersecting(bbox), buildGraph: buildBikeGraph },
	HIKE: { waysIntersecting: (geo, bbox) => geo.hikeWaysIntersecting(bbox), buildGraph: buildHikeGraph },
};

@Injectable({ providedIn: 'root' })
export class RoutingService {
	private readonly geo = inject(GeoAssetService);
	/**
	 * Gráf-gyorsítótár profil + érintett csempék fájlnév-halmaza szerint kulcsolva: ha a felhasználó
	 * ugyanabban a térségben próbál több útvonalat (ez a jellemző használat), a gráfot csak az első
	 * lekérdezés építi fel — ez a legnagyobb egyedi költség egy valódi csomagon (mért: több másodperc).
	 */
	private readonly graphCache = new Map<string, RouteGraph>();

	/**
	 * A legrövidebb (profil-súlyozott) útvonal `[lon, lat]` pontjai, vagy `null`, ha nincs útvonal
	 * vagy a pont a csomagon kívül esik.
	 */
	async route(profile: RouteProfile, from: readonly number[], to: readonly number[]): Promise<number[][] | null> {
		const bbox: BboxTuple = [
			Math.min(from[0], to[0]) - SEARCH_MARGIN_DEG,
			Math.min(from[1], to[1]) - SEARCH_MARGIN_DEG,
			Math.max(from[0], to[0]) + SEARCH_MARGIN_DEG,
			Math.max(from[1], to[1]) + SEARCH_MARGIN_DEG,
		];
		const adapter = ADAPTERS[profile];
		const { tileFiles, ways } = await adapter.waysIntersecting(this.geo, bbox);
		if (ways.length === 0) {
			return null;
		}
		const graph = this.graphFor(profile, tileFiles, ways, adapter);
		const maxSnap = MAX_SNAP_DISTANCE_METERS[profile];
		const start = graph.snapToNearestEdge(from[0], from[1], maxSnap);
		const goal = graph.snapToNearestEdge(to[0], to[1], maxSnap);
		if (start === null || goal === null) {
			return null;
		}
		const path = graph.shortestPath(start, goal);
		return path === null ? null : path.map((node) => [...graph.coordinateOf(node)]);
	}

	/**
	 * backlog/221 — van-e a csomagban a profil illesztési küszöbén belül út a pont körül; `null`, ha a
	 * csomag a pontot nem fedi (ilyenkor nem tudjuk). Gráfot nem épít, csak a csempék útjait nézi.
	 */
	async isNearWay(profile: RouteProfile, point: readonly number[]): Promise<boolean | null> {
		if (!(await this.geo.covers(point[0], point[1]))) {
			return null;
		}
		const maxSnap = MAX_SNAP_DISTANCE_METERS[profile];
		const [minLon, minLat, maxLon, maxLat] = expandBboxMeters(bboxOf([point]), maxSnap);
		const area: BboxTuple = [minLon, minLat, maxLon, maxLat];
		const { ways } = await ADAPTERS[profile].waysIntersecting(this.geo, area);
		return isNearAnyLine(
			point,
			ways.map((way) => way.coordinates),
			maxSnap,
		);
	}

	/** A pontos profil + csempe-halmazhoz tartozó gráf; cache-találat esetén nem épít újra. */
	private graphFor(profile: RouteProfile, tileFiles: readonly string[], ways: readonly WayFeature[], adapter: ProfileAdapter): RouteGraph {
		const key = `${profile}:${[...tileFiles].sort().join('|')}`;
		let graph = this.graphCache.get(key);
		if (!graph) {
			graph = adapter.buildGraph(ways);
			this.graphCache.set(key, graph);
			this.evictOldestGraphsFor(profile);
		}
		return graph;
	}

	/** Profilonként külön korlát (nem egy közös szám), hogy egy sok bicikli-lekérdezés ne nyomja ki a turistaút-gráfokat. */
	private evictOldestGraphsFor(profile: RouteProfile): void {
		const prefix = `${profile}:`;
		const keysForProfile = [...this.graphCache.keys()].filter((key) => key.startsWith(prefix));
		while (keysForProfile.length > MAX_CACHED_GRAPHS_PER_PROFILE) {
			const oldest = keysForProfile.shift();
			if (oldest === undefined) {
				return;
			}
			this.graphCache.delete(oldest);
		}
	}
}
