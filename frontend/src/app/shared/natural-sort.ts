/**
 * backlog/079 — natural (alphanumeric) ordering for climbing route / boulder-problem "topo numbers"
 * (`Route.topoNumber` / `BoulderProblem.topoNumber` / `IndoorRoute.topoNumber`). Guidebook ordinals
 * are not plain integers — "5/a", "5b", "10a" all occur — so a plain string sort would put "10"
 * before "2". This splits each value into alternating digit / non-digit chunks and compares chunk by
 * chunk: two numeric chunks compare by value (shorter string first on an equal value, so "7" precedes
 * "07"), a numeric chunk precedes a non-numeric one, and two non-numeric chunks compare
 * case-insensitively (raw code-unit order as the tie-break, so "A" precedes "a"). Whitespace is
 * trimmed first.
 *
 * This is a pure client concern: the server never orders by `topoNumber` (its list endpoints stay
 * name-ordered), so there is no backend counterpart — but the ordering rules are pinned by
 * shared/fixtures/natural-sort.json (see natural-sort.spec.ts) to keep it stable across refactors.
 */

const CHUNK = /(\d+)/;

function chunks(value: string): string[] {
  return value
    .trim()
    .split(CHUNK)
    .filter((part) => part.length > 0);
}

function isDigits(chunk: string): boolean {
  return /^\d+$/.test(chunk);
}

/** Natural comparison of two arbitrary strings. Empty / blank strings sort after every real value. */
export function compareNatural(a: string, b: string): number {
  const ca = chunks(a);
  const cb = chunks(b);
  if (ca.length === 0 || cb.length === 0) {
    return ca.length === cb.length ? 0 : ca.length === 0 ? 1 : -1;
  }

  const shared = Math.min(ca.length, cb.length);
  for (let i = 0; i < shared; i += 1) {
    const x = ca[i];
    const y = cb[i];
    const xNum = isDigits(x);
    const yNum = isDigits(y);

    if (xNum && yNum) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) {
        return diff < 0 ? -1 : 1;
      }
      if (x.length !== y.length) {
        return x.length - y.length; // "7" before "07"
      }
      continue;
    }
    if (xNum !== yNum) {
      return xNum ? -1 : 1; // a numeric chunk precedes a non-numeric one
    }

    const lx = x.toLowerCase();
    const ly = y.toLowerCase();
    if (lx !== ly) {
      return lx < ly ? -1 : 1;
    }
    if (x !== y) {
      return x < y ? -1 : 1; // "A" before "a"
    }
  }

  return ca.length - cb.length; // "10" before "10a"
}

/**
 * Comparator for an optional topo number: present values first (natural order), then the rows with no
 * topo number. Returns 0 when neither side has one — callers fall back to a name comparison.
 */
export function compareTopoNumber(a: string | null | undefined, b: string | null | undefined): number {
  const av = a?.trim() ?? '';
  const bv = b?.trim() ?? '';
  if (av === '' && bv === '') {
    return 0;
  }
  if (av === '') {
    return 1;
  }
  if (bv === '') {
    return -1;
  }
  return compareNatural(av, bv);
}
