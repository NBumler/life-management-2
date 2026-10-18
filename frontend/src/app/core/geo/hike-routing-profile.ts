import { RouteGraph } from './route-graph';
import { WayFeature } from './way-tile-codec';

/**
 * backlog/151 — turistaút routing-profil. A szakaszok közt nincs preferencia (az offline A* eddig is
 * egységes súllyal futott, lásd a korábbi `pages/menu/tura/offline-route-graph.ts`-t); a csempe
 * osztálybájtja ezért mindig `TRAIL`, csak a formátum egyezése miatt van jelen (lásd `way-tile-codec`).
 */
export const HIKE_COST_CLASS = { TRAIL: 0 } as const;

/** Gráf építése a dekódolt turistaút-szakaszokból, légvonal-súlyozással (nincs úttípus-kedvezmény). */
export function buildHikeGraph(ways: readonly WayFeature[]): RouteGraph {
	const graph = new RouteGraph();
	for (const way of ways) {
		for (let i = 1; i < way.coordinates.length; i++) {
			const [lon1, lat1] = way.coordinates[i - 1];
			const [lon2, lat2] = way.coordinates[i];
			graph.addEdge(lon1, lat1, lon2, lat2);
		}
	}
	return graph;
}
