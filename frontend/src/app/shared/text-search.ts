/**
 * documentation/Architektúra/Szöveges keresés.md: case- and accent-insensitive substring matching
 * for every search box in the app. Deliberately NOT the same normalization as name-normalization.ts
 * (Névegyediség) — there the accent must stay significant, here it must fold.
 */

// Unicode "Combining Diacritical Marks" block, numeric to keep the source plain ASCII instead of
// embedding actual combining characters (which render invisibly and are easy to corrupt).
const COMBINING_MARK_RANGE_START = 0x0300;
const COMBINING_MARK_RANGE_END = 0x036f;

function isCombiningMark(codePoint: number): boolean {
  return codePoint >= COMBINING_MARK_RANGE_START && codePoint <= COMBINING_MARK_RANGE_END;
}

function fold(input: string): string {
  const decomposed = input.normalize('NFD');
  let result = '';
  for (const char of decomposed) {
    if (!isCombiningMark(char.codePointAt(0) ?? 0)) {
      result += char;
    }
  }
  return result.toLowerCase();
}

/** Empty query matches everything (Szöveges keresés.md: "Üres query: teljes lista"). */
export function matchesSearch(query: string, candidate: string): boolean {
  const q = fold(query.trim());
  return q === '' || fold(candidate).includes(q);
}

/**
 * Comparator for `Array.prototype.sort` (stable per spec since ES2019): when the query contains an
 * accented character, candidates whose accented form matches it exactly are pulled ahead of
 * fold-only matches; ties (including the no-accent-in-query case) keep their relative order, so
 * this composes with a caller's own primary sort (e.g. alphabetical) as a secondary pass.
 */
export function compareRank(query: string, a: string, b: string): number {
  if (!queryHasAccent(query)) {
    return 0;
  }
  const q = query.trim().toLowerCase();
  const aExact = a.toLowerCase().includes(q);
  const bExact = b.toLowerCase().includes(q);
  if (aExact === bExact) {
    return 0;
  }
  return aExact ? -1 : 1;
}

function queryHasAccent(input: string): boolean {
  const decomposed = input.normalize('NFD');
  for (const char of decomposed) {
    if (isCombiningMark(char.codePointAt(0) ?? 0)) {
      return true;
    }
  }
  return false;
}
