import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import {
  detectPrs,
  effectiveDurationMinutes,
  epley1Rm,
  exerciseVolume,
  ghostForExercise,
  sessionKcal,
} from './workout-metrics';

function set(overrides: Partial<WorkoutSetEntry> = {}): WorkoutSetEntry {
  return {
    id: `set-${Math.random()}`,
    exerciseEntryId: 'e1',
    setNumber: 1,
    setType: WorkoutSetEntry.SetTypeEnum.Working,
    reps: 8,
    weightKg: 80,
    holdTimeSeconds: null,
    edgeSizeMm: null,
    distanceMeters: null,
    restTimeSeconds: null,
    isCompleted: true,
    orderIndex: 0,
    deleted: false,
    ...overrides,
  };
}

function exercise(overrides: Partial<WorkoutExerciseEntry> = {}): WorkoutExerciseEntry {
  return {
    id: 'e1',
    sessionId: 's1',
    exerciseId: 'cat-bench',
    exerciseName: 'Fekvenyomás',
    exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum.Chest,
    exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps,
    orderIndex: 0,
    supersetGroup: null,
    sets: [set()],
    deleted: false,
    ...overrides,
  };
}

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    date: '2026-08-28',
    startTime: null,
    endTime: null,
    durationMinutes: null,
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    title: null,
    notes: null,
    location: null,
    planId: null,
    roundsCount: null,
    exercises: [exercise()],
    deleted: false,
    ...overrides,
  };
}

describe('workout-metrics', () => {
  describe('effectiveDurationMinutes', () => {
    it('prefers the manual durationMinutes override', () => {
      expect(effectiveDurationMinutes(session({ durationMinutes: 45, startTime: '10:00', endTime: '11:30' }))).toBe(45);
    });

    it('falls back to endTime − startTime', () => {
      expect(effectiveDurationMinutes(session({ startTime: '10:00', endTime: '11:15' }))).toBe(75);
    });

    it('falls back to live set count × 3 minutes when no duration or times', () => {
      const s = session({
        exercises: [exercise({ sets: [set(), set(), set({ deleted: true })] })],
      });
      expect(effectiveDurationMinutes(s)).toBe(2 * 3);
    });
  });

  describe('sessionKcal', () => {
    it('applies MET(GENERAL_WEIGHTS)=5 × weight × minutes/60', () => {
      const s = session({ durationMinutes: 60 });
      expect(sessionKcal(s, 80)).toBeCloseTo(5 * 80 * 1);
    });

    it('applies MET(HIIT_CIRCUIT)=8', () => {
      const s = session({ workoutType: WorkoutSession.WorkoutTypeEnum.HiitCircuit, durationMinutes: 30 });
      expect(sessionKcal(s, 70)).toBeCloseTo(8 * 70 * 0.5);
    });

    it('is 0 when the body weight is missing', () => {
      expect(sessionKcal(session({ durationMinutes: 60 }), null)).toBe(0);
    });

    it('is 0 when the effective duration is 0 (no sets, no times)', () => {
      expect(sessionKcal(session({ exercises: [] }), 80)).toBe(0);
    });
  });

  describe('epley1Rm', () => {
    it('computes w × (1 + r/30) inside the valid rep range', () => {
      expect(epley1Rm(100, 5)).toBeCloseTo(100 * (1 + 5 / 30));
    });

    it('returns null above 12 reps', () => {
      expect(epley1Rm(100, 13)).toBeNull();
    });

    it('returns null for 0 reps or missing weight', () => {
      expect(epley1Rm(100, 0)).toBeNull();
      expect(epley1Rm(null, 5)).toBeNull();
    });
  });

  describe('exerciseVolume', () => {
    it('sums reps × weightKg over WORKING/DROPSET/FAILURE sets only', () => {
      const e = exercise({
        sets: [
          set({ setType: WorkoutSetEntry.SetTypeEnum.Warmup, reps: 10, weightKg: 40 }),
          set({ setType: WorkoutSetEntry.SetTypeEnum.Working, reps: 8, weightKg: 80 }),
          set({ setType: WorkoutSetEntry.SetTypeEnum.Dropset, reps: 6, weightKg: 60 }),
          set({ setType: WorkoutSetEntry.SetTypeEnum.RestPause, reps: 3, weightKg: 80 }),
          set({ setType: WorkoutSetEntry.SetTypeEnum.Failure, reps: 2, weightKg: 85 }),
        ],
      });
      expect(exerciseVolume(e)).toBe(8 * 80 + 6 * 60 + 2 * 85);
    });
  });

  describe('detectPrs', () => {
    it('flags nothing when there is no prior history', () => {
      expect(detectPrs([], exercise())).toEqual({ new1Rm: false, newMaxWeight: false, newMaxVolume: false });
    });

    it('flags a new max weight and 1RM against a lighter prior session', () => {
      const prior = session({
        id: 'old',
        date: '2026-08-20',
        exercises: [exercise({ id: 'oe', sets: [set({ reps: 8, weightKg: 70 })] })],
      });
      const current = exercise({ id: 'ne', sets: [set({ reps: 8, weightKg: 85 })] });
      expect(detectPrs([prior], current)).toEqual({ new1Rm: true, newMaxWeight: true, newMaxVolume: true });
    });

    it('does not flag when the prior session was heavier', () => {
      const prior = session({
        id: 'old',
        date: '2026-08-20',
        exercises: [exercise({ id: 'oe', sets: [set({ reps: 8, weightKg: 100 })] })],
      });
      const current = exercise({ id: 'ne', sets: [set({ reps: 8, weightKg: 85 })] });
      expect(detectPrs([prior], current).newMaxWeight).toBe(false);
    });
  });

  describe('ghostForExercise', () => {
    it('returns null with no history', () => {
      expect(ghostForExercise([], 'cat-bench', 'Fekvenyomás')).toBeNull();
    });

    it('returns the most recent prior session and its heaviest counted set', () => {
      const older = session({ id: 'o1', date: '2026-08-10', exercises: [exercise({ sets: [set({ reps: 5, weightKg: 60 })] })] });
      const newer = session({
        id: 'o2',
        date: '2026-08-24',
        exercises: [exercise({ sets: [set({ reps: 8, weightKg: 80 }), set({ reps: 6, weightKg: 90 })] })],
      });

      const ghost = ghostForExercise([older, newer], 'cat-bench', 'Fekvenyomás', 's1');

      expect(ghost?.sessionDate).toBe('2026-08-24');
      expect(ghost?.topSet).toEqual({ weightKg: 90, reps: 6, holdTimeSeconds: null });
    });

    it('matches by normalized name for ad-hoc entries (no exerciseId)', () => {
      const prior = session({
        id: 'o1',
        date: '2026-08-20',
        exercises: [exercise({ exerciseId: null, exerciseName: 'fekvenyomás', sets: [set({ reps: 5, weightKg: 70 })] })],
      });
      expect(ghostForExercise([prior], null, 'Fekvenyomás', 's1')?.topSet?.weightKg).toBe(70);
    });
  });
});
