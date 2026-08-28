import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { ExerciseNameConflictError, ExerciseRepository } from '../../../core/data/exercise.repository';
import { ExerciseEditPage } from './exercise-edit.page';
import { EXERCISE_KIND_FIELD_HINT_KEYS } from './exercise-labels';

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'e1',
    name: 'Fekvenyomás',
    category: Exercise.CategoryEnum.Chest,
    kind: Exercise.KindEnum.WeightedReps,
    defaultRestTimeSeconds: null,
    isFavorite: false,
    equipment: null,
    deleted: false,
    ...overrides,
  };
}

describe('ExerciseEditPage', () => {
  let fixture: ComponentFixture<ExerciseEditPage>;
  let repository: jasmine.SpyObj<Pick<ExerciseRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<Exercise[]>>;
  };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('ExerciseRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<Exercise[]>([]);

    await TestBed.configureTestingModule({
      imports: [ExerciseEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: ExerciseRepository, useValue: repository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseEditPage);
  }

  function fillForm(overrides: Partial<Record<'name' | 'category' | 'kind' | 'defaultRestTimeSeconds' | 'equipment' | 'isFavorite', unknown>> = {}): void {
    fixture.componentInstance.form.setValue({
      name: 'Guggolás',
      category: Exercise.CategoryEnum.Legs,
      kind: Exercise.KindEnum.WeightedReps,
      defaultRestTimeSeconds: 120,
      equipment: 'Rúd',
      isFavorite: true,
      ...overrides,
    } as never);
  }

  it('create mode: leaves exerciseId null and the form on its defaults', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.exerciseId()).toBeNull();
    expect(fixture.componentInstance.form.controls.category.value).toBe(Exercise.CategoryEnum.Chest);
    expect(fixture.componentInstance.form.controls.kind.value).toBe(Exercise.KindEnum.WeightedReps);
  });

  it('edit mode: patches the form and the kind hint from the already-loaded repository item', async () => {
    await createFixture('e1');
    repository.items.set([
      exercise({
        id: 'e1',
        name: 'Húzódzkodás',
        category: Exercise.CategoryEnum.Back,
        kind: Exercise.KindEnum.BodyweightReps,
        defaultRestTimeSeconds: 120,
        equipment: 'Húzódzkodó rúd',
        isFavorite: true,
      }),
    ]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.exerciseId()).toBe('e1');
    expect(fixture.componentInstance.form.controls.name.value).toBe('Húzódzkodás');
    expect(fixture.componentInstance.form.controls.category.value).toBe(Exercise.CategoryEnum.Back);
    expect(fixture.componentInstance.form.controls.kind.value).toBe(Exercise.KindEnum.BodyweightReps);
    expect(fixture.componentInstance.kindFieldHintKey()).toBe(EXERCISE_KIND_FIELD_HINT_KEYS[Exercise.KindEnum.BodyweightReps]);
  });

  it('save(): does not persist an invalid (name-less) form', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('save(): trims equipment, persists the form and navigates back to the list', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fillForm({ equipment: '  Rúd + állvány  ' });
    repository.save.and.resolveTo(exercise({ id: 'new-1' }));
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith({
      id: undefined,
      name: 'Guggolás',
      category: Exercise.CategoryEnum.Legs,
      kind: Exercise.KindEnum.WeightedReps,
      defaultRestTimeSeconds: 120,
      equipment: 'Rúd + állvány',
      isFavorite: true,
    });
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/workout/exercises');
  });

  it('save(): on a name conflict, surfaces the error and stays on the page', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fillForm();
    repository.save.and.rejectWith(new ExerciseNameConflictError('other-id'));
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(fixture.componentInstance.nameConflictError()).not.toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('onKindChange(): updates the set-field hint', async () => {
    await createFixture('new');

    fixture.componentInstance.onKindChange(Exercise.KindEnum.IsometricTime);

    expect(fixture.componentInstance.kindFieldHintKey()).toBe(EXERCISE_KIND_FIELD_HINT_KEYS[Exercise.KindEnum.IsometricTime]);
  });

  it('delete(): the confirmation handler removes the exercise and navigates back', async () => {
    await createFixture('e1');
    repository.items.set([exercise({ id: 'e1' })]);
    await fixture.componentInstance.ngOnInit();
    repository.remove.and.resolveTo();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('e1');
  });
});
