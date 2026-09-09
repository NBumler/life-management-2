import { compareRank, matchesSearch, searchFieldRank } from './text-search';

describe('matchesSearch', () => {
  it('is case-insensitive', () => {
    expect(matchesSearch('alma', 'Alma')).toBe(true);
  });

  it('is accent-insensitive both ways', () => {
    expect(matchesSearch('arviz', 'árvíz')).toBe(true);
    expect(matchesSearch('árvíz', 'arviz')).toBe(true);
  });

  it('matches substrings, not just whole strings', () => {
    expect(matchesSearch('polc', 'Kamra polc')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesSearch('sátor', 'kötél')).toBe(false);
  });

  it('empty query matches everything', () => {
    expect(matchesSearch('', 'anything')).toBe(true);
    expect(matchesSearch('   ', 'anything')).toBe(true);
  });
});

describe('compareRank', () => {
  it('ranks the accent-exact match ahead of the fold-only match when the query has an accent', () => {
    expect(compareRank('sör', 'Sör', 'Sor')).toBeLessThan(0);
    expect(compareRank('sör', 'Sor', 'Sör')).toBeGreaterThan(0);
  });

  it('does not force an order when the query has no accent', () => {
    expect(compareRank('sor', 'Sör', 'Sor')).toBe(0);
  });

  it('does not force an order when both or neither candidate matches exactly', () => {
    expect(compareRank('sör', 'Sör', 'Sör')).toBe(0);
    expect(compareRank('sör', 'Sor', 'Sor')).toBe(0);
  });
});

describe('searchFieldRank', () => {
  it('returns the 1-based position of the first matching field', () => {
    expect(searchFieldRank('lidl', ['Lidl kenyér', 'Aldi', null])).toBe(1);
    expect(searchFieldRank('lidl', ['Kenyér', 'Lidl', null])).toBe(2);
    expect(searchFieldRank('lidl', ['Kenyér', 'Aldi', 'lidl akció'])).toBe(3);
  });

  it('returns 0 when no field matches', () => {
    expect(searchFieldRank('spar', ['Kenyér', 'Aldi', null])).toBe(0);
  });

  it('skips null/undefined fields without matching them', () => {
    expect(searchFieldRank('x', [null, undefined, 'y'])).toBe(0);
  });

  it('blank query returns 1 (matches everything, best rank)', () => {
    expect(searchFieldRank('', ['whatever'])).toBe(1);
    expect(searchFieldRank('   ', [null])).toBe(1);
  });

  it('is accent- and case-insensitive like matchesSearch', () => {
    expect(searchFieldRank('arviz', ['Nincs', 'Árvíz utca'])).toBe(2);
  });
});
