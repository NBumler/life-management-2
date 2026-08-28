/**
 * Orders kaja-catalog rows (Food / Recipe) exactly the way `SqliteStorageBackend.listFoods()` and
 * `listRecipes()` do — `ORDER BY name COLLATE NOCASE`. A repository's in-memory upsert keeps the
 * same order a later reload from the store would produce, so `items()` doesn't visibly reshuffle on
 * the next delta pull. (The order-insensitive set signature already shields downstream `computed()`s
 * from a mere reorder; this keeps the rendered list stable too.)
 *
 * SQLite `NOCASE` case-folds ASCII `A`–`Z` only, then compares by code point — mirrored here.
 */
export function byCatalogName<T extends { name: string }>(a: T, b: T): number {
  const left = a.name.replace(/[A-Z]/g, (c) => c.toLowerCase());
  const right = b.name.replace(/[A-Z]/g, (c) => c.toLowerCase());
  return left < right ? -1 : left > right ? 1 : 0;
}
