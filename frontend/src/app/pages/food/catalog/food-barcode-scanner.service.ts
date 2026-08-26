import { Injectable } from '@angular/core';
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

/**
 * The one piece of this flow that's meaningfully unit-testable: `@capacitor-mlkit/barcode-scanning`
 * prefers `rawValue` (the undecoded payload) over `displayValue` (a formatted-for-display variant),
 * falling back when a scanner implementation only fills in one of them.
 */
export function pickBarcodeValue(barcodes: Barcode[]): string | null {
  return barcodes[0]?.rawValue ?? barcodes[0]?.displayValue ?? null;
}

/**
 * documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md "Scan & Pre-fill": thin wrapper over
 * `@capacitor-mlkit/barcode-scanning`'s ready-to-use `scan()` — isolated in its own injectable so
 * FoodListPage's tests can mock the camera flow.
 *
 * Deliberately not unit-tested beyond `pickBarcodeValue` above: `registerPlugin` (`@capacitor/core`)
 * returns the plugin object as a `Proxy` whose `get` trap unconditionally manufactures a fresh
 * native-calling wrapper on every property access — `spyOn(BarcodeScanner, 'scan')` writes a spy
 * that the same Proxy's `get` trap then ignores on the next read, so it can never actually intercept
 * a call. This method needs on-device verification instead.
 */
@Injectable({ providedIn: 'root' })
export class FoodBarcodeScannerService {
  /**
   * `null` covers every non-happy path alike (module not installed yet, camera permission denied,
   * user cancelled, no camera on this device) — documentation/Subfeatures/Vonalkódos élelmiszer
   * beolvasás.md has no distinct UX for these, the caller just stays on the catalog list.
   */
  async scan(): Promise<string | null> {
    try {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        // Fire-and-forget install; the module isn't ready for this attempt, so the user retries after it lands.
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        return null;
      }
      const { barcodes } = await BarcodeScanner.scan();
      return pickBarcodeValue(barcodes);
    } catch {
      return null;
    }
  }
}
