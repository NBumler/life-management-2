import { BIKE_COST_CLASS, BikeWay } from './bike-tile-codec';
import { RouteGraph } from './route-graph';

/**
 * backlog/150 — bicikli routing-profil: a költségosztályhoz tartozó szorzó. 1 = légvonal-hossz;
 * a kisebb szorzó kedvezőbb (dedikált kerékpárút), a nagyobb kerülendő (főút). A táblát a
 * `tracking-config`-gal együtt kell hangolni, a binárisban nincs szorzó, csak az osztály.
 */
export const BIKE_COST_FACTORS: Readonly<Record<number, number>> = {
	[BIKE_COST_CLASS.CYCLEWAY]: 0.7,
	[BIKE_COST_CLASS.OFFROAD]: 0.85,
	[BIKE_COST_CLASS.QUIET_ROAD]: 1,
	[BIKE_COST_CLASS.ROAD]: 1.3,
	[BIKE_COST_CLASS.MAIN_ROAD]: 2,
};

/**
 * Gráf építése a dekódolt bicikli-utakból. Azonos koordinátájú csomópontok (pl. átfedő csempék
 * szélén) összeolvadnak, mert a `RouteGraph` a koordinátából képez kulcsot.
 */
export function buildBikeGraph(ways: readonly BikeWay[]): RouteGraph {
	const graph = new RouteGraph(Math.min(...Object.values(BIKE_COST_FACTORS)));
	for (const way of ways) {
		const factor = BIKE_COST_FACTORS[way.costClass] ?? BIKE_COST_FACTORS[BIKE_COST_CLASS.MAIN_ROAD];
		for (let i = 1; i < way.coordinates.length; i++) {
			const [lon1, lat1] = way.coordinates[i - 1];
			const [lon2, lat2] = way.coordinates[i];
			graph.addEdge(lon1, lat1, lon2, lat2, factor);
		}
	}
	return graph;
}
