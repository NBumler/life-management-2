import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GymColorBand } from '../../../../api/model/gymColorBand';
import { GymColorBandHexConflictError, GymColorBandRepository, GymColorBandSaveInput } from '../../../../core/data/gym-color-band.repository';
import { parseGrade } from '../grade-scale';

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * documentation/Subfeatures/Indoor boulder admin.md — the colour-band editor. `hexColor` must be a
 * 3/6-digit CSS hex and unique among the gym's live bands on its canonical form
 * (`shared/hex-color-normalization.ts`). The grade bounds are parsed with the shared boulder grade
 * parser; the resulting `absoluteDifficultyIndex{Lower,Upper}` from the matrix are what gets stored
 * (the server never recomputes them).
 */
@Component({
  selector: 'app-gym-color-band-edit',
  templateUrl: 'gym-color-band-edit.page.html',
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
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GymColorBandEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(GymColorBandRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly variants = Object.values(GymColorBand.VariantEnum);

  readonly bandId = signal<string | null>(null);
  readonly gymId = signal<string>('');
  readonly hexConflict = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    hexColor: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(HEX_PATTERN)]),
    variant: this.fb.nonNullable.control<GymColorBand.VariantEnum>(GymColorBand.VariantEnum.Neutral),
    gradeLower: this.fb.nonNullable.control('', [Validators.required]),
    gradeUpper: this.fb.nonNullable.control('', [Validators.required]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly lowerParse = computed(() => parseGrade(this.value().gradeLower ?? '', 'BOULDER'));
  readonly upperParse = computed(() => parseGrade(this.value().gradeUpper ?? '', 'BOULDER'));
  readonly lowerIndex = computed(() =>
    this.lowerParse().status === 'VALID' ? this.lowerParse().absoluteDifficultyIndex : null,
  );
  readonly upperIndex = computed(() =>
    this.upperParse().status === 'VALID' ? this.upperParse().absoluteDifficultyIndex : null,
  );
  readonly gradesValid = computed(() => this.lowerIndex() !== null && this.upperIndex() !== null);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    this.gymId.set(this.route.snapshot.parent?.paramMap.get('gymId') ?? '');

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((band) => band.id === idParam && !band.deleted);
      if (existing === undefined) {
        await this.navigateBack();
        return;
      }
      this.bandId.set(idParam);
      this.form.reset({
        name: existing.name,
        hexColor: existing.hexColor,
        variant: existing.variant,
        gradeLower: existing.gradeLower,
        gradeUpper: existing.gradeUpper,
      });
    }
  }

  async save(): Promise<void> {
    this.hexConflict.set(false);
    const lower = this.lowerIndex();
    const upper = this.upperIndex();
    if (this.form.invalid || lower === null || upper === null) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: GymColorBandSaveInput = {
      id: this.bandId() ?? undefined,
      gymId: this.gymId(),
      name: v.name.trim(),
      hexColor: v.hexColor,
      variant: v.variant,
      gradeLower: this.lowerParse().normalized,
      gradeUpper: this.upperParse().normalized,
      absoluteDifficultyIndexLower: lower,
      absoluteDifficultyIndexUpper: upper,
    };
    try {
      await this.repository.save(input);
      await this.navigateBack();
    } catch (error) {
      if (error instanceof GymColorBandHexConflictError) {
        this.hexConflict.set(true);
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.bandId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.BAND.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.BAND.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            void this.repository.remove(id).then(() => this.navigateBack());
          },
        },
      ],
    });
    await alert.present();
  }

  private navigateBack(): Promise<boolean> {
    return this.router.navigateByUrl(`/tabs/workout/climbing/admin/gyms/${this.gymId()}`);
  }
}
