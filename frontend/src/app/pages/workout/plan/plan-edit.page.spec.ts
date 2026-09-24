import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { ExercisePickResult } from '../../../shared/exercise-picker/exercise-picker.component';
import { PlanEditPage } from './plan-edit.page';

function pick(overrides: Partial<ExercisePickResult> = {}): ExercisePickResult {
  return {
    exerciseId: 'cat-1',
    exerciseName: 'Fekvenyomás',
    exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum.Chest,
    exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps,
    ...overrides,
  };
}

describe('PlanEditPage', () => {
  let fixture: ComponentFixture<PlanEditPage>;
  let component: PlanEditPage;
  let toastCreate: jasmine.Spy;

  beforeEach(async () => {
    toastCreate = jasmine.createSpy('create').and.resolveTo({ present: () => Promise.resolve() });

    await TestBed.configureTestingModule({
      imports: [PlanEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WorkoutPlanRepository, useValue: { load: () => Promise.resolve(), byId: () => undefined, items: signal<WorkoutPlan[]>([]), save: () => Promise.resolve({}), remove: () => Promise.resolve() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'new' }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
        { provide: ToastController, useValue: { create: toastCreate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  });

  it('onPicked() keeps only catalog exercises and warns about dropped ad-hoc picks', () => {
    component.onPicked([pick({ exerciseId: 'cat-1' }), pick({ exerciseId: null, exerciseName: 'Ad-hoc' })]);

    expect(component.exercises().length).toBe(1);
    expect(component.exercises()[0].exerciseId).toBe('cat-1');
    expect(toastCreate).toHaveBeenCalled();
  });

  it('onPicked() does not warn when every pick has a catalog id', () => {
    component.onPicked([pick({ exerciseId: 'cat-1' }), pick({ exerciseId: 'cat-2' })]);

    expect(component.exercises().length).toBe(2);
    expect(toastCreate).not.toHaveBeenCalled();
  });

  it('moveExercise() swaps adjacent rows and is a no-op at the ends', () => {
    component.onPicked([pick({ exerciseId: 'a' }), pick({ exerciseId: 'b' }), pick({ exerciseId: 'c' })]);
    const [, b, c] = component.exercises();

    component.moveExercise(b, -1);
    expect(component.exercises().map((row) => row.exerciseId)).toEqual(['b', 'a', 'c']);

    component.moveExercise(b, -1); // 'b' is now first — no-op
    expect(component.exercises().map((row) => row.exerciseId)).toEqual(['b', 'a', 'c']);

    component.moveExercise(c, 1); // 'c' is last — no-op
    expect(component.exercises().map((row) => row.exerciseId)).toEqual(['b', 'a', 'c']);
  });

  describe('reps range (backlog/125)', () => {
    let saveSpy: jasmine.Spy;

    beforeEach(() => {
      saveSpy = spyOn(TestBed.inject(WorkoutPlanRepository), 'save').and.resolveTo({ id: 'p1' } as WorkoutPlan);
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      component.form.patchValue({ name: 'Felsőtest' });
      component.onPicked([pick()]);
    });

    it('parses "8-12" into numeric lower / upper bounds and saves them', async () => {
      const set = component.exercises()[0].sets()[0];
      component.onRepsInput(set, '8 – 12');
      await component.save();

      const draft = saveSpy.calls.mostRecent().args[0];
      expect(draft.exercises[0].targetSets[0].reps).toBe(8);
      expect(draft.exercises[0].targetSets[0].repsMax).toBe(12);
    });

    it('a single value clears the upper bound', async () => {
      const set = component.exercises()[0].sets()[0];
      component.onRepsInput(set, '8-12');
      component.onRepsInput(set, '10');
      await component.save();

      const draft = saveSpy.calls.mostRecent().args[0];
      expect(draft.exercises[0].targetSets[0].reps).toBe(10);
      expect(draft.exercises[0].targetSets[0].repsMax).toBeNull();
    });

    it('an inverted range shows an inline error and blocks the save', async () => {
      const set = component.exercises()[0].sets()[0];
      component.onRepsInput(set, '12-8');
      expect(set.repsError()).toBe('INVERTED');

      await component.save();
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });
});
