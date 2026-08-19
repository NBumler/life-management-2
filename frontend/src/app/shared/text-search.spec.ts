import { compareRank, matchesSearch } from './text-search';

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
