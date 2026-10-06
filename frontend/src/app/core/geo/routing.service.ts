import { Injectable, inject } from '@angular/core';

import { BboxTuple, GeoAssetService } from './geo-asset.service';
import { buildBikeGraph } from './bike-routing-profile';

/**
 * backlog/150 — eszközön futó útvonal-számítás a geo-csomag úthálózatán (Backend-offline first §14).
 * Csak a két pont körüli csempéket tölti be, így a memória és az idő a távolsággal nő, nem az
 * ország méretével. Ha a pont a csomagon kívül van, vagy nincs összefüggő út, `null` (nem becslés).
 */

/** Ennél messzebb lévő pontot nem illesztünk útra: az már nem a bicikli-hálózat része. */
export const MAX_SNAP_DISTANCE_METERS = 500;

/** A két pont körüli keresési sáv fokban (~5 km), hogy a kerülő utak is bekerüljenek. */
const SEARCH_MARGIN_DEG = 0.05;

export type RouteProfile = 'BIKE';

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly geo = inject(GeoAssetService);

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
    const ways = await this.geo.bikeWaysIntersecting(bbox);
    if (ways.length === 0) {
      return null;
    }
    const graph = buildBikeGraph(ways);
    const start = graph.snapToNearestEdge(from[0], from[1], MAX_SNAP_DISTANCE_METERS);
    const goal = graph.snapToNearestEdge(to[0], to[1], MAX_SNAP_DISTANCE_METERS);
    if (start === null || goal === null) {
      return null;
    }
    const path = graph.shortestPath(start, goal);
    return path === null ? null : path.map((node) => [...graph.coordinateOf(node)]);
  }
}
