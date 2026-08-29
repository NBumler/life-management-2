import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutPlanExercise } from '../../../api/model/workoutPlanExercise';
import { WorkoutPlanSet } from '../../../api/model/workoutPlanSet';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import {
  PLAN_TO_ENTRY_CATEGORY,
  PLAN_TO_ENTRY_KIND,
  PLAN_TO_ENTRY_SET_TYPE,
  formatStopwatch,
  moveById,
  nextRestValue,
  sanitizeSessionTimes,
  visibleFields,
} from './workout-fields';

describe('workout-fields', () => {
  describe('visibleFields', () => {
    it('WEIGHTED_REPS shows reps + weight only', () => {
      expect(visibleFields(WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps)).toEqual({
        reps: true,
        weightKg: true,
        holdTimeSeconds: false,
        edgeSizeMm: false,
        distanceMeters: false,
      });
    });

    it('HANGBOARD_PINCH shows edge + hold + optional weight, no reps', () => {
      const fields = visibleFields(WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch);
      expect(fields.edgeSizeMm).toBeTrue();
      expect(fields.holdTimeSeconds).toBeTrue();
      expect(fields.weightKg).toBeTrue();
      expect(fields.reps).toBeFalse();
    });

    it('CARDIO_TIME_DIST shows hold + distance, no weight', () => {
      const fields = visibleFields(WorkoutExerciseEntry.ExerciseKindEnum.CardioTimeDist);
      expect(fields.holdTimeSeconds).toBeTrue();
      expect(fields.distanceMeters).toBeTrue();
      expect(fields.weightKg).toBeFalse();
    });
  });

  describe('nextRestValue', () => {
    it('decrements a running timer', () => {
      expect(nextRestValue(90)).toEqual({ value: 89, expired: false });
    });

    it('expires when it reaches zero', () => {
      expect(nextRestValue(1)).toEqual({ value: null, expired: true });
      expect(nextRestValue(0)).toEqual({ value: null, expired: true });
    });

    it('is a no-op when no timer is running', () => {
      expect(nextRestValue(null)).toEqual({ value: null, expired: false });
    });
  });

  describe('formatStopwatch', () => {
    it('renders MM:SS below an hour', () => {
      expect(formatStopwatch(0)).toBe('00:00');
      expect(formatStopwatch(65_000)).toBe('01:05');
    });

    it('renders H:MM:SS past an hour', () => {
      expect(formatStopwatch(3_661_000)).toBe('1:01:01');
    });

    it('clamps negatives to zero', () => {
      expect(formatStopwatch(-5_000)).toBe('00:00');
    });
  });

  describe('sanitizeSessionTimes', () => {
    it('keeps both times when endTime is strictly after startTime', () => {
      expect(sanitizeSessionTimes('10:00', '11:30')).toEqual({ startTime: '10:00', endTime: '11:30' });
    });

    it('drops endTime when it is not after startTime (session crossing midnight)', () => {
      expect(sanitizeSessionTimes('23:30', '00:15')).toEqual({ startTime: '23:30', endTime: null });
      expect(sanitizeSessionTimes('10:00', '10:00')).toEqual({ startTime: '10:00', endTime: null });
    });

    it('passes nulls through untouched', () => {
      expect(sanitizeSessionTimes(null, '09:00')).toEqual({ startTime: null, endTime: '09:00' });
      expect(sanitizeSessionTimes('09:00', null)).toEqual({ startTime: '09:00', endTime: null });
    });
  });

  describe('moveById', () => {
    const rows = () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    it('moves an item up and down by one position', () => {
      expect(moveById(rows(), 'b', -1).map((r) => r.id)).toEqual(['b', 'a', 'c']);
      expect(moveById(rows(), 'b', 1).map((r) => r.id)).toEqual(['a', 'c', 'b']);
    });

    it('is a no-op (same reference) at the ends or for an unknown id', () => {
      const start = rows();
      expect(moveById(start, 'a', -1)).toBe(start);
      expect(moveById(start, 'c', 1)).toBe(start);
      expect(moveById(start, 'zzz', 1)).toBe(start);
    });
  });

  describe('plan → entry enum maps', () => {
    it('map every plan enum member to the identically-valued entry/session member', () => {
      for (const value of Object.values(WorkoutPlanExercise.ExerciseCategoryEnum)) {
        expect(PLAN_TO_ENTRY_CATEGORY[value]).toBe(value as unknown as WorkoutExerciseEntry.ExerciseCategoryEnum);
      }
      for (const value of Object.values(WorkoutPlanExercise.ExerciseKindEnum)) {
        expect(PLAN_TO_ENTRY_KIND[value]).toBe(value as unknown as WorkoutExerciseEntry.ExerciseKindEnum);
      }
      for (const value of Object.values(WorkoutPlanSet.SetTypeEnum)) {
        expect(PLAN_TO_ENTRY_SET_TYPE[value]).toBe(value as unknown as WorkoutSetEntry.SetTypeEnum);
      }
    });
  });
});
