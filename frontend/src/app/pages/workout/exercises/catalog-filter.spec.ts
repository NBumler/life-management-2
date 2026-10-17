import { Exercise } from '../../../api/model/exercise';
import { StretchExercise } from '../../../api/model/stretchExercise';
import { CatalogEntry, CatalogFilter, filterCatalog, toggleInSet } from './catalog-filter';

function strength(id: string, category: Exercise.CategoryEnum, overrides: Partial<Exercise> = {}): CatalogEntry {
  return {
    type: 'STRENGTH',
    item: { id, name: id, category, kind: Exercise.KindEnum.WeightedReps, isFavorite: false, deleted: false, ...overrides },
  };
}

function stretch(id: string, category: StretchExercise.CategoryEnum, overrides: Partial<StretchExercise> = {}): CatalogEntry {
  return {
    type: 'STRETCH',
    item: { id, name: id, category, isFavorite: false, defaultHoldSeconds: 30, defaultPerSide: false, deleted: false, ...overrides },
  };
}

const NO_FILTER: CatalogFilter = { types: new Set(), categories: new Set(), favoritesOnly: false, query: '' };

describe('catalog-filter (backlog/167)', () => {
  const entries: CatalogEntry[] = [
    strength('row-back', Exercise.CategoryEnum.Back),
    strength('row-chest', Exercise.CategoryEnum.Chest, { isFavorite: true }),
    stretch('str-back', StretchExercise.CategoryEnum.Back),
    stretch('str-neck', StretchExercise.CategoryEnum.Neck, { isFavorite: true, equipment: 'Törölköző' }),
  ];
  const ids = (filter: Partial<CatalogFilter>): string[] =>
    filterCatalog(entries, { ...NO_FILTER, ...filter }).map((entry) => entry.item.id);

  it('nothing selected: everything', () => {
    expect(ids({})).toEqual(['row-back', 'row-chest', 'str-back', 'str-neck']);
  });

  it('type chip alone filters by type', () => {
    expect(ids({ types: new Set(['STRETCH'] as const) })).toEqual(['str-back', 'str-neck']);
    expect(ids({ types: new Set(['STRENGTH', 'STRETCH'] as const) })).toEqual(['row-back', 'row-chest', 'str-back', 'str-neck']);
  });

  it('categories combine with OR inside the group, across both types', () => {
    expect(ids({ categories: new Set([Exercise.CategoryEnum.Back, Exercise.CategoryEnum.Neck]) })).toEqual([
      'row-back',
      'str-back',
      'str-neck',
    ]);
  });

  it('groups combine with AND: "Hát + Nyújtás" = back stretches only', () => {
    expect(ids({ types: new Set(['STRETCH'] as const), categories: new Set([Exercise.CategoryEnum.Back]) })).toEqual(['str-back']);
  });

  it('Kedvencek and the search also AND with the chips', () => {
    expect(ids({ favoritesOnly: true })).toEqual(['row-chest', 'str-neck']);
    expect(ids({ favoritesOnly: true, types: new Set(['STRENGTH'] as const) })).toEqual(['row-chest']);
    expect(ids({ query: 'torolkozo' })).toEqual(['str-neck']);
  });

  it('toggleInSet() adds an absent value, removes a present one, and never mutates the input', () => {
    const start = new Set(['a']);
    const added = toggleInSet(start, 'b');
    const removed = toggleInSet(added, 'a');

    expect([...added]).toEqual(['a', 'b']);
    expect([...removed]).toEqual(['b']);
    expect([...start]).toEqual(['a']);
  });
});
