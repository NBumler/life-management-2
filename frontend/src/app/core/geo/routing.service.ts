import { Injectable, inject } from '@angular/core';

import { BikeWay } from './bike-tile-codec';
import { BboxTuple, GeoAssetService } from './geo-asset.service';
import { buildBikeGraph } from './bike-routing-profile';
import { RouteGraph } from './route-graph';

/**
 * backlog/150 — eszközön futó útvonal-számítás a geo-csomag úthálózatán (Backend-offline first §14).
 * Csak a két pont körüli csempéket tölti be, így a memória és az idő a távolsággal nő, nem az
 * ország méretével. Ha a pont a csomagon kívül van, vagy nincs összefüggő út, `null` (nem becslés).
 */

/** Ennél messzebb lévő pontot nem illesztünk útra: az már nem a bicikli-hálózat része. */
export const MAX_SNAP_DISTANCE_METERS = 500;

/** A két pont körüli keresési sáv fokban (~5 km), hogy a kerülő utak is bekerüljenek. */
const SEARCH_MARGIN_DEG = 0.05;

/** Ennyi, egy térséghez tartozó felépített gráfot tartunk memóriában (FIFO-kiszorítás, mint a geo-asset csempe-cache-ben). */
const MAX_CACHED_GRAPHS = 3;

export type RouteProfile = 'BIKE';

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly geo = inject(GeoAssetService);
  /**
   * Gráf-gyorsítótár az érintett csempék fájlnév-halmaza szerint kulcsolva: ha a felhasználó
   * ugyanabban a térségben próbál több útvonalat (ez a jellemző használat), a gráfot csak az első
   * lekérdezés építi fel — ez a legnagyobb egyedi költség egy valódi csomagon (mért: több másodperc).
   */
  private readonly graphCache = new Map<string, RouteGraph>();

  /**
   * A legrövidebb (profil-súlyozott) útvonal `[lon, lat]` pontjai, vagy `null`, ha nincs útvonal
   * vagy a pont a csomagon kívül esik.
   */
  async route(profile: RouteProfile, from: readonly number[], to: readonly number[]): Promise<number[][] | null> {
    if (profile !== 'BIKE') {
      return null;
    }
    const bbox: BboxTuple = [
      Math.min(from[0], to[0]) - SEARCH_MARGIN_DEG,
      Math.min(from[1], to[1]) - SEARCH_MARGIN_DEG,
      Math.max(from[0], to[0]) + SEARCH_MARGIN_DEG,
      Math.max(from[1], to[1]) + SEARCH_MARGIN_DEG,
    ];
    const { tileFiles, ways } = await this.geo.bikeWaysIntersecting(bbox);
    if (ways.length === 0) {
      return null;
    }
    const graph = this.graphFor(tileFiles, ways);
    const start = graph.snapToNearestEdge(from[0], from[1], MAX_SNAP_DISTANCE_METERS);
    const goal = graph.snapToNearestEdge(to[0], to[1], MAX_SNAP_DISTANCE_METERS);
    if (start === null || goal === null) {
      return null;
    }
    const path = graph.shortestPath(start, goal);
    return path === null ? null : path.map((node) => [...graph.coordinateOf(node)]);
  }

  /** A pontos csempe-halmazhoz tartozó gráf; cache-találat esetén nem épít újra. */
  private graphFor(tileFiles: readonly string[], ways: readonly BikeWay[]): RouteGraph {
    const key = [...tileFiles].sort().join('|');
    let graph = this.graphCache.get(key);
    if (!graph) {
      graph = buildBikeGraph(ways);
      this.graphCache.set(key, graph);
      if (this.graphCache.size > MAX_CACHED_GRAPHS) {
        const oldest = this.graphCache.keys().next().value;
        if (oldest !== undefined) {
          this.graphCache.delete(oldest);
        }
      }
    }
    return graph;
  }
}
