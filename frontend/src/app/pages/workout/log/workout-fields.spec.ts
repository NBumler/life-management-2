import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { formatStopwatch, nextRestValue, visibleFields } from './workout-fields';

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
});
