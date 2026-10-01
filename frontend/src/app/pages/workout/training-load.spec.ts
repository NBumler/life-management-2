import { ClimbingSession } from '../../api/model/climbingSession';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../api/model/workoutSession';
import { dailyTrainingLoad, weekLoadSummary } from './training-load';

const Category = WorkoutExerciseEntry.ExerciseCategoryEnum;
const Kind = WorkoutExerciseEntry.ExerciseKindEnum;

function climb(date: string, deleted = false): ClimbingSession {
  return { id: `c-${date}`, date, deleted, attempts: [] } as unknown as ClimbingSession;
}

function workout(date: string, exercises: Partial<WorkoutExerciseEntry>[] = [], deleted = false): WorkoutSession {
  return {
    id: `w-${date}`,
    date,
    deleted,
    exercises: exercises.map((exercise) => ({ deleted: false, exerciseCategory: Category.Back, exerciseKind: Kind.WeightedReps, ...exercise })),
  } as unknown as WorkoutSession;
}

describe('training-load (backlog/137)', () => {
  const dates = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];

  const days = dailyTrainingLoad(
    dates,
    [climb('2026-09-28'), climb('2026-09-28'), climb('2026-10-01', true)],
    [
      workout('2026-09-29', [{ exerciseCategory: Category.ForearmFingers }]),
      workout('2026-09-30', [{ exerciseKind: Kind.HangboardPinch, deleted: true }, {}]),
    ],
  );

  it('counts live climbing sessions and marks climbing days as finger load', () => {
    expect(days[0]).toEqual({ date: '2026-09-28', climbing: 2, workouts: 0, fingerLoad: true, rest: false });
  });

  it('a FOREARM_FINGERS / HANGBOARD_PINCH exercise makes a workout day a finger-load day (deleted rows ignored)', () => {
    expect(days[1].fingerLoad).toBeTrue();
    expect(days[2]).toEqual({ date: '2026-09-30', climbing: 0, workouts: 1, fingerLoad: false, rest: false });
  });

  it('a day with only a deleted session is a rest day', () => {
    expect(days[3].rest).toBeTrue();
  });

  it('the summary counts rest days only up to today', () => {
    expect(weekLoadSummary(days, '2026-10-01')).toEqual({ climbingDays: 1, workoutDays: 2, fingerLoadDays: 2, restDays: 1 });
  });
});
