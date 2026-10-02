import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, NavController, PopoverController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutDraftService } from '../../../core/data/workout-draft.service';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
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
  let navController: jasmine.SpyObj<Pick<NavController, 'navigateBack'>>;
  let draftService: WorkoutDraftService;
  let popoverCreate: jasmine.Spy;

  async function setup(queryParams: Record<string, string> = {}, plan?: WorkoutPlan): Promise<void> {
    repository = jasmine.createSpyObj('WorkoutSessionRepository', ['load', 'byId', 'save']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<WorkoutSession[]>([]);
    repository.save.and.resolveTo({ exercises: [] } as unknown as WorkoutSession);

    exerciseRepository = { load: jasmine.createSpy('load').and.resolveTo(), items: signal<Exercise[]>([]) };
    navController = jasmine.createSpyObj('NavController', ['navigateBack']);
    navController.navigateBack.and.resolveTo(true);
    popoverCreate = jasmine.createSpy('create').and.resolveTo({ present: () => Promise.resolve() });

    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WorkoutSessionRepository, useValue: repository },
        { provide: ExerciseRepository, useValue: exerciseRepository },
        { provide: WorkoutPlanRepository, useValue: { load: () => Promise.resolve(), byId: () => plan, items: signal([]) } },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal(null) } },
        { provide: NavController, useValue: navController },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        {
          provide: AlertController,
          useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) },
        },
      ],
    })
      .overrideComponent(ActiveWorkoutPage, { set: { providers: [{ provide: PopoverController, useValue: { create: popoverCreate } }] } })
      .compileComponents();

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

  it('the +2.5 kg / +1 buttons update the rendered inputs of the set row (backlog/126)', async () => {
    await setup();
    await component.ngOnInit();
    component.onPicked([pick()]);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    (host.querySelector('.set-bumps .bump-weight-small') as HTMLElement).click();
    (host.querySelector('.set-bumps .bump-reps') as HTMLElement).click();
    fixture.detectChanges();

    const inputs = Array.from(host.querySelectorAll('.set-row ion-input')) as unknown as { value: unknown }[];
    const values = inputs.map((input) => Number(input.value));
    const set = component.exercises()[0].sets()[0];
    expect(values).toContain(set.weightKg() as number);
    expect(values).toContain(set.reps() as number);
    expect(set.weightKg()).toBe(2.5);
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
    expect(navController.navigateBack).toHaveBeenCalledWith('/tabs/workout/log');
  });

  it('a rest-timer tick decrements restRemaining and clears it at zero', async () => {
    await setup();
    // backlog/147: the expiry alarm would open a real WebAudio context (an audio-device init that can
    // stall the test browser's main thread) — the beep itself is not under test here.
    spyOn(component as unknown as { beep: () => void }, 'beep');
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

  it('starting from a plan prefills a "8–12" target at its rounded-up midpoint and keeps the range as a hint (backlog/125)', async () => {
    const plan = {
      id: 'plan1',
      name: 'Felsőtest',
      active: true,
      deleted: false,
      exercises: [
        {
          id: 'pe1',
          planId: 'plan1',
          exerciseId: 'cat-bench',
          exerciseName: 'Fekvenyomás',
          exerciseCategory: 'CHEST',
          exerciseKind: 'WEIGHTED_REPS',
          orderIndex: 0,
          deleted: false,
          targetSets: [
            { id: 't1', planExerciseId: 'pe1', setType: 'WORKING', reps: 8, repsMax: 11, orderIndex: 0, deleted: false },
            { id: 't2', planExerciseId: 'pe1', setType: 'WORKING', reps: 6, repsMax: null, orderIndex: 1, deleted: false },
          ],
        },
      ],
    } as unknown as WorkoutPlan;
    await setup({ planId: 'plan1' }, plan);
    await component.ngOnInit();

    const sets = component.exercises()[0].sets();
    expect(sets[0].reps()).toBe(10);
    expect(sets[0].repsTarget).toBe('8–11');
    expect(sets[1].reps()).toBe(6);
    expect(sets[1].repsTarget).toBeNull();
    expect(draftService.draft()?.exercises[0].sets[0].repsTarget).toBe('8–11');
  });

  it('shows last time and a +2.5 kg suggestion when the plan range top was reached (backlog/131)', async () => {
    const plan = {
      id: 'plan-1',
      name: 'A nap',
      active: true,
      deleted: false,
      exercises: [
        {
          id: 'wpe1',
          planId: 'plan-1',
          exerciseId: 'cat-bench',
          exerciseName: 'Fekvenyomás',
          exerciseCategory: 'CHEST',
          exerciseKind: 'WEIGHTED_REPS',
          orderIndex: 0,
          deleted: false,
          targetSets: [
            { id: 'ts1', planExerciseId: 'wpe1', setType: 'WORKING', reps: 6, repsMax: 8, weightKg: 100, orderIndex: 0, deleted: false },
          ],
        },
      ],
    } as unknown as WorkoutPlan;
    await setup({ planId: 'plan-1' }, plan);
    repository.items.set([priorSession()]);
    await component.ngOnInit();

    const row = component.exercises()[0];
    expect(component.lastTimeLabel(row)).toEqual({ date: '2026-08-20', summary: '8 @ 100 kg' });
    expect(component.suggestionsFor(row)).toEqual([{ side: null, mark: '', weight: 102.5 }]);

    component.applySuggestion(row, null, 102.5);

    expect(row.sets()[0].weightKg()).toBe(102.5);
    expect(component.suggestionsFor(row)).toEqual([]);
  });

  it('generateWarmup() prepends three WARMUP sets before the working set (backlog/132)', async () => {
    await setup();
    await component.ngOnInit();
    component.onPicked([pick()]);
    const row = component.exercises()[0];
    row.sets()[0].weightKg.set(60);

    await component.generateWarmup(row);

    expect(row.sets().map((set) => set.setType())).toEqual(['WARMUP', 'WARMUP', 'WARMUP', 'WORKING']);
    expect(row.sets().map((set) => set.weightKg())).toEqual([17.5, 40, 52.5, 60]);
  });
  it('starting from a plan carries the exercise cue, the set side and the target RPE (backlog/133–135)', async () => {
    const plan = {
      id: 'plan-2',
      name: 'OAPU',
      active: true,
      deleted: false,
      exercises: [
        {
          id: 'wpe2',
          planId: 'plan-2',
          exerciseId: 'cat-oapu',
          exerciseName: 'Negatív egykezes',
          exerciseCategory: 'BACK',
          exerciseKind: 'BODYWEIGHT_REPS',
          orderIndex: 0,
          notes: '3–5 mp leengedés',
          deleted: false,
          targetSets: [
            { id: 'ts1', planExerciseId: 'wpe2', setType: 'WORKING', reps: 2, side: 'LEFT', rpe: 8, orderIndex: 0, deleted: false },
            { id: 'ts2', planExerciseId: 'wpe2', setType: 'WORKING', reps: 2, side: 'RIGHT', rpe: 8, orderIndex: 1, deleted: false },
          ],
        },
      ],
    } as unknown as WorkoutPlan;
    await setup({ planId: 'plan-2' }, plan);
    await component.ngOnInit();

    const row = component.exercises()[0];
    expect(row.planNotes).toBe('3–5 mp leengedés');
    expect(row.sets().map((set) => [set.side(), set.rpe()])).toEqual([
      ['LEFT', 8],
      ['RIGHT', 8],
    ]);
    expect(draftService.draft()?.exercises[0].planNotes).toBe('3–5 mp leengedés');
    expect(draftService.draft()?.exercises[0].sets[0].side).toBe('LEFT');
  });

  it('+ Új szett after a one-sided set alternates the hand and starts without RPE (backlog/134)', async () => {
    await setup();
    await component.ngOnInit();
    component.onPicked([pick()]);
    const row = component.exercises()[0];
    row.sets()[0].side.set('LEFT');
    row.sets()[0].rpe.set(9);

    component.addSet(row);
    component.copyLastSet(row);

    expect(row.sets().map((set) => set.side())).toEqual(['LEFT', 'RIGHT', 'LEFT']);
    expect(row.sets()[1].rpe()).toBeNull();
  });

  it('suggests per hand for a one-sided exercise and applies only to that hand (backlog/134)', async () => {
    const plan = {
      id: 'plan-3',
      name: 'OAPU',
      active: true,
      deleted: false,
      exercises: [
        {
          id: 'wpe3',
          planId: 'plan-3',
          exerciseId: 'cat-bench',
          exerciseName: 'Fekvenyomás',
          exerciseCategory: 'CHEST',
          exerciseKind: 'WEIGHTED_REPS',
          orderIndex: 0,
          deleted: false,
          targetSets: [
            { id: 'ts1', planExerciseId: 'wpe3', setType: 'WORKING', reps: 2, repsMax: 3, weightKg: -20, side: 'LEFT', orderIndex: 0, deleted: false },
            { id: 'ts2', planExerciseId: 'wpe3', setType: 'WORKING', reps: 2, repsMax: 3, weightKg: -20, side: 'RIGHT', orderIndex: 1, deleted: false },
          ],
        },
      ],
    } as unknown as WorkoutPlan;
    const prior = priorSession();
    prior.exercises[0].sets = [
      { ...prior.exercises[0].sets[0], id: 'l', reps: 3, weightKg: -20, side: 'LEFT' },
      { ...prior.exercises[0].sets[0], id: 'r', reps: 2, weightKg: -20, side: 'RIGHT', orderIndex: 1 },
    ];
    await setup({ planId: 'plan-3' }, plan);
    repository.items.set([prior]);
    await component.ngOnInit();

    const row = component.exercises()[0];
    expect(component.suggestionsFor(row)).toEqual([{ side: 'LEFT', mark: '◀', weight: -17.5 }]);

    component.applySuggestion(row, 'LEFT', -17.5);

    expect(row.sets().map((set) => set.weightKg())).toEqual([-17.5, -20]);
  });
  it('openSetOptions() opens the popover and applies type / side / RPE picks live (backlog/134–135)', async () => {
    await setup();
    await component.ngOnInit();
    component.onPicked([pick()]);
    const set = component.exercises()[0].sets()[0];

    await component.openSetOptions(new Event('click'), set);

    const props = popoverCreate.calls.mostRecent().args[0].componentProps;
    expect(props.initial).toEqual({ setType: 'WORKING', side: null, rpe: null });
    props.changed({ setType: 'FAILURE', side: 'RIGHT', rpe: 9.5 });
    await Promise.resolve();

    expect([set.setType(), set.side(), set.rpe()]).toEqual(['FAILURE', 'RIGHT', 9.5]);
    expect(draftService.draft()?.exercises[0].sets[0].rpe).toBe(9.5);
  });
});
