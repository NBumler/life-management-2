import { StoredFood } from '../../../api/model/storedFood';
import { DurationUnit, ParsedQuantity } from '../../../shared/quantity';

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md — expiry date math for storage items. Deliberately
 * separate from shared/quantity.ts's canonical-unit table: that table is fixed-day (`hó`=30,
 * `év`=365) and explicitly documented as "not for date arithmetic" (documentation/Architektúra/
 * Mennyiség mező.md) — real expiry dates need calendar month/year addition (Jan 31 + 1 hónap = Feb
 * 28/29, not "roll over into March"), which this file implements instead.
 *
 * All dates are plain `YYYY-MM-DD` strings compared/produced via `Date.UTC` round-trips only — never
 * `new Date()`/local getters — so there is no timezone drift in the calendar math itself (the caller
 * is responsible for passing in the device's local "today", see shared/local-date.ts).
 */

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function toIso(year: number, month1: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Naptári hónap/év-hozzáadás, hónap-hossz clamp-eléssel (nem roll-over) — pl. jan 31 + 1 hónap = feb 28/29. */
function addCalendarMonths(dateIso: string, months: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth0 = ((totalMonths % 12) + 12) % 12;
  const clampedDay = Math.min(d, daysInMonth(targetYear, targetMonth0));
  return toIso(targetYear, targetMonth0 + 1, clampedDay);
}

/**
 * documentation/Architektúra/Mennyiség mező.md "duration"/`shared/quantity.ts` `DurationUnit`
 * applied as real calendar arithmetic. `perc`/`óra` have no sub-day meaning for an expiry date, so
 * they floor down to whole days (60 perc/óra és 24 óra/nap egzakt, naptári kétértelműség nélkül).
 */
export function addDurationToDate(dateIso: string, amount: number, unit: DurationUnit): string {
  switch (unit) {
    case 'perc':
      return addDays(dateIso, Math.floor(amount / 1440));
    case 'óra':
      return addDays(dateIso, Math.floor(amount / 24));
    case 'nap':
      return addDays(dateIso, amount);
    case 'hét':
      return addDays(dateIso, amount * 7);
    case 'hó':
      return addCalendarMonths(dateIso, amount);
    case 'év':
      return addCalendarMonths(dateIso, amount * 12);
  }
}

/** documentation/Subfeatures/Élelmiszer tárolás.md "Lejárat (általános)": prefill from the catalog's per-location duration, or null if it has none (user must pick manually). */
export function computeInitialExpiry(baseDateIso: string, catalogDuration: ParsedQuantity<DurationUnit>): string | null {
  if (catalogDuration.amount === null || catalogDuration.unit === null) {
    return null;
  }
  return addDurationToDate(baseDateIso, catalogDuration.amount, catalogDuration.unit);
}

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md "Felbontás": new expiry = min(today + catalog's
 * "felbontás után" duration, previous expiry) — unchanged if that catalog field is empty. Also used
 * at create time when the item is added already-opened ("Opcionálisan rögtön felbontva").
 */
export function computeOpenedExpiry(currentExpiresOn: string, todayIso: string, afterOpeningDuration: ParsedQuantity<DurationUnit>): string {
  if (afterOpeningDuration.amount === null || afterOpeningDuration.unit === null) {
    return currentExpiresOn;
  }
  const candidate = addDurationToDate(todayIso, afterOpeningDuration.amount, afterOpeningDuration.unit);
  return candidate < currentExpiresOn ? candidate : currentExpiresOn;
}

/** documentation/Subfeatures/Élelmiszer tárolás.md "Tárolási hely": engedélyezett = katalógusban kitöltött idő; ha egyik sincs kitöltve, mindhárom választható. */
export function allowedStorageLocations(food: {
  shelfRoomAmount?: number | null;
  shelfFridgeAmount?: number | null;
  shelfFreezerAmount?: number | null;
}): StoredFood.StorageLocationEnum[] {
  const allowed: StoredFood.StorageLocationEnum[] = [];
  if (food.shelfRoomAmount !== null && food.shelfRoomAmount !== undefined) {
    allowed.push(StoredFood.StorageLocationEnum.Room);
  }
  if (food.shelfFridgeAmount !== null && food.shelfFridgeAmount !== undefined) {
    allowed.push(StoredFood.StorageLocationEnum.Fridge);
  }
  if (food.shelfFreezerAmount !== null && food.shelfFreezerAmount !== undefined) {
    allowed.push(StoredFood.StorageLocationEnum.Freezer);
  }
  return allowed.length > 0
    ? allowed
    : [StoredFood.StorageLocationEnum.Room, StoredFood.StorageLocationEnum.Fridge, StoredFood.StorageLocationEnum.Freezer];
}

/** documentation/Subfeatures/Élelmiszer tárolás.md "Felbontás": the catalog's after-opening duration — same for every storage location. */
export function afterOpeningDuration(food: { shelfAfterOpeningAmount?: number | null; shelfAfterOpeningUnit?: string | null }): ParsedQuantity<DurationUnit> {
  return { amount: food.shelfAfterOpeningAmount ?? null, unit: (food.shelfAfterOpeningUnit as DurationUnit) ?? null };
}

/** Per-location catalog shelf-life duration lookup, for computeInitialExpiry. */
export function catalogDurationFor(
  food: {
    shelfRoomAmount?: number | null;
    shelfRoomUnit?: string | null;
    shelfFridgeAmount?: number | null;
    shelfFridgeUnit?: string | null;
    shelfFreezerAmount?: number | null;
    shelfFreezerUnit?: string | null;
  },
  location: StoredFood.StorageLocationEnum,
): ParsedQuantity<DurationUnit> {
  if (location === StoredFood.StorageLocationEnum.Room) {
    return { amount: food.shelfRoomAmount ?? null, unit: (food.shelfRoomUnit as DurationUnit) ?? null };
  }
  if (location === StoredFood.StorageLocationEnum.Fridge) {
    return { amount: food.shelfFridgeAmount ?? null, unit: (food.shelfFridgeUnit as DurationUnit) ?? null };
  }
  return { amount: food.shelfFreezerAmount ?? null, unit: (food.shelfFreezerUnit as DurationUnit) ?? null };
}
