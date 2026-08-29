import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Gym } from '../../../../api/model/gym';
import { GymNameConflictError, GymRepository, GymSaveInput } from '../../../../core/data/gym.repository';
import { GymColorBandRepository } from '../../../../core/data/gym-color-band.repository';
import { IndoorRouteRepository } from '../../../../core/data/indoor-route.repository';

/**
 * documentation/Subfeatures/Indoor boulder admin.md + Indoor köteles admin.md — the gym editor.
 * `disciplines` is at least one of BOULDER / ROPE; the rope-only fields (default wall height, the
 * TOPROPE/LEAD safety styles — TRAD is never offered indoor) show only when ROPE is checked. On an
 * existing gym the colour-band list (boulder grade ranges) and the optional indoor-route catalogue
 * are shown as sub-lists that open their own editors.
 */
@Component({
  selector: 'app-gym-edit',
  templateUrl: 'gym-edit.page.html',
  styles: [
    '.swatch { display: inline-block; width: 1.25rem; height: 1.25rem; border-radius: 4px; margin-inline-end: 0.75rem; border: 1px solid var(--ion-color-step-300, #ccc); flex: none; }',
  ],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonInput,
    IonCheckbox,
    IonNote,
    IonIcon,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GymEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(GymRepository);
  private readonly bandRepository = inject(GymColorBandRepository);
  private readonly indoorRouteRepository = inject(IndoorRouteRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly gymId = signal<string | null>(null);
  readonly nameConflict = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    address: this.fb.control<string | null>(null),
    boulder: this.fb.nonNullable.control(true),
    rope: this.fb.nonNullable.control(false),
    defaultWallHeightMeters: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    toprope: this.fb.nonNullable.control(true),
    lead: this.fb.nonNullable.control(true),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly isRope = computed(() => this.value().rope === true);
  readonly hasDiscipline = computed(() => this.value().boulder === true || this.value().rope === true);

  readonly bands = computed(() => {
    const id = this.gymId();
    return id ? this.bandRepository.forGym(id) : [];
  });
  readonly indoorRoutes = computed(() => {
    const id = this.gymId();
    return id ? this.indoorRouteRepository.forGym(id) : [];
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.bandRepository.load(), this.indoorRouteRepository.load()]);

    const idParam = this.route.snapshot.paramMap.get('gymId');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((gym) => gym.id === idParam && !gym.deleted);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/climbing/admin/gyms');
        return;
      }
      this.gymId.set(idParam);
      this.form.reset({
        name: existing.name,
        address: existing.address ?? null,
        boulder: existing.disciplines.includes(Gym.DisciplinesEnum.Boulder),
        rope: existing.disciplines.includes(Gym.DisciplinesEnum.Rope),
        defaultWallHeightMeters: existing.defaultWallHeightMeters ?? null,
        toprope: (existing.availableSafetyStyles ?? []).includes(Gym.AvailableSafetyStylesEnum.Toprope),
        lead: (existing.availableSafetyStyles ?? []).includes(Gym.AvailableSafetyStylesEnum.Lead),
      });
    }
  }

  async save(): Promise<void> {
    this.nameConflict.set(false);
    if (this.form.invalid || !this.hasDiscipline()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const disciplines: Gym.DisciplinesEnum[] = [];
    if (v.boulder) {
      disciplines.push(Gym.DisciplinesEnum.Boulder);
    }
    if (v.rope) {
      disciplines.push(Gym.DisciplinesEnum.Rope);
    }
    const safetyStyles: Gym.AvailableSafetyStylesEnum[] = [];
    if (v.toprope) {
      safetyStyles.push(Gym.AvailableSafetyStylesEnum.Toprope);
    }
    if (v.lead) {
      safetyStyles.push(Gym.AvailableSafetyStylesEnum.Lead);
    }
    const input: GymSaveInput = {
      id: this.gymId() ?? undefined,
      name: v.name.trim(),
      address: v.address?.trim() ? v.address.trim() : null,
      disciplines,
      defaultWallHeightMeters: v.rope ? (v.defaultWallHeightMeters ?? null) : null,
      availableSafetyStyles: v.rope ? safetyStyles : null,
    };
    try {
      const saved = await this.repository.save(input);
      // Stay on the page for a fresh gym so the colour-band / route sub-lists become usable.
      if (this.gymId() === null) {
        await this.router.navigateByUrl(`/tabs/workout/climbing/admin/gyms/${saved.id}`);
      } else {
        await this.router.navigateByUrl('/tabs/workout/climbing/admin/gyms');
      }
    } catch (error) {
      if (error instanceof GymNameConflictError) {
        this.nameConflict.set(true);
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.gymId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.GYM.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.GYM.DELETE_CONFIRM_MESSAGE'),
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
    await this.router.navigateByUrl('/tabs/workout/climbing/admin/gyms');
  }
}
