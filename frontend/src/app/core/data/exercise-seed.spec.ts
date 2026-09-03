import { Exercise } from '../../api/model/exercise';
import { seedRowsToInsert } from './exercise-seed';

function seed(id: string): Exercise {
  return {
    id,
    name: id,
    category: Exercise.CategoryEnum.FullBody,
    kind: Exercise.KindEnum.WeightedReps,
    defaultRestTimeSeconds: null,
    isFavorite: false,
    equipment: null,
    deleted: false,
  };
}

describe('seedRowsToInsert (F-2)', () => {
  const seeds = [seed('a'), seed('b'), seed('c')];

  it('first run (empty catalog): inserts every seed row', () => {
    expect(seedRowsToInsert(new Set<string>(), seeds).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('install populated from another device: inserts nothing (all ids already present)', () => {
    expect(seedRowsToInsert(new Set(['a', 'b', 'c']), seeds)).toEqual([]);
  });

  it('version bump with a new seed row: inserts only the genuinely new id', () => {
    // "a" + "b" already seeded from an earlier version; "c" is new in exercise-seed.json.
    expect(seedRowsToInsert(new Set(['a', 'b']), seeds).map((s) => s.id)).toEqual(['c']);
  });

  it('a seed row the user deleted is NOT resurrected (its id is present as a tombstone)', () => {
    // "b" was deleted → still in the catalog as a tombstone → its id is in existingIds.
    expect(seedRowsToInsert(new Set(['a', 'b', 'c']), seeds)).toEqual([]);
    expect(seedRowsToInsert(new Set(['a', 'b']), seeds).map((s) => s.id)).toEqual(['c']);
  });

  it('crash mid-seed: the next run inserts only the ids not yet written', () => {
    expect(seedRowsToInsert(new Set(['a']), seeds).map((s) => s.id)).toEqual(['b', 'c']);
  });
});
