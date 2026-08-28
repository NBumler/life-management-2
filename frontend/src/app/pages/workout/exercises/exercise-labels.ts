import { Exercise } from '../../../api/model/exercise';

/** i18n key per ExerciseCategory — used by the catalog list chips, the picker, and statistics. */
export const EXERCISE_CATEGORY_LABEL_KEYS: Record<Exercise.CategoryEnum, string> = {
  [Exercise.CategoryEnum.Chest]: 'WORKOUT.EXERCISES.CATEGORY.CHEST',
  [Exercise.CategoryEnum.Back]: 'WORKOUT.EXERCISES.CATEGORY.BACK',
  [Exercise.CategoryEnum.Legs]: 'WORKOUT.EXERCISES.CATEGORY.LEGS',
  [Exercise.CategoryEnum.Shoulders]: 'WORKOUT.EXERCISES.CATEGORY.SHOULDERS',
  [Exercise.CategoryEnum.Arms]: 'WORKOUT.EXERCISES.CATEGORY.ARMS',
  [Exercise.CategoryEnum.Core]: 'WORKOUT.EXERCISES.CATEGORY.CORE',
  [Exercise.CategoryEnum.ForearmFingers]: 'WORKOUT.EXERCISES.CATEGORY.FOREARM_FINGERS',
  [Exercise.CategoryEnum.FullBody]: 'WORKOUT.EXERCISES.CATEGORY.FULL_BODY',
};

/** i18n key per ExerciseKind. */
export const EXERCISE_KIND_LABEL_KEYS: Record<Exercise.KindEnum, string> = {
  [Exercise.KindEnum.WeightedReps]: 'WORKOUT.EXERCISES.KIND.WEIGHTED_REPS',
  [Exercise.KindEnum.BodyweightReps]: 'WORKOUT.EXERCISES.KIND.BODYWEIGHT_REPS',
  [Exercise.KindEnum.IsometricTime]: 'WORKOUT.EXERCISES.KIND.ISOMETRIC_TIME',
  [Exercise.KindEnum.HangboardPinch]: 'WORKOUT.EXERCISES.KIND.HANGBOARD_PINCH',
  [Exercise.KindEnum.CardioTimeDist]: 'WORKOUT.EXERCISES.KIND.CARDIO_TIME_DIST',
};

/**
 * documentation/Subfeatures/Gyakorlat.md "kind választás után rövid hint, mely szett-mezők jelennek
 * meg az Edzésnaplóban" — i18n key describing the set-entry fields each kind unlocks.
 */
export const EXERCISE_KIND_FIELD_HINT_KEYS: Record<Exercise.KindEnum, string> = {
  [Exercise.KindEnum.WeightedReps]: 'WORKOUT.EXERCISES.KIND_HINT.WEIGHTED_REPS',
  [Exercise.KindEnum.BodyweightReps]: 'WORKOUT.EXERCISES.KIND_HINT.BODYWEIGHT_REPS',
  [Exercise.KindEnum.IsometricTime]: 'WORKOUT.EXERCISES.KIND_HINT.ISOMETRIC_TIME',
  [Exercise.KindEnum.HangboardPinch]: 'WORKOUT.EXERCISES.KIND_HINT.HANGBOARD_PINCH',
  [Exercise.KindEnum.CardioTimeDist]: 'WORKOUT.EXERCISES.KIND_HINT.CARDIO_TIME_DIST',
};

export const EXERCISE_CATEGORIES: readonly Exercise.CategoryEnum[] = Object.values(Exercise.CategoryEnum);
export const EXERCISE_KINDS: readonly Exercise.KindEnum[] = Object.values(Exercise.KindEnum);
