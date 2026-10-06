import { Injectable, inject } from '@angular/core';

import { GeoAssetService } from './geo-asset.service';
import { OpenMeteoElevationService } from './open-meteo-elevation.service';

/**
 * backlog/150 + 151 — magasság-forrás: elsőként az eszközön lévő DEM-csomag (Backend-offline first
 * §14–15, internet nélkül is), a csomagon kívül eső pontokra pedig az Open-Meteo, ha van net.
 * Az Open-Meteo csak a lefedettségen kívüli pontokat kéri le, így a HU-n belül nincs külső hívás.
 * Ha egyik forrás sem ad értéket, a hívó kap hibát (és `null`-t számol), soha nem 0-t (§14).
 */
@Injectable({ providedIn: 'root' })
export class ElevationService {
  private readonly dem = inject(GeoAssetService);
  private readonly openMeteo = inject(OpenMeteoElevationService);

  /** Magasságok méterben, a `points` sorrendjében. Rejt hibát, ha a lefedettségen kívüli pontokra nincs net. */
  async fetchElevations(points: readonly (readonly number[])[]): Promise<number[]> {
    const elevations: (number | null)[] = [];
    for (const point of points) {
      elevations.push(await this.dem.elevationAt(point[0], point[1]));
    }

    const missing = points.filter((_, i) => elevations[i] === null);
    if (missing.length === 0) {
      return elevations as number[];
    }

    const fallback = await this.openMeteo.fetchElevations(missing);
    let next = 0;
    return elevations.map((value) => (value !== null ? value : fallback[next++]));
  }
}
