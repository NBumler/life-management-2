import { Exercise } from '../../api/model/exercise';
import { StretchExercise } from '../../api/model/stretchExercise';
import { matchesSearch } from '../text-search';
import { ExerciseCategory } from './exercise-labels';

/** backlog/167 — the two exercise types of the catalog (strength = the original `Exercise`). */
export type ExerciseType = 'STRENGTH' | 'STRETCH';

export const EXERCISE_TYPES: readonly ExerciseType[] = ['STRENGTH', 'STRETCH'];

export const EXERCISE_TYPE_LABEL_KEYS: Record<ExerciseType, string> = {
  STRENGTH: 'WORKOUT.EXERCISES.TYPE_STRENGTH',
  STRETCH: 'WORKOUT.EXERCISES.TYPE_STRETCH',
};

/** One row of the merged catalog list — a discriminated union over the two entities. */
export type CatalogEntry = { type: 'STRENGTH'; item: Exercise } | { type: 'STRETCH'; item: StretchExercise };

export interface CatalogFilter {
  /** Empty = every type. */
  types: ReadonlySet<ExerciseType>;
  /** Empty = every category. */
  categories: ReadonlySet<ExerciseCategory>;
  favoritesOnly: boolean;
  query: string;
}

/**
 * documentation/Subfeatures/Gyakorlat.md "Katalógus lista" (backlog/167): multi-select chips — OR
 * within a chip group, AND across the groups (type, category, Kedvencek, search). "Hát + Nyújtás" =
 * back stretches; "Hát + Mell" = back or chest of either type; nothing selected = everything.
 */
export function matchesCatalogFilter(entry: CatalogEntry, filter: CatalogFilter): boolean {
  if (filter.types.size > 0 && !filter.types.has(entry.type)) {
    return false;
  }
  if (filter.categories.size > 0 && !filter.categories.has(entry.item.category)) {
    return false;
  }
  if (filter.favoritesOnly && !entry.item.isFavorite) {
    return false;
  }
  return (
    matchesSearch(filter.query, entry.item.name) ||
    matchesSearch(filter.query, entry.item.equipment ?? '') ||
    matchesSearch(filter.query, entry.item.description ?? '')
  );
}

export function filterCatalog(entries: readonly CatalogEntry[], filter: CatalogFilter): CatalogEntry[] {
  return entries.filter((entry) => matchesCatalogFilter(entry, filter));
}

/** Adds `value` to the set if absent, removes it if present — the chip toggle. Returns a new set. */
export function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
