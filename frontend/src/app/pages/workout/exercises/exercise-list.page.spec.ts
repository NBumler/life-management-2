import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { ExerciseListPage } from './exercise-list.page';

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

describe('ExerciseListPage', () => {
  let fixture: ComponentFixture<ExerciseListPage>;
  let repository: jasmine.SpyObj<Pick<ExerciseRepository, 'load' | 'setFavorite'>> & {
    items: ReturnType<typeof signal<Exercise[]>>;
  };

  beforeEach(async () => {
    repository = jasmine.createSpyObj('ExerciseRepository', ['load', 'setFavorite']) as never;
    repository.load.and.resolveTo();
    repository.setFavorite.and.resolveTo();
    repository.items = signal<Exercise[]>([]);

    await TestBed.configureTestingModule({
      imports: [ExerciseListPage],
      providers: [provideRouter([]), provideTranslateService(), { provide: ExerciseRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseListPage);
  });

  it('isEmpty(): true only when the catalog has no rows at all', () => {
    expect(fixture.componentInstance.isEmpty()).toBe(true);
    repository.items.set([exercise()]);
    expect(fixture.componentInstance.isEmpty()).toBe(false);
  });

  it('hasNoResults(): true when a filter excludes every row, distinct from the global empty state', () => {
    repository.items.set([exercise({ name: 'Fekvenyomás' })]);
    fixture.componentInstance.query.set('teljesen-más');

    expect(fixture.componentInstance.hasNoResults()).toBe(true);
    expect(fixture.componentInstance.isEmpty()).toBe(false);
  });

  it('toggleCategory(): filters to one category and clears on a second tap', () => {
    repository.items.set([
      exercise({ id: 'a', name: 'Guggolás', category: Exercise.CategoryEnum.Legs }),
      exercise({ id: 'b', name: 'Fekvenyomás', category: Exercise.CategoryEnum.Chest }),
    ]);

    fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Legs);
    expect(fixture.componentInstance.filtered().map((e) => e.id)).toEqual(['a']);

    fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Legs);
    expect(fixture.componentInstance.filtered().map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('toggleFavoritesOnly(): keeps only favourites when on', () => {
    repository.items.set([
      exercise({ id: 'a', name: 'Guggolás', isFavorite: true }),
      exercise({ id: 'b', name: 'Fekvenyomás', isFavorite: false }),
    ]);

    fixture.componentInstance.toggleFavoritesOnly();

    expect(fixture.componentInstance.filtered().map((e) => e.id)).toEqual(['a']);
  });

  it('searches both the name and the equipment field', () => {
    repository.items.set([
      exercise({ id: 'a', name: 'Guggolás', equipment: 'Rúd + állvány' }),
      exercise({ id: 'b', name: 'Plank', equipment: null }),
    ]);

    fixture.componentInstance.query.set('állvány');
    expect(fixture.componentInstance.filtered().map((e) => e.id)).toEqual(['a']);

    fixture.componentInstance.query.set('plank');
    expect(fixture.componentInstance.filtered().map((e) => e.id)).toEqual(['b']);
  });

  it('toggleFavorite(): suppresses the row navigation and flips the flag via the repository', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation', 'preventDefault']);

    fixture.componentInstance.toggleFavorite(exercise({ id: 'e1', isFavorite: false }), event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(repository.setFavorite).toHaveBeenCalledWith('e1', true);
  });

  it('ngOnInit(): loads the catalog', async () => {
    await fixture.componentInstance.ngOnInit();

    expect(repository.load).toHaveBeenCalled();
  });
});
