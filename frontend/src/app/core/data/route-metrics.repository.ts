import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RouteMetrics } from '../../api/model/routeMetrics';
import { TuraService } from '../../api/api/tura.service';

/**
 * backlog/tura-utvonaltervezo/103-... 2.3 fázis. documentation/Architektúra/Frontend.md `core/data/`:
 * mirrors RouteSuggestionRepository — közvetlenül becsomagolja a generált API-hívást, mert az
 * eredmény stateless/nem szinkronizált számítás (a `TuraPage` dönti el, mikor kéri le és mit kezd
 * az eredménnyel, ld. mentéskor a HikeRoute denormalizált mezőit).
 */
@Injectable({ providedIn: 'root' })
export class RouteMetricsRepository {
  private readonly turaService = inject(TuraService);
  readonly loading = signal(false);

  async compute(coordinates: readonly number[][]): Promise<RouteMetrics> {
    this.loading.set(true);
    try {
      return await firstValueFrom(this.turaService.computeRouteMetrics({ coordinates: coordinates as number[][] }));
    } finally {
      this.loading.set(false);
    }
  }
}
