import { TestBed } from '@angular/core/testing';

import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../api/model/workoutSetEntry';
import { ActiveWorkoutDraft, WorkoutDraftService } from './workout-draft.service';

function draft(overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft {
  return {
    sessionId: 's1',
    startedAtMs: 1_700_000_000_000,
    date: '2026-08-28',
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    title: null,
    location: null,
    notes: null,
    planId: null,
    roundsCount: null,
    currentRound: 1,
    exercises: [
      {
        id: 'e1',
        exerciseId: 'cat-bench',
        exerciseName: 'Fekvenyomás',
        exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum.Chest,
        exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps,
        supersetGroup: null,
        defaultRestTimeSeconds: 120,
        sets: [
          {
            id: 'set-1',
            setType: WorkoutSetEntry.SetTypeEnum.Working,
            reps: 8,
            weightKg: 80,
            holdTimeSeconds: null,
            edgeSizeMm: null,
            distanceMeters: null,
            restTimeSeconds: null,
            isCompleted: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('WorkoutDraftService', () => {
  let service: WorkoutDraftService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkoutDraftService);
    await service.clear();
  });

  afterEach(async () => {
    await service.clear();
  });

  it('write() then refresh() round-trips the draft and mirrors it into the signal', async () => {
    await service.write(draft({ title: 'Leg day' }));
    expect(service.draft()?.title).toBe('Leg day');
    expect(service.hasDraft()).toBeTrue();

    // Drop the in-memory copy, prove it comes back from persistence.
    service.draft.set(null);
    await service.refresh();

    expect(service.draft()?.title).toBe('Leg day');
    expect(service.draft()?.exercises[0].sets[0].weightKg).toBe(80);
  });

  it('clear() removes the draft everywhere', async () => {
    await service.write(draft());
    await service.clear();

    expect(service.draft()).toBeNull();
    expect(service.hasDraft()).toBeFalse();

    await service.refresh();
    expect(service.draft()).toBeNull();
  });

  it('refresh() with nothing stored leaves the signal null', async () => {
    await service.refresh();
    expect(service.draft()).toBeNull();
  });
});
