import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { StretchExercise } from '../../../api/model/stretchExercise';
import { StretchExerciseNameConflictError, StretchExerciseRepository } from '../../../core/data/stretch-exercise.repository';
import { ExerciseType } from './catalog-filter';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_LABEL_KEYS } from './exercise-labels';

/** Default hold of a new stretching exercise — the `stretch_exercise.default_hold_seconds` column default. */
export const DEFAULT_STRETCH_HOLD_SECONDS = 30;

/**
 * documentation/Subfeatures/Gyakorlat.md "Entitás — StretchExercise" (backlog/167): name, category,
 * description, equipment, favourite + the default hold / per-side that prefill a stretching-template
 * item. Route `exercises/stretch/:id` (`new` = create). On create the Erősítés | Nyújtás segment swaps
 * back to ExerciseEditPage; on edit the type is fixed (separate entities).
 */
@Component({
  selector: 'app-stretch-exercise-edit',
  templateUrl: 'stretch-exercise-edit.page.html',
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
    IonLabel,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StretchExerciseEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  // backlog/148: leave with navigateBack so this page is popped off the Ionic stack.
  private readonly navController = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(StretchExerciseRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly categories = EXERCISE_CATEGORIES;
  readonly categoryLabelKeys = EXERCISE_CATEGORY_LABEL_KEYS;

  readonly exerciseId = signal<string | null>(null);
  readonly nameConflictError = signal<string | null>(null);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    category: this.fb.nonNullable.control<StretchExercise.CategoryEnum>(StretchExercise.CategoryEnum.Legs, [Validators.required]),
    defaultHoldSeconds: this.fb.nonNullable.control<number>(DEFAULT_STRETCH_HOLD_SECONDS, [Validators.required, Validators.min(1)]),
    defaultPerSide: this.fb.nonNullable.control(false),
    equipment: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null, [Validators.maxLength(1000)]),
    isFavorite: this.fb.nonNullable.control(false),
  });

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
          defaultHoldSeconds: existing.defaultHoldSeconds,
          defaultPerSide: existing.defaultPerSide,
          equipment: existing.equipment ?? null,
          description: existing.description ?? null,
          isFavorite: existing.isFavorite,
        });
      }
    }
  }

  async onTypeChange(type: ExerciseType): Promise<void> {
    if (type === 'STRENGTH') {
      await this.navController.navigateForward('/tabs/workout/exercises/new', { replaceUrl: true, animated: false });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, category, defaultHoldSeconds, defaultPerSide, equipment, description, isFavorite } = this.form.getRawValue();
    try {
      await this.repository.save({
        id: this.exerciseId() ?? undefined,
        name,
        category,
        defaultHoldSeconds: Math.round(Number(defaultHoldSeconds)),
        defaultPerSide,
        equipment: equipment?.trim() ? equipment.trim() : null,
        description: description?.trim() ? description.trim() : null,
        isFavorite,
      });
      this.nameConflictError.set(null);
      await this.navController.navigateBack('/tabs/workout/exercises');
    } catch (error) {
      if (error instanceof StretchExerciseNameConflictError) {
        this.nameConflictError.set(this.translate.instant('WORKOUT.EXERCISES.STRETCH.NAME_CONFLICT', { name }));
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
      header: this.translate.instant('WORKOUT.EXERCISES.STRETCH.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.EXERCISES.STRETCH.DELETE_CONFIRM_MESSAGE', { name: this.form.controls.name.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.navController.navigateBack('/tabs/workout/exercises');
  }
}
