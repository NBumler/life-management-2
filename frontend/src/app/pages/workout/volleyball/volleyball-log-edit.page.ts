import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
  IonTextarea,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { VolleyballLog } from '../../../api/model/volleyballLog';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { VolleyballLogRepository, VolleyballLogSaveInput } from '../../../core/data/volleyball-log.repository';
import { today } from '../../../shared/local-date';
import { VOLLEYBALL_INTENSITIES, VOLLEYBALL_MAX_DURATION_MINUTES, volleyballKcal } from './volleyball-metrics';

/**
 * documentation/Features/Röplabda napló.md — the create/edit form (route param `id` is an existing
 * log's uuid or the literal `new`). Only the on-court minutes drive the kcal (capped at 240); the
 * optional intensity / sets / notes are statistics only, which the form states explicitly. Live kcal
 * preview at the current profile weight, labelled as a conservative estimate.
 */
@Component({
  selector: 'app-volleyball-log-edit',
  templateUrl: 'volleyball-log-edit.page.html',
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
    IonTextarea,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolleyballLogEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  // backlog/148: leave with navigateBack (never a forward navigateByUrl to the list) so this page is popped
  // off the Ionic stack — otherwise the next visit to the same URL reuses this instance with its stale state.
  private readonly navController = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(VolleyballLogRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly intensities = VOLLEYBALL_INTENSITIES;
  readonly maxDurationMinutes = VOLLEYBALL_MAX_DURATION_MINUTES;
  readonly logId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    durationMinutes: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(VOLLEYBALL_MAX_DURATION_MINUTES),
    ]),
    intensity: this.fb.control<VolleyballLog.IntensityEnum | null>(null),
    setsPlayed: this.fb.control<number | null>(null, [Validators.min(1)]),
    notes: this.fb.control<string | null>(null),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly previewKcal = computed(() =>
    volleyballKcal(
      { durationMinutes: this.value().durationMinutes ?? 0 },
      this.profileRepository.profile()?.currentWeightKg ?? null,
    ),
  );

  readonly hasBodyWeight = computed(() => (this.profileRepository.profile()?.currentWeightKg ?? null) !== null);

  /** A plain method, not a `computed`: `touched` is not a signal, so a computed would never re-run after save(). */
  showDurationError(): boolean {
    const control = this.form.controls.durationMinutes;
    return control.touched && control.invalid;
  }

  async ngOnInit(): Promise<void> {
    await this.profileRepository.load();
    if (!this.repository.loaded()) {
      await this.repository.load();
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((log) => log.id === idParam && !log.deleted);
      if (existing === undefined) {
        await this.navController.navigateBack('/tabs/workout/volleyball');
        return;
      }
      this.logId.set(idParam);
      this.form.reset({
        date: existing.date,
        durationMinutes: existing.durationMinutes,
        intensity: existing.intensity ?? null,
        setsPlayed: existing.setsPlayed ?? null,
        notes: existing.notes ?? null,
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: VolleyballLogSaveInput = {
      id: this.logId() ?? undefined,
      date: value.date,
      durationMinutes: value.durationMinutes ?? 0,
      intensity: value.intensity ?? null,
      setsPlayed: value.setsPlayed ?? null,
      notes: value.notes ?? null,
    };
    await this.repository.save(input);
    await this.navController.navigateBack('/tabs/workout/volleyball');
  }

  async delete(): Promise<void> {
    const id = this.logId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.VOLLEYBALL.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.VOLLEYBALL.DELETE_CONFIRM_MESSAGE'),
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
    await this.navController.navigateBack('/tabs/workout/volleyball');
  }
}
