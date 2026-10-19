import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { StretchExercise } from '../../api/model/stretchExercise';
import { StretchExerciseRepository } from '../../core/data/stretch-exercise.repository';
import { CatalogEntry, filterCatalog, toggleInSet } from '../workout/catalog-filter';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_LABEL_KEYS, ExerciseCategory } from '../workout/exercise-labels';

/**
 * documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" (backlog/168) — picks existing stretching
 * exercises for a stretching template (and, backlog/169, an ad-hoc session). Search + multi-select
 * category chips + Kedvencek, through the catalog's own `filterCatalog`. No ad-hoc creation: a new
 * stretch is made in the Gyakorlat catalog. Emits the picked rows in catalog order.
 */
@Component({
  selector: 'app-stretch-picker',
  templateUrl: 'stretch-picker.component.html',
  styleUrls: ['stretch-picker.component.scss'],
  imports: [
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
    IonCheckbox,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StretchPickerComponent implements OnInit {
  private readonly repository = inject(StretchExerciseRepository);

  /** Emitted with 1+ picks on confirm; nothing on cancel. */
  @Output() readonly confirmed = new EventEmitter<StretchExercise[]>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly categories = EXERCISE_CATEGORIES;
  readonly categoryLabelKeys = EXERCISE_CATEGORY_LABEL_KEYS;

  readonly query = signal('');
  readonly categoryFilter = signal<ReadonlySet<ExerciseCategory>>(new Set());
  readonly favoritesOnly = signal(false);
  readonly pickedIds = signal<ReadonlySet<string>>(new Set());

  readonly filtered = computed<StretchExercise[]>(() => {
    const entries: CatalogEntry[] = this.repository
      .items()
      .filter((item) => !item.deleted)
      .map((item) => ({ type: 'STRETCH', item }));
    return filterCatalog(entries, {
      types: new Set(),
      categories: this.categoryFilter(),
      favoritesOnly: this.favoritesOnly(),
      query: this.query(),
    }).map((entry) => entry.item as StretchExercise);
  });

  readonly isEmpty = computed(() => this.repository.loaded() && this.repository.items().length === 0);

  ngOnInit(): void {
    void this.repository.load();
  }

  toggleCategory(category: ExerciseCategory): void {
    this.categoryFilter.update((current) => toggleInSet(current, category));
  }

  toggleFavoritesOnly(): void {
    this.favoritesOnly.update((value) => !value);
  }

  isPicked(id: string): boolean {
    return this.pickedIds().has(id);
  }

  togglePick(id: string): void {
    this.pickedIds.update((ids) => toggleInSet(ids, id));
  }

  confirm(): void {
    const picked = this.repository.items().filter((item) => this.pickedIds().has(item.id));
    if (picked.length > 0) {
      this.confirmed.emit(picked);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
