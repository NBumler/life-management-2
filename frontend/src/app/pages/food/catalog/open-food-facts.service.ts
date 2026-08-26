import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OpenFoodFactsMappedFields, OpenFoodFactsResponse, buildOpenFoodFactsUrl, mapOpenFoodFactsProduct } from './open-food-facts';

/**
 * documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md + Backend-offline first.md: called
 * directly from the client, no backend proxy — needs network regardless of the app's own backend
 * reachability (Backend-offline: fine; Full-offline: this call simply fails, caller handles it).
 */
@Injectable({ providedIn: 'root' })
export class OpenFoodFactsService {
  private readonly http = inject(HttpClient);

  /** `null` when OFF has no product for this barcode (or the request failed — same handling as "no hit"). */
  async lookup(barcode: string): Promise<OpenFoodFactsMappedFields | null> {
    try {
      const response = await firstValueFrom(this.http.get<OpenFoodFactsResponse>(buildOpenFoodFactsUrl(barcode)));
      if (response.status !== 1 || !response.product) {
        return null;
      }
      return mapOpenFoodFactsProduct(response.product);
    } catch {
      return null;
    }
  }
}
