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

import { BoulderProblemRepository } from '../../../../core/data/boulder-problem.repository';
import { RouteRepository } from '../../../../core/data/route.repository';
import { SectorRepository, SectorSaveInput } from '../../../../core/data/sector.repository';

/**
 * documentation/Subfeatures/Outdoor boulder admin.md + Outdoor köteles admin.md — the sector editor.
 * `defaultAspect` is a free-text wall orientation inherited by routes and the napló; the crag link is
 * fixed at create time. On an existing sector the route and boulder-problem sub-lists are shown.
 */
@Component({
  selector: 'app-sector-edit',
  templateUrl: 'sector-edit.page.html',
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
export class SectorEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(SectorRepository);
  private readonly routeRepository = inject(RouteRepository);
  private readonly boulderProblemRepository = inject(BoulderProblemRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly sectorId = signal<string | null>(null);
  readonly cragId = signal<string>('');

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    defaultAspect: this.fb.control<string | null>(null),
  });

  readonly routes = computed(() => {
    const id = this.sectorId();
    return id ? this.routeRepository.forSector(id) : [];
  });
  readonly problems = computed(() => {
    const id = this.sectorId();
    return id ? this.boulderProblemRepository.forSector(id) : [];
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.routeRepository.load(), this.boulderProblemRepository.load()]);
    this.cragId.set(this.route.snapshot.paramMap.get('cragId') ?? '');

    const idParam = this.route.snapshot.paramMap.get('sectorId');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((sector) => sector.id === idParam && !sector.deleted);
      if (existing === undefined) {
        await this.navigateBack();
        return;
      }
      this.sectorId.set(idParam);
      this.form.reset({ name: existing.name, defaultAspect: existing.defaultAspect ?? null });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: SectorSaveInput = {
      id: this.sectorId() ?? undefined,
      cragId: this.cragId(),
      name: v.name.trim(),
      defaultAspect: v.defaultAspect?.trim() ? v.defaultAspect.trim() : null,
    };
    const saved = await this.repository.save(input);
    if (this.sectorId() === null) {
      await this.router.navigateByUrl(`/tabs/workout/climbing/admin/crags/${this.cragId()}/sectors/${saved.id}`);
    } else {
      await this.navigateBack();
    }
  }

  async delete(): Promise<void> {
    const id = this.sectorId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.SECTOR.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.SECTOR.DELETE_CONFIRM_MESSAGE'),
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
    return this.router.navigateByUrl(`/tabs/workout/climbing/admin/crags/${this.cragId()}`);
  }
}
