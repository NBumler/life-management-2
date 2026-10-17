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
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { byCatalogName } from '../../../core/data/catalog-order';
import { ExerciseRepository } from '../../../core/data/exercise.repository';
import { StretchExerciseRepository } from '../../../core/data/stretch-exercise.repository';
import { CatalogEntry, EXERCISE_TYPES, EXERCISE_TYPE_LABEL_KEYS, ExerciseType, filterCatalog, toggleInSet } from './catalog-filter';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_LABEL_KEYS, EXERCISE_KIND_LABEL_KEYS, ExerciseCategory } from './exercise-labels';

/**
 * documentation/Subfeatures/Gyakorlat.md "Katalógus lista": search, type + category chips (both
 * multi-select, backlog/167 — `catalog-filter.ts`), Kedvencek filter; strength and stretching
 * exercises in one name-ordered list. Opened from the workout header (fogaskerék), not a segment.
 */
@Component({
  selector: 'app-exercise-list',
  templateUrl: 'exercise-list.page.html',
  styles: [
    `
    .exercise-desc {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: normal;
      color: var(--ion-color-medium);
    }
  `,
  ],
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
  private readonly stretchRepository = inject(StretchExerciseRepository);
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly categories = EXERCISE_CATEGORIES;
  readonly categoryLabelKeys = EXERCISE_CATEGORY_LABEL_KEYS;
  readonly kindLabelKeys = EXERCISE_KIND_LABEL_KEYS;
  readonly types = EXERCISE_TYPES;
  readonly typeLabelKeys = EXERCISE_TYPE_LABEL_KEYS;
  /** backlog/167 — `edzes.nyujtas` off: no stretching rows and no type chips. */
  readonly stretchEnabled = this.featureFlags.isEnabled('edzes.nyujtas');

  readonly query = signal('');
  readonly typeFilter = signal<ReadonlySet<ExerciseType>>(new Set());
  readonly categoryFilter = signal<ReadonlySet<ExerciseCategory>>(new Set());
  readonly favoritesOnly = signal(false);

  private readonly entries = computed<CatalogEntry[]>(() => {
    const strength: CatalogEntry[] = this.repository.items().map((item) => ({ type: 'STRENGTH', item }));
    const stretch: CatalogEntry[] = this.stretchEnabled
      ? this.stretchRepository.items().map((item) => ({ type: 'STRETCH', item }))
      : [];
    // Stable sort: on an equal name the strength row stays first.
    return [...strength, ...stretch].sort((a, b) => byCatalogName(a.item, b.item));
  });

  readonly filtered = computed(() =>
    filterCatalog(this.entries(), {
      types: this.typeFilter(),
      categories: this.categoryFilter(),
      favoritesOnly: this.favoritesOnly(),
      query: this.query(),
    }),
  );

  readonly isEmpty = computed(() => this.entries().length === 0);
  readonly hasNoResults = computed(() => !this.isEmpty() && this.filtered().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.stretchEnabled ? this.stretchRepository.load() : Promise.resolve()]);
  }

  toggleType(type: ExerciseType): void {
    this.typeFilter.update((current) => toggleInSet(current, type));
  }

  toggleCategory(category: ExerciseCategory): void {
    this.categoryFilter.update((current) => toggleInSet(current, category));
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnly.update((value) => !value);
  }

  /** Strength rows open `exercises/:id`, stretching rows `exercises/stretch/:id`. */
  rowLink(entry: CatalogEntry): string[] {
    return entry.type === 'STRETCH' ? ['stretch', entry.item.id] : [entry.item.id];
  }

  kindLabelKey(exercise: Exercise): string {
    return this.kindLabelKeys[exercise.kind];
  }

  toggleFavorite(entry: CatalogEntry, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (entry.type === 'STRETCH') {
      void this.stretchRepository.setFavorite(entry.item.id, !entry.item.isFavorite);
    } else {
      void this.repository.setFavorite(entry.item.id, !entry.item.isFavorite);
    }
  }

  trackEntry(entry: CatalogEntry): string {
    return `${entry.type}:${entry.item.id}`;
  }

  /** Narrowing helper for the template (control flow can't narrow the union through `entry.type`). */
  asStrength(entry: CatalogEntry): Exercise | null {
    return entry.type === 'STRENGTH' ? entry.item : null;
  }
}
