import { DecimalPipe } from '@angular/common';
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

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BikeRideLogRepository, BikeRideLogSaveInput } from '../../../core/data/bike-ride-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { today } from '../../../shared/local-date';
import { BIKE_INTENSITIES, avgSpeedKmH, bikeKcal, suggestedIntensity } from './bike-metrics';

/**
 * documentation/Features/Biciklizés napló.md — the create/edit form (route param `id` is an existing
 * ride's uuid or the literal `new`). distanceKm + elevationGainMeters are optional and independent
 * (no pairing rule, unlike the swim pool fields). When distance + duration are both present the UI
 * shows the avg-speed and a soft MET-category suggestion that never overrides the user's pick. Live
 * kcal preview from the canonical MET formula at the current profile weight.
 */
@Component({
  selector: 'app-bike-ride-log-edit',
  templateUrl: 'bike-ride-log-edit.page.html',
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
export class BikeRideLogEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(BikeRideLogRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly intensities = BIKE_INTENSITIES;
  readonly logId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    durationMinutes: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    intensity: this.fb.nonNullable.control<BikeRideLog.IntensityEnum>(BikeRideLog.IntensityEnum.City),
    distanceKm: this.fb.control<number | null>(null, [Validators.min(0)]),
    elevationGainMeters: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly previewKcal = computed(() => {
    const v = this.value();
    return bikeKcal(
      { intensity: v.intensity ?? BikeRideLog.IntensityEnum.City, durationMinutes: v.durationMinutes ?? 0 },
      this.profileRepository.profile()?.currentWeightKg ?? null,
    );
  });

  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  readonly avgSpeedKmH = computed(() => {
    const v = this.value();
    return avgSpeedKmH({ distanceKm: v.distanceKm ?? null, durationMinutes: v.durationMinutes ?? null });
  });

  /** Soft hint: shown only when the speed maps to a different category than the current pick. */
  readonly suggestedIntensityKey = computed(() => {
    const suggested = suggestedIntensity(this.avgSpeedKmH());
    if (suggested === null || suggested === (this.value().intensity ?? BikeRideLog.IntensityEnum.City)) {
      return null;
    }
    return `WORKOUT.BIKE.INTENSITY.${suggested}`;
  });

  async ngOnInit(): Promise<void> {
    await this.profileRepository.load();
    if (!this.repository.loaded()) {
      await this.repository.load();
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((log) => log.id === idParam && !log.deleted);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/cycling');
        return;
      }
      this.logId.set(idParam);
      this.form.reset({
        date: existing.date,
        durationMinutes: existing.durationMinutes,
        intensity: existing.intensity,
        distanceKm: existing.distanceKm ?? null,
        elevationGainMeters: existing.elevationGainMeters ?? null,
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: BikeRideLogSaveInput = {
      id: this.logId() ?? undefined,
      date: value.date,
      durationMinutes: value.durationMinutes ?? 0,
      intensity: value.intensity,
      distanceKm: value.distanceKm ?? null,
      elevationGainMeters: value.elevationGainMeters ?? null,
    };
    await this.repository.save(input);
    await this.router.navigateByUrl('/tabs/workout/cycling');
  }

  async delete(): Promise<void> {
    const id = this.logId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.BIKE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.BIKE.DELETE_CONFIRM_MESSAGE'),
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
    await this.router.navigateByUrl('/tabs/workout/cycling');
  }
}
