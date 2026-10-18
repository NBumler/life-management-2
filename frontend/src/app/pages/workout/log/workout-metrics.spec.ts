import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import {
  detectPrs,
  effectiveDurationMinutes,
  epley1Rm,
  exerciseVolume,
  formatSetSummary,
  ghostForExercise,
  lastPerformance,
  muscleClass,
  progressionSuggestion,
  rpeFactor,
  sessionKcal,
  setLoadSeconds,
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
    it('applies the flat net MET (GENERAL_WEIGHTS 4 − 1, backlog/164 + 173) to a session without sets', () => {
      const s = session({ durationMinutes: 60, exercises: [] });
      expect(sessionKcal(s, 80)).toBeCloseTo((4 - 1) * 80 * 1);
    });

    it('applies net MET (HIIT_CIRCUIT 8 − 1)', () => {
      const s = session({ workoutType: WorkoutSession.WorkoutTypeEnum.HiitCircuit, durationMinutes: 30 });
      expect(sessionKcal(s, 70)).toBeCloseTo((8 - 1) * 70 * 0.5);
    });

    it('is 0 when the body weight is missing', () => {
      expect(sessionKcal(session({ durationMinutes: 60 }), null)).toBe(0);
    });

    it('is 0 when the effective duration is 0 (no sets, no times)', () => {
      expect(sessionKcal(session({ exercises: [] }), 80)).toBe(0);
    });
  });

  describe('set-based kcal (backlog/173)', () => {
    const Category = WorkoutExerciseEntry.ExerciseCategoryEnum;
    const Kind = WorkoutExerciseEntry.ExerciseKindEnum;

    function sets(count: number, overrides: Partial<WorkoutSetEntry> = {}): WorkoutSetEntry[] {
      return Array.from({ length: count }, (_, i) => set({ orderIndex: i, ...overrides }));
    }

    function oneExercise(
      durationMinutes: number | null,
      category: WorkoutExerciseEntry.ExerciseCategoryEnum,
      exerciseSets: WorkoutSetEntry[],
      kind: WorkoutExerciseEntry.ExerciseKindEnum = Kind.WeightedReps,
    ): WorkoutSession {
      return session({
        durationMinutes,
        exercises: [exercise({ exerciseCategory: category, exerciseKind: kind, sets: exerciseSets })],
      });
    }

    /** kcal → the gross MET the whole session averaged (net + resting 1). */
    function grossEquivalent(kcal: number, weightKg: number, minutes: number): number {
      return kcal / weightKg / (minutes / 60) + 1;
    }

    it('classifies muscle groups; hangboard is always small, cardio by kind', () => {
      expect(muscleClass(exercise({ exerciseCategory: Category.Legs }))).toBe('LARGE');
      expect(muscleClass(exercise({ exerciseCategory: Category.Chest }))).toBe('MEDIUM');
      expect(muscleClass(exercise({ exerciseCategory: Category.Biceps }))).toBe('SMALL');
      expect(muscleClass(exercise({ exerciseCategory: Category.Back, exerciseKind: Kind.HangboardPinch }))).toBe('SMALL');
      expect(muscleClass(exercise({ exerciseCategory: Category.FullBody, exerciseKind: Kind.CardioTimeDist }))).toBe('CARDIO');
    });

    it('derives time under load from hold time (× reps), reps × 3 s, or a default', () => {
      const e = exercise();
      expect(setLoadSeconds(e, set({ reps: 10 }))).toBe(30);
      expect(setLoadSeconds(e, set({ reps: null, holdTimeSeconds: 20 }))).toBe(20);
      expect(setLoadSeconds(e, set({ reps: 6, holdTimeSeconds: 7 }))).toBe(42);
      expect(setLoadSeconds(e, set({ reps: null }))).toBe(30);
      expect(setLoadSeconds(exercise({ exerciseKind: Kind.HangboardPinch }), set({ reps: null }))).toBe(10);
    });

    it('scales the in-set MET by RPE (6 → 0.9, 10 → 1.1), never for a warm-up set', () => {
      expect(rpeFactor(set({ rpe: null }))).toBe(1);
      expect(rpeFactor(set({ rpe: 6 }))).toBeCloseTo(0.9);
      expect(rpeFactor(set({ rpe: 10 }))).toBeCloseTo(1.1);
      expect(rpeFactor(set({ rpe: 10, setType: WorkoutSetEntry.SetTypeEnum.Warmup }))).toBe(1);
    });

    it('typical compound session lands in the Compendium 3.5–6 MET band (60 min, 18 leg sets × 10)', () => {
      // load 9 min × net 7 + rest 51 min × idle net 0.5 + 18 windows × 2.5 min × (3.0 − 1.5) = 156 net MET-min.
      const kcal = sessionKcal(oneExercise(60, Category.Legs, sets(18, { reps: 10 })), 70);
      expect(kcal).toBeCloseTo((156 * 70) / 60);
      const gross = grossEquivalent(kcal, 70, 60);
      expect(gross).toBeGreaterThanOrEqual(3.5);
      expect(gross).toBeLessThanOrEqual(6);
    });

    it('small-muscle isolation burns clearly less than the same compound volume', () => {
      // 9 × net 4 + 51 × 0.5 + 45 × (2.5 − 1.5) = 106.5 net MET-min.
      const arms = sessionKcal(oneExercise(60, Category.Biceps, sets(18, { reps: 10 })), 70);
      expect(arms).toBeCloseTo((106.5 * 70) / 60);
      expect(arms).toBeLessThan(sessionKcal(oneExercise(60, Category.Legs, sets(18, { reps: 10 })), 70));
    });

    it('a 45-minute hangboard session is far below the old flat 5.0 MET', () => {
      const hang = sets(10, { reps: null, weightKg: 0, holdTimeSeconds: 10 });
      const kcal = sessionKcal(oneExercise(45, Category.ForearmFingers, hang, Kind.HangboardPinch), 70);
      // 100 s × net 4 + 43.33 min × 0.5 + 25 min × 1.0.
      expect(kcal).toBeCloseTo(((100 / 60) * 4 + (45 - 100 / 60) * 0.5 + 25) * (70 / 60));
      expect(kcal).toBeLessThan(0.4 * (5 - 1) * 70 * 0.75);
    });

    it('a dense session burns more than a long, sparse one', () => {
      const dense = sessionKcal(oneExercise(45, Category.Legs, sets(25, { reps: 10 })), 70);
      const sparse = sessionKcal(oneExercise(90, Category.Legs, sets(12, { reps: 10 })), 70);
      expect(dense).toBeGreaterThan(sparse);
      // Sparse: 6 × 7 + 84 × 0.5 + 12 × 2.5 × 1.5 = 129 net MET-min (old flat model: 420 kcal).
      expect(sparse).toBeCloseTo((129 * 70) / 60);
    });

    it('a fallback-duration session keeps its full recovery windows (3 min per set)', () => {
      // 1 chest set × 8 reps, no times → 3 min: 0.4 × net 5 + 2.6 × 0.5 + 2.5 × 1.0 = 5.8 net MET-min.
      expect(sessionKcal(oneExercise(null, Category.Chest, sets(1)), 70)).toBeCloseTo((5.8 * 70) / 60);
    });

    it('RPE 10 working sets burn more than unrated ones', () => {
      const rated = sessionKcal(oneExercise(60, Category.Legs, sets(18, { reps: 10, rpe: 10 })), 70);
      const unrated = sessionKcal(oneExercise(60, Category.Legs, sets(18, { reps: 10 })), 70);
      expect(rated).toBeGreaterThan(unrated);
    });

    it('never charges more time under load than the session lasted', () => {
      const row = sets(1, { reps: null, holdTimeSeconds: 600 });
      // 1 min under load at cardio net 6, no rest left.
      expect(sessionKcal(oneExercise(1, Category.FullBody, row, Kind.CardioTimeDist), 70)).toBeCloseTo((6 * 70) / 60);
    });

    it('HIIT_CIRCUIT stays flat 8.0 even with sets', () => {
      const s = session({ workoutType: WorkoutSession.WorkoutTypeEnum.HiitCircuit, durationMinutes: 30 });
      expect(sessionKcal(s, 70)).toBeCloseTo((8 - 1) * 70 * 0.5);
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

    it('does not flag a metric the history has no comparable value for (first measurable is not a PR)', () => {
      // Prior entry exists but carries no weight/1RM/volume — a bodyweight set with weightKg 0.
      const prior = session({
        id: 'old',
        date: '2026-08-20',
        exercises: [exercise({ id: 'oe', sets: [set({ reps: 10, weightKg: 0 })] })],
      });
      const current = exercise({ id: 'ne', sets: [set({ reps: 8, weightKg: 60 })] });
      expect(detectPrs([prior], current)).toEqual({ new1Rm: false, newMaxWeight: false, newMaxVolume: false });
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

  describe('lastPerformance / formatSetSummary (backlog/131)', () => {
    it('returns every counted set of the most recent entry, warm-ups excluded', () => {
      const prior = session({
        id: 'o1',
        date: '2026-09-28',
        exercises: [
          exercise({
            sets: [
              set({ setType: WorkoutSetEntry.SetTypeEnum.Warmup, reps: 5, weightKg: 7.5, orderIndex: 0 }),
              set({ reps: 5, weightKg: 22.5, orderIndex: 1 }),
              set({ reps: 5, weightKg: 22.5, orderIndex: 2 }),
              set({ reps: 4, weightKg: 22.5, orderIndex: 3 }),
            ],
          }),
        ],
      });

      const last = lastPerformance([prior], 'cat-bench', 'Fekvenyomás', 's1');

      expect(last?.sessionDate).toBe('2026-09-28');
      expect(last?.sets.length).toBe(3);
      expect(formatSetSummary(last!.sets)).toBe('5 @ 22.5 kg · 5 @ 22.5 kg · 4 @ 22.5 kg');
    });

    it('collapses identical sets and shows hold time / assistance', () => {
      const same = { reps: 5, weightKg: 22.5, holdTimeSeconds: null };
      expect(formatSetSummary([same, same, same])).toBe('3 × 5 @ 22.5 kg');
      expect(formatSetSummary([{ reps: null, weightKg: 5, holdTimeSeconds: 10 }])).toBe('10 s @ 5 kg');
      expect(formatSetSummary([{ reps: 2, weightKg: -15, holdTimeSeconds: null }])).toBe('2 @ -15 kg');
      expect(formatSetSummary([{ reps: 8, weightKg: 0, holdTimeSeconds: null }])).toBe('8');
    });

    it('returns null with no history', () => {
      expect(lastPerformance([], 'cat-bench', 'Fekvenyomás')).toBeNull();
    });
  });

  describe('progressionSuggestion (backlog/131)', () => {
    const working = (reps: number | null, weightKg: number | null) => ({
      setType: WorkoutSetEntry.SetTypeEnum.Working,
      reps,
      weightKg,
      holdTimeSeconds: null,
    });

    it('suggests +2.5 kg when every working set reached the top of the range', () => {
      const last = { sessionDate: '2026-09-28', sets: [working(5, 22.5), working(5, 22.5), working(6, 22.5)] };
      expect(progressionSuggestion(last, 5)).toBe(25);
    });

    it('means 2.5 kg less assistance for a negative (assisted) weight, down to 0', () => {
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(3, -20)] }, 3)).toBe(-17.5);
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(3, -2.5)] }, 3)).toBe(0);
    });

    it('gives nothing when a working set fell short, had no weight, or there is no range', () => {
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(5, 22.5), working(4, 22.5)] }, 5)).toBeNull();
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(5, null)] }, 5)).toBeNull();
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(5, 22.5)] }, null)).toBeNull();
      expect(progressionSuggestion(null, 5)).toBeNull();
    });

    it('ignores non-WORKING sets (a dropset below the top does not block)', () => {
      const last = {
        sessionDate: 'd',
        sets: [working(5, 30), { setType: WorkoutSetEntry.SetTypeEnum.Dropset, reps: 3, weightKg: 20, holdTimeSeconds: null }],
      };
      expect(progressionSuggestion(last, 5)).toBe(32.5);
    });
  });
  describe('side / RPE awareness (backlog/134, backlog/135)', () => {
    const working = (reps: number, weightKg: number, extra: { side?: 'LEFT' | 'RIGHT' | null; rpe?: number | null } = {}) => ({
      setType: WorkoutSetEntry.SetTypeEnum.Working,
      reps,
      weightKg,
      holdTimeSeconds: null,
      side: extra.side ?? null,
      rpe: extra.rpe ?? null,
    });

    it('judges each hand on its own sets', () => {
      const last = { sessionDate: 'd', sets: [working(3, -20, { side: 'LEFT' }), working(2, -20, { side: 'RIGHT' })] };
      expect(progressionSuggestion(last, 3, 'LEFT')).toBe(-17.5);
      expect(progressionSuggestion(last, 3, 'RIGHT')).toBeNull();
      expect(progressionSuggestion(last, 3)).toBeNull();
    });

    it('holds the weight after a working set logged at RPE 10', () => {
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(5, 30, { rpe: 9 })] }, 5)).toBe(32.5);
      expect(progressionSuggestion({ sessionDate: 'd', sets: [working(5, 30), working(5, 30, { rpe: 10 })] }, 5)).toBeNull();
    });

    it('marks the hand in the summary', () => {
      expect(formatSetSummary([working(2, -15, { side: 'LEFT' }), working(2, -15, { side: 'RIGHT' })])).toBe('◀ 2 @ -15 kg · ▶ 2 @ -15 kg');
    });
  });
});
