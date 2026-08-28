import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { matchesSearch } from '../../../shared/text-search';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_LABEL_KEYS, EXERCISE_KIND_LABEL_KEYS } from './exercise-labels';

/**
 * documentation/Subfeatures/Gyakorlat.md "Katalógus lista": search, category chips, Kedvencek
 * filter; each row shows name, category, kind marker. Opened from the workout header (fogaskerék),
 * not a segment.
 */
@Component({
  selector: 'app-exercise-list',
  templateUrl: 'exercise-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonChip,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseListPage implements OnInit {
  private readonly repository = inject(ExerciseRepository);

  readonly categories = EXERCISE_CATEGORIES;
  readonly categoryLabelKeys = EXERCISE_CATEGORY_LABEL_KEYS;
  readonly kindLabelKeys = EXERCISE_KIND_LABEL_KEYS;

  readonly query = signal('');
  readonly categoryFilter = signal<Exercise.CategoryEnum | null>(null);
  readonly favoritesOnly = signal(false);

  readonly filtered = computed(() => {
    const query = this.query();
    const category = this.categoryFilter();
    const favoritesOnly = this.favoritesOnly();
    return this.repository.items().filter((exercise) => {
      if (category !== null && exercise.category !== category) {
        return false;
      }
      if (favoritesOnly && !exercise.isFavorite) {
        return false;
      }
      return matchesSearch(query, exercise.name) || matchesSearch(query, exercise.equipment ?? '');
    });
  });

  readonly isEmpty = computed(() => this.repository.items().length === 0);
  readonly hasNoResults = computed(() => !this.isEmpty() && this.filtered().length === 0);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  toggleCategory(category: Exercise.CategoryEnum): void {
    this.categoryFilter.update((current) => (current === category ? null : category));
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnly.update((value) => !value);
  }

  toggleFavorite(exercise: Exercise, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    void this.repository.setFavorite(exercise.id, !exercise.isFavorite);
  }
}
