import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { StretchExercise } from '../../../api/model/stretchExercise';
import { StretchExerciseNameConflictError, StretchExerciseRepository } from '../../../core/data/stretch-exercise.repository';
import { StretchExerciseEditPage } from './stretch-exercise-edit.page';

function stretch(overrides: Partial<StretchExercise> = {}): StretchExercise {
  return {
    id: 's1',
    name: 'Combhajlító nyújtás',
    category: StretchExercise.CategoryEnum.Legs,
    isFavorite: false,
    defaultHoldSeconds: 45,
    defaultPerSide: true,
    equipment: 'Heveder',
    description: 'Lassan',
    deleted: false,
    ...overrides,
  };
}

describe('StretchExerciseEditPage (backlog/167)', () => {
  let fixture: ComponentFixture<StretchExerciseEditPage>;
  let repository: jasmine.SpyObj<Pick<StretchExerciseRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<StretchExercise[]>>;
  };
  let navController: jasmine.SpyObj<Pick<NavController, 'navigateBack' | 'navigateForward'>>;

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('StretchExerciseRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<StretchExercise[]>([stretch()]);
    navController = jasmine.createSpyObj('NavController', ['navigateBack', 'navigateForward']);
    navController.navigateBack.and.resolveTo(true);
    navController.navigateForward.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [StretchExerciseEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: StretchExerciseRepository, useValue: repository },
        { provide: NavController, useValue: navController },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StretchExerciseEditPage);
  }

  it('new: starts with the 30 s default hold, not per side, and shows the type segment', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.defaultHoldSeconds.value).toBe(30);
    expect(fixture.componentInstance.form.controls.defaultPerSide.value).toBe(false);
    expect(fixture.nativeElement.querySelector('ion-segment')).not.toBeNull();
  });

  it('edit: loads the row into the form and hides the type segment', async () => {
    await createFixture('s1');
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      name: 'Combhajlító nyújtás',
      category: StretchExercise.CategoryEnum.Legs,
      defaultHoldSeconds: 45,
      defaultPerSide: true,
      equipment: 'Heveder',
      description: 'Lassan',
      isFavorite: false,
    });
    expect(fixture.nativeElement.querySelector('ion-segment')).toBeNull();
  });

  it('save(): trims the optional texts, saves and navigates back to the catalog', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(stretch());
    fixture.componentInstance.form.setValue({
      name: 'Nyak nyújtás',
      category: StretchExercise.CategoryEnum.Neck,
      defaultHoldSeconds: 20,
      defaultPerSide: true,
      equipment: '   ',
      description: '  Fej oldalra  ',
      isFavorite: true,
    });

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith({
      id: undefined,
      name: 'Nyak nyújtás',
      category: StretchExercise.CategoryEnum.Neck,
      defaultHoldSeconds: 20,
      defaultPerSide: true,
      equipment: null,
      description: 'Fej oldalra',
      isFavorite: true,
    });
    expect(navController.navigateBack).toHaveBeenCalledWith('/tabs/workout/exercises');
  });

  it('save(): a name conflict shows the error and stays on the page', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.rejectWith(new StretchExerciseNameConflictError('x'));
    fixture.componentInstance.form.controls.name.setValue('Combhajlító nyújtás');

    await fixture.componentInstance.save();

    expect(fixture.componentInstance.nameConflictError()).not.toBeNull();
    expect(navController.navigateBack).not.toHaveBeenCalled();
  });

  it('onTypeChange(STRENGTH): swaps to the strength editor in place', async () => {
    await createFixture('new');

    await fixture.componentInstance.onTypeChange('STRENGTH');

    expect(navController.navigateForward).toHaveBeenCalledWith('/tabs/workout/exercises/new', { replaceUrl: true, animated: false });
  });
});
