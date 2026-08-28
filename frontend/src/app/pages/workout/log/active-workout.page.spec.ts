import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutDraftService } from '../../../core/data/workout-draft.service';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { ExercisePickResult } from '../../../shared/exercise-picker/exercise-picker.component';
import { ActiveWorkoutPage } from './active-workout.page';

function pick(overrides: Partial<ExercisePickResult> = {}): ExercisePickResult {
  return {
    exerciseId: 'cat-bench',
    exerciseName: 'Fekvenyomás',
    exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum.Chest,
    exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps,
    ...overrides,
  };
}

function priorSession(): WorkoutSession {
  return {
    id: 'prev',
    date: '2026-08-20',
    startTime: null,
    endTime: null,
    durationMinutes: 60,
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    title: null,
    notes: null,
    location: null,
    planId: null,
    roundsCount: null,
    deleted: false,
    exercises: [
      {
        id: 'pe1',
        sessionId: 'prev',
        exerciseId: 'cat-bench',
        exerciseName: 'Fekvenyomás',
        exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum.Chest,
        exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps,
        orderIndex: 0,
        supersetGroup: null,
        deleted: false,
        sets: [
          {
            id: 'ps1',
            exerciseEntryId: 'pe1',
            setNumber: 1,
            setType: WorkoutSetEntry.SetTypeEnum.Working,
            reps: 8,
            weightKg: 100,
            holdTimeSeconds: null,
            edgeSizeMm: null,
            distanceMeters: null,
            restTimeSeconds: null,
            isCompleted: true,
            orderIndex: 0,
            deleted: false,
          },
        ],
      },
    ],
  };
}

describe('ActiveWorkoutPage', () => {
  let fixture: ComponentFixture<ActiveWorkoutPage>;
  let component: ActiveWorkoutPage;
  let repository: jasmine.SpyObj<Pick<WorkoutSessionRepository, 'load' | 'byId' | 'save'>> & {
    items: ReturnType<typeof signal<WorkoutSession[]>>;
  };
  let exerciseRepository: { load: jasmine.Spy; items: ReturnType<typeof signal<Exercise[]>> };
  let router: jasmine.SpyObj<Pick<Router, 'navigateByUrl'>>;
  let draftService: WorkoutDraftService;

  async function setup(queryParams: Record<string, string> = {}): Promise<void> {
    repository = jasmine.createSpyObj('WorkoutSessionRepository', ['load', 'byId', 'save']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<WorkoutSession[]>([]);
    repository.save.and.resolveTo({ exercises: [] } as unknown as WorkoutSession);

    exerciseRepository = { load: jasmine.createSpy('load').and.resolveTo(), items: signal<Exercise[]>([]) };
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WorkoutSessionRepository, useValue: repository },
        { provide: ExerciseRepository, useValue: exerciseRepository },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal(null) } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        {
          provide: AlertController,
          useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) },
        },
      ],
    }).compileComponents();

    draftService = TestBed.inject(WorkoutDraftService);
    await draftService.clear();

    fixture = TestBed.createComponent(ActiveWorkoutPage);
    component = fixture.componentInstance;
  }

  afterEach(async () => {
    fixture?.destroy();
    if (draftService) {
      await draftService.clear();
    }
  });

  it('starts a fresh live draft (session id + stopwatch base) when nothing is parked', async () => {
    await setup();
    await component.ngOnInit();

    const draft = draftService.draft();
    expect(draft).not.toBeNull();
    expect(draft?.sessionId).toBeTruthy();
    expect(draft?.startedAtMs).toBeGreaterThan(0);
    expect(draft?.exercises).toEqual([]);
  });

  it('picks up ?type= for the initial workout type', async () => {
    await setup({ type: 'HIIT_CIRCUIT' });
    await component.ngOnInit();

    expect(component.workoutType()).toBe(WorkoutSession.WorkoutTypeEnum.HiitCircuit);
    expect(component.isHiit()).toBeTrue();
  });

  it('onPicked() appends an exercise row and persists the draft', async () => {
    await setup();
    await component.ngOnInit();

    component.onPicked([pick()]);
    await Promise.resolve();

    expect(component.exercises().length).toBe(1);
    expect(component.exercises()[0].exerciseName).toBe('Fekvenyomás');
    expect(draftService.draft()?.exercises[0].sets.length).toBe(1);
  });

  it('ticking a set starts the rest timer from the catalog default', async () => {
    await setup();
    exerciseRepository.items.set([
      {
        id: 'cat-bench',
        name: 'Fekvenyomás',
        category: Exercise.CategoryEnum.Chest,
        kind: Exercise.KindEnum.WeightedReps,
        defaultRestTimeSeconds: 120,
        isFavorite: false,
        equipment: null,
        deleted: false,
      },
    ]);
    await component.ngOnInit();

    component.onPicked([pick()]);
    const row = component.exercises()[0];
    component.toggleComplete(row, row.sets()[0]);

    expect(component.restRemaining()).toBe(120);
  });

  it('bump() nudges the weight and persists', async () => {
    await setup();
    await component.ngOnInit();
    component.onPicked([pick()]);
    const set = component.exercises()[0].sets()[0];

    component.bump(set.weightKg, 2.5);
    component.bump(set.weightKg, 2.5);
    await Promise.resolve();

    expect(set.weightKg()).toBe(5);
    expect(draftService.draft()?.exercises[0].sets[0].weightKg).toBe(5);
  });

  it('finish() enqueues a session under the draft id, clears the draft and navigates back', async () => {
    await setup();
    await component.ngOnInit();
    const draftId = draftService.draft()?.sessionId;
    component.onPicked([pick()]);

    await component.finish();

    expect(repository.save).toHaveBeenCalled();
    expect(repository.save.calls.mostRecent().args[0].id).toBe(draftId!);
    expect(draftService.draft()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/workout/log');
  });

  it('?copyFrom= clones structure + weights with sets un-ticked', async () => {
    await setup({ copyFrom: 'prev' });
    repository.byId.and.returnValue(priorSession());
    await component.ngOnInit();

    expect(component.exercises().length).toBe(1);
    const set = component.exercises()[0].sets()[0];
    expect(set.weightKg()).toBe(100);
    expect(set.isCompleted()).toBeFalse();
  });

  it('a rest-timer tick decrements restRemaining and clears it at zero', async () => {
    await setup();
    await component.ngOnInit();
    component.onPicked([pick({ exerciseId: null })]);
    const row = component.exercises()[0];
    component.toggleComplete(row, row.sets()[0]);
    expect(component.restRemaining()).toBe(90);

    // Drive the private interval body directly — the pure countdown rule has its own unit test.
    const runTick = (component as unknown as { tick: () => void }).tick.bind(component);
    runTick();
    expect(component.restRemaining()).toBe(89);

    component.restRemaining.set(1);
    runTick();
    expect(component.restRemaining()).toBeNull();
  });

  it('resumes a parked draft instead of starting a new one', async () => {
    await setup();
    await draftService.write({
      sessionId: 'parked',
      startedAtMs: 123,
      date: '2026-08-27',
      workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
      title: 'Parked',
      location: null,
      notes: null,
      planId: null,
      roundsCount: null,
      currentRound: 2,
      exercises: [],
    });

    await component.ngOnInit();

    expect(component.title()).toBe('Parked');
    expect(draftService.draft()?.sessionId).toBe('parked');
  });
});
