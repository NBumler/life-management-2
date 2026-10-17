import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { StretchExercise } from '../../../api/model/stretchExercise';
import { StretchPlan } from '../../../api/model/stretchPlan';
import { StretchPlanItem } from '../../../api/model/stretchPlanItem';
import { StretchPlanRepository, liveStretchItems } from '../../../core/data/stretch-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { StretchPlanDraft } from '../../../core/storage/storage-backend';
import { uuidV4 } from '../../../core/sync/uuid';
import { StretchPickerComponent } from '../../../shared/stretch-picker/stretch-picker.component';
import { EXERCISE_CATEGORY_LABEL_KEYS } from '../exercises/exercise-labels';
import { moveById } from '../log/workout-fields';
import { stretchPlanDurationMinutes } from '../stretch/stretch-timing';

/** backlog/168 — `StretchPlanItem.notes` max length (the V58 CHECK). */
export const STRETCH_ITEM_NOTES_MAX = 200;

interface StretchItemRow {
  id: string;
  stretchExerciseId: string;
  stretchName: string;
  stretchCategory: StretchPlanItem.StretchCategoryEnum;
  holdSeconds: WritableSignal<number>;
  perSide: WritableSignal<boolean>;
  repetitions: WritableSignal<number>;
  notes: WritableSignal<string>;
}

/**
 * documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" (backlog/168) — route `weekly-plan/plans/stretch/:id`
 * (`new` = create). Name, goal label, notes; an ordered item list (stretch picker, up / down, remove),
 * per item hold (s), per side, repetitions and a short cue. A picked item is prefilled from the stretching
 * exercise's own defaults and keeps its own copy afterwards. Footer: the plan's total time.
 */
@Component({
  selector: 'app-stretch-plan-edit',
  templateUrl: 'stretch-plan-edit.page.html',
  styles: [
    `
    .item-head {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .item-head ion-label {
      flex: 1;
    }
    .item-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 8px;
    }
    .total {
      padding: 12px 16px;
      color: var(--ion-color-medium);
    }
  `,
  ],
  imports: [
    ReactiveFormsModule,
    StretchPickerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonLabel,
    IonNote,
    IonTextarea,
    IonToggle,
    IonModal,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StretchPlanEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  // backlog/148: leave with navigateBack so this page is popped off the Ionic stack.
  private readonly navController = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(StretchPlanRepository);
  private readonly workoutPlanRepository = inject(WorkoutPlanRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly categoryLabelKeys = EXERCISE_CATEGORY_LABEL_KEYS;
  readonly notesMax = STRETCH_ITEM_NOTES_MAX;

  readonly planId = signal<string | null>(null);
  private active = true;
  readonly items = signal<StretchItemRow[]>([]);
  readonly pickerOpen = signal(false);
  readonly isEditing = computed(() => this.planId() !== null);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(1)]),
    goalLabel: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  readonly totalMinutes = computed(() =>
    stretchPlanDurationMinutes(
      this.items().map((row) => ({ holdSeconds: row.holdSeconds(), perSide: row.perSide(), repetitions: row.repetitions() })),
    ),
  );

  /** Every item needs a hold ≥ 1 s and ≥ 1 repetition (the V58 CHECKs) — save is blocked otherwise. */
  readonly hasItemErrors = computed(() =>
    this.items().some((row) => !(row.holdSeconds() >= 1) || !(row.repetitions() >= 1)),
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.workoutPlanRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.byId(idParam);
      if (existing === undefined) {
        await this.navController.navigateBack('/tabs/workout/weekly-plan/plans');
        return;
      }
      this.planId.set(idParam);
      this.active = existing.active;
      this.form.reset({ name: existing.name, goalLabel: existing.goalLabel ?? null, notes: existing.notes ?? null });
      this.items.set(this.rowsFromPlan(existing));
    }
  }

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onPicked(stretches: StretchExercise[]): void {
    this.pickerOpen.set(false);
    this.items.update((current) => [...current, ...stretches.map((stretch) => this.rowFromExercise(stretch))]);
  }

  moveItem(row: StretchItemRow, delta: -1 | 1): void {
    this.items.update((rows) => moveById(rows, row.id, delta));
  }

  removeItem(row: StretchItemRow): void {
    this.items.update((rows) => rows.filter((entry) => entry.id !== row.id));
  }

  setNumber(field: WritableSignal<number>, raw: unknown): void {
    const value = Math.round(Number(raw));
    field.set(Number.isFinite(value) ? value : 0);
  }

  async save(): Promise<void> {
    if (this.hasItemErrors()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const saved = await this.repository.save(this.buildDraft());
    this.planId.set(saved.id);
    await this.navController.navigateBack('/tabs/workout/weekly-plan/plans');
  }

  /** backlog/170 — live strength templates that have this stretching template attached. */
  linkedStrengthCount(id: string): number {
    return this.workoutPlanRepository.items().filter((plan) => !plan.deleted && plan.stretchPlanId === id).length;
  }

  async delete(): Promise<void> {
    const id = this.planId();
    if (id === null) {
      return;
    }
    const linked = this.linkedStrengthCount(id);
    const message = this.translate.instant('WORKOUT.STRETCH_PLAN.DELETE_CONFIRM_MESSAGE');
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.STRETCH_PLAN.DELETE_CONFIRM_TITLE'),
      message: linked > 0 ? `${message} ${this.translate.instant('WORKOUT.STRETCH_PLAN.DELETE_LINKED', { count: linked })}` : message,
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.navController.navigateBack('/tabs/workout/weekly-plan/plans');
  }

  buildDraft(): StretchPlanDraft {
    const value = this.form.getRawValue();
    return {
      id: this.planId() ?? '',
      name: value.name.trim(),
      notes: value.notes?.trim() ? value.notes.trim() : null,
      active: this.active,
      goalLabel: value.goalLabel?.trim() ? value.goalLabel.trim() : null,
      items: this.items().map((row, orderIndex) => ({
        id: row.id,
        stretchExerciseId: row.stretchExerciseId,
        stretchName: row.stretchName,
        stretchCategory: row.stretchCategory,
        orderIndex,
        holdSeconds: row.holdSeconds(),
        perSide: row.perSide(),
        repetitions: row.repetitions(),
        notes: row.notes().trim() ? row.notes().trim().slice(0, STRETCH_ITEM_NOTES_MAX) : null,
      })),
    };
  }

  private rowsFromPlan(plan: StretchPlan): StretchItemRow[] {
    return liveStretchItems(plan).map((item) => ({
      id: item.id,
      stretchExerciseId: item.stretchExerciseId,
      stretchName: item.stretchName,
      stretchCategory: item.stretchCategory,
      holdSeconds: signal(item.holdSeconds),
      perSide: signal(item.perSide),
      repetitions: signal(item.repetitions),
      notes: signal(item.notes ?? ''),
    }));
  }

  /** backlog/167 — a new item is prefilled from the stretching exercise's own defaults. */
  private rowFromExercise(stretch: StretchExercise): StretchItemRow {
    return {
      id: uuidV4(),
      stretchExerciseId: stretch.id,
      stretchName: stretch.name,
      stretchCategory: stretch.category as StretchPlanItem.StretchCategoryEnum,
      holdSeconds: signal(stretch.defaultHoldSeconds),
      perSide: signal(stretch.defaultPerSide),
      repetitions: signal(1),
      notes: signal(''),
    };
  }
}
