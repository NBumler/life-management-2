import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BikeLiveSessionService } from '../../../core/data/bike-live-session.service';
import { BikeRideLogRepository, BikeRideLogSaveInput } from '../../../core/data/bike-ride-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH, ROAD_CIRCUITY_FACTOR } from '../../../core/geo/tracking-config';
import { HelpButtonComponent } from '../../../shared/help-button/help-button.component';
import { today } from '../../../shared/local-date';
import { BIKE_INTENSITIES, avgSpeedKmH, bikeKcal, suggestedIntensity } from '../../../shared/workout/bike-metrics';
import { bikeLiveHelpParams } from './bike-live-start.component';

/**
 * documentation/Features/Biciklizés napló.md — the create/edit form (route param `id` is an existing
 * ride's uuid or the literal `new`). distanceKm + elevationGainMeters are optional and independent
 * (no pairing rule, unlike the swim pool fields). When distance + duration are both present the UI
 * shows the avg-speed and a soft MET-category suggestion that never overrides the user's pick. Live
 * kcal preview from the canonical MET formula at the current profile weight.
 *
 * backlog/150 — on `cycling/live/summary` (route data `liveSummary`) the same form is the live ride's
 * editable summary: pre-filled from `BikeLiveSessionService.summary()`, saved under the ride's id with
 * `trackingMode` / `startedAt` through the same repository, then the live draft is cleared; "Elvetés"
 * (confirmed) drops it instead. A Becsült estimate is marked ("durva becslés" for the straight-line
 * fallback), and an implausibly slow one asks for the distance — it stays pre-filled, overridable or
 * clearable. Editing a saved ride keeps its `trackingMode` / `startedAt`.
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
    HelpButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BikeRideLogEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  // backlog/148: leave with navigateBack (never a forward navigateByUrl to the list) so this page is popped
  // off the Ionic stack — otherwise the next visit to the same URL reuses this instance with its stale state.
  private readonly navController = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(BikeRideLogRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly live = inject(BikeLiveSessionService);

  readonly intensities = BIKE_INTENSITIES;
  readonly logId = signal<string | null>(null);
  readonly liveSummary = this.route.snapshot.data?.['liveSummary'] === true;
  /** True while the live summary's distance / elevation are being computed. */
  readonly summaryLoading = signal(false);
  /** Becsült summary: how the distance was estimated (`ROUGH` = "durva becslés", `NONE` = no endpoint fix) and whether it failed the plausibility check. */
  readonly liveEstimate = signal<'ROUTED' | 'ROUGH' | 'NONE' | null>(null);
  readonly liveImplausible = signal(false);
  readonly circuityFactor = ROAD_CIRCUITY_FACTOR;
  readonly minPlausibleSpeedKmh = MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH;
  /** The summary's help explains the ride's own mode (`liveEstimate` is set only for a Becsült ride). */
  readonly helpParams = bikeLiveHelpParams(inject(LOCALE_ID));
  private liveRideId: string | null = null;
  private trackingMode: BikeRideLog.TrackingModeEnum | undefined;
  private startedAt: string | null = null;

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

    if (this.liveSummary) {
      await this.loadLiveSummary();
      return;
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((log) => log.id === idParam && !log.deleted);
      if (existing === undefined) {
        await this.navController.navigateBack('/tabs/workout/cycling');
        return;
      }
      this.logId.set(idParam);
      this.trackingMode = existing.trackingMode ?? undefined;
      this.startedAt = existing.startedAt ?? null;
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
      id: this.logId() ?? this.liveRideId ?? undefined,
      date: value.date,
      durationMinutes: value.durationMinutes ?? 0,
      intensity: value.intensity,
      distanceKm: value.distanceKm ?? null,
      elevationGainMeters: value.elevationGainMeters ?? null,
      trackingMode: this.trackingMode,
      startedAt: this.startedAt,
    };
    await this.repository.save(input);
    if (this.liveSummary) {
      await this.live.clear();
    }
    await this.navController.navigateBack('/tabs/workout/cycling');
  }

  async discardLive(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.BIKE.LIVE.DISCARD_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.BIKE.LIVE.DISCARD_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('WORKOUT.BIKE.LIVE.DISCARD'),
          role: 'destructive',
          handler: () => void this.discardLiveAndNavigateBack(),
        },
      ],
    });
    await alert.present();
  }

  private async loadLiveSummary(): Promise<void> {
    const draft = await this.live.refresh();
    if (draft === null || draft.endedAtMs === null) {
      await this.navController.navigateBack('/tabs/workout/cycling');
      return;
    }
    this.summaryLoading.set(true);
    try {
      const summary = await this.live.summary();
      if (summary === null) {
        return;
      }
      this.liveRideId = summary.id;
      this.trackingMode = summary.trackingMode;
      this.startedAt = summary.startedAt;
      this.liveEstimate.set(summary.trackingMode === BikeRideLog.TrackingModeEnum.Estimated ? (summary.estimate ?? 'NONE') : null);
      this.liveImplausible.set(summary.implausible);
      this.form.reset({
        date: summary.date,
        durationMinutes: summary.durationMinutes,
        intensity: BikeRideLog.IntensityEnum.City,
        distanceKm: summary.distanceKm,
        elevationGainMeters: summary.elevationGainMeters,
      });
    } finally {
      this.summaryLoading.set(false);
    }
  }

  private async discardLiveAndNavigateBack(): Promise<void> {
    await this.live.clear();
    await this.navController.navigateBack('/tabs/workout/cycling');
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
    await this.navController.navigateBack('/tabs/workout/cycling');
  }
}
