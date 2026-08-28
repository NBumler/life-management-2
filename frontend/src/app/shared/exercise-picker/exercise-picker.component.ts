import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { Exercise } from '../../api/model/exercise';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { ExerciseRepository } from '../../core/data/exercise.repository';
import { matchesSearch } from '../text-search';

const CATEGORY_VALUES = Object.values(Exercise.CategoryEnum);
const CATEGORY_LABEL_KEY = (value: string): string => `WORKOUT.EXERCISES.CATEGORY.${value}`;
const KIND_VALUES = Object.values(WorkoutExerciseEntry.ExerciseKindEnum);
const KIND_LABEL_KEY = (value: string): string => `WORKOUT.EXERCISES.KIND.${value}`;

/** One resolved pick handed back to the session editor — a catalog reference or a pure ad-hoc snapshot. */
export interface ExercisePickResult {
  exerciseId: string | null;
  exerciseName: string;
  exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum;
  exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum;
}

/**
 * documentation/Subfeatures/Edzésnapló.md "Gyakorlat picker": ion-searchbar + ExerciseCategory chips
 * + Kedvencek + ad-hoc creation. Rendered inside the session editor's `<ion-modal>`; emits the
 * multi-selected catalog rows plus an optional ad-hoc entry. First real consumer of the Gyakorlat
 * catalog outside its own screens — Heti terv reuses this component later.
 */
@Component({
  selector: 'app-exercise-picker',
  templateUrl: 'exercise-picker.component.html',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSearchbar,
    IonChip,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonCheckbox,
    IonInput,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExercisePickerComponent implements OnInit {
  private readonly repository = inject(ExerciseRepository);

  /** Emitted with 1+ picks on confirm; nothing on cancel. */
  @Output() readonly confirmed = new EventEmitter<ExercisePickResult[]>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly categories = CATEGORY_VALUES;
  readonly kinds = KIND_VALUES;
  readonly categoryLabelKey = CATEGORY_LABEL_KEY;
  readonly kindLabelKey = KIND_LABEL_KEY;

  readonly query = signal('');
  readonly categoryFilter = signal<Exercise.CategoryEnum | null>(null);
  readonly favoritesOnly = signal(false);
  readonly pickedIds = signal<ReadonlySet<string>>(new Set());

  readonly adhocName = signal('');
  readonly adhocCategory = signal<WorkoutExerciseEntry.ExerciseCategoryEnum>(WorkoutExerciseEntry.ExerciseCategoryEnum.Chest);
  readonly adhocKind = signal<WorkoutExerciseEntry.ExerciseKindEnum>(WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps);
  readonly adhocSaveToCatalog = signal(false);

  readonly filtered = computed(() => {
    const query = this.query();
    const category = this.categoryFilter();
    const favoritesOnly = this.favoritesOnly();
    return this.repository
      .items()
      .filter((exercise) => !exercise.deleted)
      .filter((exercise) => category === null || exercise.category === category)
      .filter((exercise) => !favoritesOnly || exercise.isFavorite)
      .filter((exercise) => matchesSearch(query, exercise.name) || matchesSearch(query, exercise.equipment ?? ''));
  });

  readonly canConfirm = computed(() => this.pickedIds().size > 0 || this.adhocName().trim().length > 0);

  ngOnInit(): void {
    void this.repository.load();
  }

  toggleCategory(category: Exercise.CategoryEnum): void {
    this.categoryFilter.update((current) => (current === category ? null : category));
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnly.update((value) => !value);
  }

  isPicked(id: string): boolean {
    return this.pickedIds().has(id);
  }

  togglePick(id: string): void {
    this.pickedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async confirm(): Promise<void> {
    const results: ExercisePickResult[] = this.repository
      .items()
      .filter((exercise) => this.pickedIds().has(exercise.id))
      .map((exercise) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseCategory: exercise.category as WorkoutExerciseEntry.ExerciseCategoryEnum,
        exerciseKind: exercise.kind as WorkoutExerciseEntry.ExerciseKindEnum,
      }));

    const adhocName = this.adhocName().trim();
    if (adhocName.length > 0) {
      let exerciseId: string | null = null;
      if (this.adhocSaveToCatalog()) {
        try {
          const saved = await this.repository.save({
            name: adhocName,
            category: this.adhocCategory() as unknown as Exercise.CategoryEnum,
            kind: this.adhocKind() as unknown as Exercise.KindEnum,
            defaultRestTimeSeconds: null,
            isFavorite: false,
            equipment: null,
          });
          exerciseId = saved.id;
        } catch {
          // Name already in the catalog — keep it as a pure ad-hoc snapshot rather than blocking the pick.
        }
      }
      results.push({
        exerciseId,
        exerciseName: adhocName,
        exerciseCategory: this.adhocCategory(),
        exerciseKind: this.adhocKind(),
      });
    }

    if (results.length > 0) {
      this.confirmed.emit(results);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
