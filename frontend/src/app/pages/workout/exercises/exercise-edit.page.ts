import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Exercise } from '../../../api/model/exercise';
import { ExerciseNameConflictError, ExerciseRepository } from '../../../core/data/exercise.repository';
import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABEL_KEYS,
  EXERCISE_KINDS,
  EXERCISE_KIND_FIELD_HINT_KEYS,
  EXERCISE_KIND_LABEL_KEYS,
} from './exercise-labels';

/**
 * documentation/Subfeatures/Gyakorlat.md "Create / edit": name, category, kind, optional
 * defaultRestTimeSeconds, equipment, favourite toggle. Route param `id` is an existing uuid or the
 * literal `new`. Mirrors LifePlanEditPage's route/title/delete pattern.
 */
@Component({
  selector: 'app-exercise-edit',
  templateUrl: 'exercise-edit.page.html',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonToggle,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ExerciseRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly categories = EXERCISE_CATEGORIES;
  readonly kinds = EXERCISE_KINDS;
  readonly categoryLabelKeys = EXERCISE_CATEGORY_LABEL_KEYS;
  readonly kindLabelKeys = EXERCISE_KIND_LABEL_KEYS;

  readonly exerciseId = signal<string | null>(null);
  readonly nameConflictError = signal<string | null>(null);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    category: this.fb.nonNullable.control<Exercise.CategoryEnum>(Exercise.CategoryEnum.Chest, [Validators.required]),
    kind: this.fb.nonNullable.control<Exercise.KindEnum>(Exercise.KindEnum.WeightedReps, [Validators.required]),
    defaultRestTimeSeconds: this.fb.control<number | null>(null, [Validators.min(1)]),
    equipment: this.fb.control<string | null>(null),
    isFavorite: this.fb.nonNullable.control(false),
  });

  private readonly kindValue = signal<Exercise.KindEnum>(Exercise.KindEnum.WeightedReps);
  readonly kindFieldHintKey = computed(() => EXERCISE_KIND_FIELD_HINT_KEYS[this.kindValue()]);

  onKindChange(kind: Exercise.KindEnum): void {
    this.kindValue.set(kind);
  }

  async ngOnInit(): Promise<void> {
    await this.repository.load();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.exerciseId.set(idParam);
      const existing = this.repository.items().find((exercise) => exercise.id === idParam);
      if (existing !== undefined) {
        this.form.reset({
          name: existing.name,
          category: existing.category,
          kind: existing.kind,
          defaultRestTimeSeconds: existing.defaultRestTimeSeconds ?? null,
          equipment: existing.equipment ?? null,
          isFavorite: existing.isFavorite,
        });
        this.kindValue.set(existing.kind);
      }
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, category, kind, defaultRestTimeSeconds, equipment, isFavorite } = this.form.getRawValue();
    try {
      await this.repository.save({
        id: this.exerciseId() ?? undefined,
        name,
        category,
        kind,
        defaultRestTimeSeconds: defaultRestTimeSeconds ?? null,
        equipment: equipment?.trim() ? equipment.trim() : null,
        isFavorite,
      });
      this.nameConflictError.set(null);
      await this.router.navigateByUrl('/tabs/workout/exercises');
    } catch (error) {
      if (error instanceof ExerciseNameConflictError) {
        // documentation/Architektúra/Névegyediség.md: quote the user's own typed name back, not the normalized form.
        this.nameConflictError.set(this.translate.instant('WORKOUT.EXERCISES.NAME_CONFLICT', { name }));
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.exerciseId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.EXERCISES.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.EXERCISES.DELETE_CONFIRM_MESSAGE', { name: this.form.controls.name.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/workout/exercises');
  }
}
