import { Injectable, signal } from '@angular/core';

import { Food } from '../../../api/model/food';

/**
 * documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md "Scan & Pre-fill": hands a
 * barcode-scan result to the next-opened FoodEditPage ('new' route) without round-tripping it
 * through the URL. `take()` clears it, so navigating to `new` again later doesn't reuse stale data.
 */
@Injectable({ providedIn: 'root' })
export class FoodPrefillService {
  private readonly pending = signal<Partial<Food> | null>(null);

  set(prefill: Partial<Food>): void {
    this.pending.set(prefill);
  }

  take(): Partial<Food> | null {
    const value = this.pending();
    this.pending.set(null);
    return value;
  }
}
