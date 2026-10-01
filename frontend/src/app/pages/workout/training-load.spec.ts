import { CalendarEvent } from '../../api/model/calendarEvent';
import { ClimbingSession } from '../../api/model/climbingSession';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../api/model/workoutSession';
import { dailyTrainingLoad, plannedClimbDates, weekLoadSummary } from './training-load';

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
    expect(days[0]).toEqual({ date: '2026-09-28', climbing: 2, workouts: 0, fingerLoad: true, rest: false, plannedClimb: false, missedClimb: false });
  });

  it('a FOREARM_FINGERS / HANGBOARD_PINCH exercise makes a workout day a finger-load day (deleted rows ignored)', () => {
    expect(days[1].fingerLoad).toBeTrue();
    expect(days[2]).toEqual({ date: '2026-09-30', climbing: 0, workouts: 1, fingerLoad: false, rest: false, plannedClimb: false, missedClimb: false });
  });

  it('a day with only a deleted session is a rest day', () => {
    expect(days[3].rest).toBeTrue();
  });

  it('the summary counts rest days only up to today', () => {
    expect(weekLoadSummary(days, '2026-10-01')).toEqual({ climbingDays: 1, plannedClimbDays: 0, workoutDays: 2, fingerLoadDays: 2, restDays: 1 });
  });

  describe('planned climbs (backlog/143)', () => {
    function event(overrides: Partial<CalendarEvent>): CalendarEvent {
      return { id: 'e', title: 'Mászás', allDay: true, date: '2026-09-29', interval: 1, deleted: false, activityType: 'CLIMBING', ...overrides } as CalendarEvent;
    }

    it('plannedClimbDates() projects live CLIMBING events only (recurring included)', () => {
      const dates = plannedClimbDates(
        [
          event({ id: 'one', date: '2026-10-02' }),
          event({ id: 'weekly', date: '2026-09-29', frequency: 'WEEKLY' }),
          event({ id: 'plain', date: '2026-10-03', activityType: null }),
          event({ id: 'gone', date: '2026-10-04', deleted: true }),
        ],
        '2026-10-01',
      );
      expect(['2026-09-29', '2026-10-02', '2026-10-06'].every((date) => dates.has(date))).toBeTrue();
      expect(dates.has('2026-10-03') || dates.has('2026-10-04')).toBeFalse();
    });

    it('today / future planned days are plannedClimb (not rest); a past unlogged one is missed; a logged day is neither', () => {
      const planned = { dates: new Set(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']), today: '2026-10-01' };
      const result = dailyTrainingLoad(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'], [climb('2026-09-30')], [], planned);
      expect(result.map((day) => [day.plannedClimb, day.missedClimb, day.rest])).toEqual([
        [false, true, true],
        [false, false, false],
        [true, false, false],
        [true, false, false],
      ]);
      expect(weekLoadSummary(result, '2026-10-01')).toEqual(
        jasmine.objectContaining({ climbingDays: 1, plannedClimbDays: 2, restDays: 1 }),
      );
    });
  });
});
