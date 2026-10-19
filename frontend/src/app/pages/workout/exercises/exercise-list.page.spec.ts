import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { StretchExercise } from '../../../api/model/stretchExercise';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { StretchExerciseRepository } from '../../../core/data/stretch-exercise.repository';
import { CatalogEntry } from '../../../shared/workout/catalog-filter';
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

function stretch(overrides: Partial<StretchExercise> = {}): StretchExercise {
  return {
    id: 's1',
    name: 'Hát nyújtás',
    category: StretchExercise.CategoryEnum.Back,
    isFavorite: false,
    defaultHoldSeconds: 30,
    defaultPerSide: false,
    deleted: false,
    ...overrides,
  };
}

const ids = (entries: CatalogEntry[]): string[] => entries.map((entry) => entry.item.id);

describe('ExerciseListPage', () => {
  let fixture: ComponentFixture<ExerciseListPage>;
  let repository: jasmine.SpyObj<Pick<ExerciseRepository, 'load' | 'setFavorite'>> & {
    items: ReturnType<typeof signal<Exercise[]>>;
  };
  let stretchRepository: jasmine.SpyObj<Pick<StretchExerciseRepository, 'load' | 'setFavorite'>> & {
    items: ReturnType<typeof signal<StretchExercise[]>>;
  };
  let stretchFlag: boolean;

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ExerciseListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ExerciseRepository, useValue: repository },
        { provide: StretchExerciseRepository, useValue: stretchRepository },
        { provide: FeatureFlagsService, useValue: { isEnabled: (key: string) => key !== 'edzes.nyujtas' || stretchFlag } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseListPage);
  }

  beforeEach(() => {
    repository = jasmine.createSpyObj('ExerciseRepository', ['load', 'setFavorite']) as never;
    repository.load.and.resolveTo();
    repository.setFavorite.and.resolveTo();
    repository.items = signal<Exercise[]>([]);
    stretchRepository = jasmine.createSpyObj('StretchExerciseRepository', ['load', 'setFavorite']) as never;
    stretchRepository.load.and.resolveTo();
    stretchRepository.setFavorite.and.resolveTo();
    stretchRepository.items = signal<StretchExercise[]>([]);
    stretchFlag = true;
  });

  describe('with edzes.nyujtas on', () => {
    beforeEach(create);

    it('isEmpty(): true only when neither catalog has rows', () => {
      expect(fixture.componentInstance.isEmpty()).toBe(true);
      stretchRepository.items.set([stretch()]);
      expect(fixture.componentInstance.isEmpty()).toBe(false);
    });

    it('hasNoResults(): true when a filter excludes every row, distinct from the global empty state', () => {
      repository.items.set([exercise({ name: 'Fekvenyomás' })]);
      fixture.componentInstance.query.set('teljesen-más');

      expect(fixture.componentInstance.hasNoResults()).toBe(true);
      expect(fixture.componentInstance.isEmpty()).toBe(false);
    });

    it('merges both types into one name-ordered list', () => {
      repository.items.set([exercise({ id: 'a', name: 'Guggolás' }), exercise({ id: 'b', name: 'Bicepsz' })]);
      stretchRepository.items.set([stretch({ id: 's', name: 'Combhajlító nyújtás' })]);

      expect(ids(fixture.componentInstance.filtered())).toEqual(['b', 's', 'a']);
    });

    it('type + category chips: "Hát + Nyújtás" keeps only back stretches', () => {
      repository.items.set([exercise({ id: 'a', name: 'Evezés', category: Exercise.CategoryEnum.Back })]);
      stretchRepository.items.set([
        stretch({ id: 's1', name: 'Hát nyújtás', category: StretchExercise.CategoryEnum.Back }),
        stretch({ id: 's2', name: 'Nyak nyújtás', category: StretchExercise.CategoryEnum.Neck }),
      ]);

      fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Back);
      fixture.componentInstance.toggleType('STRETCH');

      expect(ids(fixture.componentInstance.filtered())).toEqual(['s1']);
    });

    it('toggleCategory(): several categories combine with OR, and a second tap removes one', () => {
      repository.items.set([
        exercise({ id: 'a', name: 'Guggolás', category: Exercise.CategoryEnum.Legs }),
        exercise({ id: 'b', name: 'Fekvenyomás', category: Exercise.CategoryEnum.Chest }),
        exercise({ id: 'c', name: 'Vállból nyomás', category: Exercise.CategoryEnum.Shoulders }),
      ]);

      fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Legs);
      fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Chest);
      expect(ids(fixture.componentInstance.filtered())).toEqual(['b', 'a']);

      fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Legs);
      expect(ids(fixture.componentInstance.filtered())).toEqual(['b']);

      fixture.componentInstance.toggleCategory(Exercise.CategoryEnum.Chest);
      expect(ids(fixture.componentInstance.filtered())).toEqual(['b', 'a', 'c']);
    });

    it('toggleFavoritesOnly(): keeps only favourites when on', () => {
      repository.items.set([
        exercise({ id: 'a', name: 'Guggolás', isFavorite: true }),
        exercise({ id: 'b', name: 'Fekvenyomás', isFavorite: false }),
      ]);
      stretchRepository.items.set([stretch({ id: 's', isFavorite: true })]);

      fixture.componentInstance.toggleFavoritesOnly();

      expect(ids(fixture.componentInstance.filtered())).toEqual(['a', 's']);
    });

    it('searches the name, the equipment and the description field', () => {
      repository.items.set([
        exercise({ id: 'a', name: 'Guggolás', equipment: 'Rúd + állvány' }),
        exercise({ id: 'b', name: 'Plank', equipment: null }),
        exercise({ id: 'c', name: 'Húzódzkodás', description: 'Széles, pronált fogás' }),
      ]);
      stretchRepository.items.set([stretch({ id: 's', name: 'Csípőhajlító', description: 'Térdelő kitörés' })]);

      fixture.componentInstance.query.set('állvány');
      expect(ids(fixture.componentInstance.filtered())).toEqual(['a']);

      fixture.componentInstance.query.set('plank');
      expect(ids(fixture.componentInstance.filtered())).toEqual(['b']);

      fixture.componentInstance.query.set('pronált');
      expect(ids(fixture.componentInstance.filtered())).toEqual(['c']);

      fixture.componentInstance.query.set('kitörés');
      expect(ids(fixture.componentInstance.filtered())).toEqual(['s']);
    });

    it('toggleFavorite(): suppresses the row navigation and flips the flag via the matching repository', () => {
      const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation', 'preventDefault']);

      fixture.componentInstance.toggleFavorite({ type: 'STRENGTH', item: exercise({ id: 'e1', isFavorite: false }) }, event);
      fixture.componentInstance.toggleFavorite({ type: 'STRETCH', item: stretch({ id: 's1', isFavorite: true }) }, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(repository.setFavorite).toHaveBeenCalledWith('e1', true);
      expect(stretchRepository.setFavorite).toHaveBeenCalledWith('s1', false);
    });

    it('rowLink(): strength rows open :id, stretching rows stretch/:id', () => {
      expect(fixture.componentInstance.rowLink({ type: 'STRENGTH', item: exercise({ id: 'e1' }) })).toEqual(['e1']);
      expect(fixture.componentInstance.rowLink({ type: 'STRETCH', item: stretch({ id: 's1' }) })).toEqual(['stretch', 's1']);
    });

    it('ngOnInit(): loads both catalogs', async () => {
      await fixture.componentInstance.ngOnInit();

      expect(repository.load).toHaveBeenCalled();
      expect(stretchRepository.load).toHaveBeenCalled();
    });

    it('renders the Erősítés / Nyújtás type chips', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('ion-chip[data-type]').length).toBe(2);
    });
  });

  describe('with edzes.nyujtas off', () => {
    beforeEach(async () => {
      stretchFlag = false;
      await create();
    });

    it('hides stretching rows and the type chips, and never loads the stretching catalog', async () => {
      repository.items.set([exercise({ id: 'a' })]);
      stretchRepository.items.set([stretch({ id: 's' })]);
      await fixture.componentInstance.ngOnInit();
      fixture.detectChanges();

      expect(ids(fixture.componentInstance.filtered())).toEqual(['a']);
      expect(stretchRepository.load).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelectorAll('ion-chip[data-type]').length).toBe(0);
    });
  });
});
