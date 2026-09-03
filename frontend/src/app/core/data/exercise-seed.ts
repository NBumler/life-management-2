import { Exercise } from '../../api/model/exercise';
import { normalizeName } from '../../shared/name-normalization';
import { uuidV5 } from '../sync/uuid';
import exerciseSeedJson from '../../../assets/data/exercise-seed.json';

/** documentation/Subfeatures/Gyakorlat.md "Seed" — one built-in exercise, id-less (derived at seed time). */
export interface ExerciseSeed {
  name: string;
  category: Exercise.CategoryEnum;
  kind: Exercise.KindEnum;
  defaultRestTimeSeconds: number | null;
  isFavorite: boolean;
  equipment: string | null;
}

export const EXERCISE_SEED: readonly ExerciseSeed[] = exerciseSeedJson as ExerciseSeed[];

/**
 * documentation/Architektúra/Backend-offline first.md §15: the seed-latch identity. Native records
 * it in the `seed_state` table, web in a per-user `localStorage` key — both skip the seed once the
 * stored `seed_version` is `>=` this. Bump `EXERCISE_SEED_VERSION` when `exercise-seed.json` gains
 * rows that should also land on installs that already ran an earlier seed.
 */
export const EXERCISE_SEED_KEY = 'exercise';
export const EXERCISE_SEED_VERSION = 1;

/**
 * documentation/Architektúra/Backend-offline first.md §9: deterministic v5 id so two offline devices
 * of the same user converge on one row instead of creating duplicates. The `userId` is part of the
 * name because the server PK is global — two users seeding "Fekvenyomás" must still get distinct ids.
 */
export function exerciseSeedId(userId: string, name: string): Promise<string> {
  return uuidV5(`Exercise:${userId}:${normalizeName(name)}`);
}

/** Materializes `EXERCISE_SEED` into full `Exercise` DTOs for the given user. */
export async function buildSeedExercises(userId: string): Promise<Exercise[]> {
  const exercises: Exercise[] = [];
  for (const seed of EXERCISE_SEED) {
    exercises.push({
      id: await exerciseSeedId(userId, seed.name),
      name: seed.name,
      category: seed.category,
      kind: seed.kind,
      defaultRestTimeSeconds: seed.defaultRestTimeSeconds,
      isFavorite: seed.isFavorite,
      equipment: seed.equipment,
      deleted: false,
    });
  }
  return exercises;
}
