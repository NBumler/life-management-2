import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CragRepository, CragSaveInput } from '../../../../core/data/crag.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';

/**
 * documentation/Subfeatures/Outdoor boulder admin.md — the crag editor. Optional GPS
 * (latitude/longitude, the only map data stored — map/photo UI is out of 2.0 scope) and a free-text
 * default rock type inherited by the outdoor napló. On an existing crag the sector sub-list is shown.
 */
@Component({
  selector: 'app-crag-edit',
  templateUrl: 'crag-edit.page.html',
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
    IonNote,
    IonIcon,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(CragRepository);
  private readonly sectorRepository = inject(SectorRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly cragId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
    longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    defaultRockType: this.fb.control<string | null>(null),
  });

  readonly sectors = computed(() => {
    const id = this.cragId();
    return id ? this.sectorRepository.forCrag(id) : [];
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.sectorRepository.load()]);

    const idParam = this.route.snapshot.paramMap.get('cragId');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((crag) => crag.id === idParam && !crag.deleted);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/workout/climbing/admin/crags');
        return;
      }
      this.cragId.set(idParam);
      this.form.reset({
        name: existing.name,
        latitude: existing.latitude ?? null,
        longitude: existing.longitude ?? null,
        defaultRockType: existing.defaultRockType ?? null,
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: CragSaveInput = {
      id: this.cragId() ?? undefined,
      name: v.name.trim(),
      latitude: v.latitude ?? null,
      longitude: v.longitude ?? null,
      defaultRockType: v.defaultRockType?.trim() ? v.defaultRockType.trim() : null,
    };
    const saved = await this.repository.save(input);
    if (this.cragId() === null) {
      await this.router.navigateByUrl(`/tabs/workout/climbing/admin/crags/${saved.id}`);
    } else {
      await this.router.navigateByUrl('/tabs/workout/climbing/admin/crags');
    }
  }

  async delete(): Promise<void> {
    const id = this.cragId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.CRAG.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.CRAG.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => {
            void this.repository.remove(id).then(() => this.router.navigateByUrl('/tabs/workout/climbing/admin/crags'));
          },
        },
      ],
    });
    await alert.present();
  }
}
