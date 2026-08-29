import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { RouteRepository, RouteSaveInput } from '../../../../core/data/route.repository';

/**
 * documentation/Subfeatures/Outdoor köteles admin.md — the rope-route editor. `guidebookGrade` is a
 * raw guidebook string stored verbatim (the napló parses it, the server keeps no matrix index).
 * `lengthInMeters` / `totalPitches` / `rockType` / `aspect` are optional napló-prefill values.
 */
@Component({
  selector: 'app-route-edit',
  templateUrl: 'route-edit.page.html',
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
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(RouteRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly routeId = signal<string | null>(null);
  readonly cragId = signal<string>('');
  readonly sectorId = signal<string>('');

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    guidebookGrade: this.fb.nonNullable.control('', [Validators.required]),
    lengthInMeters: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    totalPitches: this.fb.control<number | null>(null, [Validators.min(1)]),
    rockType: this.fb.control<string | null>(null),
    aspect: this.fb.control<string | null>(null),
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    this.sectorId.set(this.route.snapshot.paramMap.get('sectorId') ?? '');
    this.cragId.set(this.route.snapshot.paramMap.get('cragId') ?? '');

    const idParam = this.route.snapshot.paramMap.get('routeId');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((r) => r.id === idParam && !r.deleted);
      if (existing === undefined) {
        await this.navigateBack();
        return;
      }
      this.routeId.set(idParam);
      this.form.reset({
        name: existing.name,
        guidebookGrade: existing.guidebookGrade,
        lengthInMeters: existing.lengthInMeters ?? null,
        totalPitches: existing.totalPitches ?? null,
        rockType: existing.rockType ?? null,
        aspect: existing.aspect ?? null,
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: RouteSaveInput = {
      id: this.routeId() ?? undefined,
      sectorId: this.sectorId(),
      name: v.name.trim(),
      guidebookGrade: v.guidebookGrade.trim(),
      lengthInMeters: v.lengthInMeters ?? null,
      totalPitches: v.totalPitches ?? null,
      rockType: v.rockType?.trim() ? v.rockType.trim() : null,
      aspect: v.aspect?.trim() ? v.aspect.trim() : null,
    };
    await this.repository.save(input);
    await this.navigateBack();
  }

  async delete(): Promise<void> {
    const id = this.routeId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.ROUTE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.ROUTE.DELETE_CONFIRM_MESSAGE'),
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
    return this.router.navigateByUrl(`/tabs/workout/climbing/admin/crags/${this.cragId()}/sectors/${this.sectorId()}`);
  }
}
