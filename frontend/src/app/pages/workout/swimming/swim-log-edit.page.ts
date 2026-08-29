import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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

import { SwimLog } from '../../../api/model/swimLog';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { SwimLogRepository, SwimLogSaveInput } from '../../../core/data/swim-log.repository';
import { today } from '../../../shared/local-date';
import { SWIM_INTENSITIES, isOpenWater, swimDistanceMeters, swimKcal } from './swim-metrics';

/**
 * documentation/Features/Úszás napló.md — the create/edit form (route param `id` is an existing
 * log's uuid or the literal `new`). Pool length + lap count are shown together for pool swims; for
 * OPEN_WATER they are hidden and an optional manual distance is offered instead. Live kcal preview
 * from the canonical MET formula at the current profile weight.
 */
@Component({
  selector: 'app-swim-log-edit',
  templateUrl: 'swim-log-edit.page.html',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
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
export class SwimLogEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(SwimLogRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly intensities = SWIM_INTENSITIES;
  readonly logId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      date: this.fb.nonNullable.control(today(), [Validators.required]),
      durationMinutes: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      intensity: this.fb.nonNullable.control<SwimLog.IntensityEnum>(SwimLog.IntensityEnum.Casual),
      poolLengthMeters: this.fb.control<number | null>(null, [Validators.min(1)]),
      lapCount: this.fb.control<number | null>(null, [Validators.min(1)]),
      distanceMeters: this.fb.control<number | null>(null, [Validators.min(0)]),
    },
    { validators: [poolFieldsPairedValidator] },
  );

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly isOpenWater = computed(() => isOpenWater(this.value().intensity ?? SwimLog.IntensityEnum.Casual));

  readonly previewKcal = computed(() => {
    const v = this.value();
    return swimKcal(
      { intensity: v.intensity ?? SwimLog.IntensityEnum.Casual, durationMinutes: v.durationMinutes ?? 0 },
      this.profileRepository.profile()?.currentWeightKg ?? null,
    );
  });

  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  readonly previewDistanceMeters = computed(() => {
    const v = this.value();
    if (isOpenWater(v.intensity ?? SwimLog.IntensityEnum.Casual)) {
      return null;
    }
    return swimDistanceMeters({
      poolLengthMeters: v.poolLengthMeters ?? null,
      lapCount: v.lapCount ?? null,
      distanceMeters: null,
    });
  });

  readonly showPoolPairError = computed(() => this.form.errors?.['poolFieldsUnpaired'] === true && this.form.touched);

  async ngOnInit(): Promise<void> {
    await this.profileRepository.load();
    if (!this.repository.loaded()) {
      await this.repository.load();
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((log) => log.id === idParam && !log.deleted);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/swimming');
        return;
      }
      this.logId.set(idParam);
      this.form.reset({
        date: existing.date,
        durationMinutes: existing.durationMinutes,
        intensity: existing.intensity,
        poolLengthMeters: existing.poolLengthMeters ?? null,
        lapCount: existing.lapCount ?? null,
        distanceMeters: existing.distanceMeters ?? null,
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: SwimLogSaveInput = {
      id: this.logId() ?? undefined,
      date: value.date,
      durationMinutes: value.durationMinutes ?? 0,
      intensity: value.intensity,
      poolLengthMeters: value.poolLengthMeters ?? null,
      lapCount: value.lapCount ?? null,
      distanceMeters: value.distanceMeters ?? null,
    };
    await this.repository.save(input);
    await this.router.navigateByUrl('/tabs/workout/swimming');
  }

  async delete(): Promise<void> {
    const id = this.logId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.SWIM.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.SWIM.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.deleteAndNavigateBack(id),
        },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/workout/swimming');
  }
}

/**
 * documentation/Features/Úszás napló.md "Medence mezők együtt": poolLengthMeters and lapCount are
 * both-or-neither. OPEN_WATER clears them in the repository, so this only fires for pool intensities.
 */
function poolFieldsPairedValidator(group: AbstractControl): ValidationErrors | null {
  const intensity = group.get('intensity')?.value as SwimLog.IntensityEnum | undefined;
  if (intensity === SwimLog.IntensityEnum.OpenWater) {
    return null;
  }
  const pool = group.get('poolLengthMeters')?.value;
  const laps = group.get('lapCount')?.value;
  const poolSet = pool !== null && pool !== undefined && pool !== '';
  const lapsSet = laps !== null && laps !== undefined && laps !== '';
  return poolSet === lapsSet ? null : { poolFieldsUnpaired: true };
}
