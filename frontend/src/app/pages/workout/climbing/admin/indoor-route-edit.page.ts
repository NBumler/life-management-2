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

import { IndoorRoute } from '../../../../api/model/indoorRoute';
import { IndoorRouteRepository, IndoorRouteSaveInput } from '../../../../core/data/indoor-route.repository';
import { ClimbingDiscipline, parseGrade } from '../grade-scale';

/**
 * documentation/Subfeatures/Indoor köteles admin.md "IndoorRoute (opcionális)" — the fixed
 * indoor-route catalogue editor. The grade is parsed with the shared parser at the row's own
 * discipline; the matrix `absoluteDifficultyIndex` is stored (server never recomputes it). No
 * uniqueness rule.
 */
@Component({
  selector: 'app-indoor-route-edit',
  templateUrl: 'indoor-route-edit.page.html',
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
export class IndoorRouteEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(IndoorRouteRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly disciplines = Object.values(IndoorRoute.DisciplineEnum);

  readonly routeId = signal<string | null>(null);
  readonly gymId = signal<string>('');

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    discipline: this.fb.nonNullable.control<IndoorRoute.DisciplineEnum>(IndoorRoute.DisciplineEnum.Rope),
    grade: this.fb.nonNullable.control('', [Validators.required]),
    sector: this.fb.control<string | null>(null),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly gradeParse = computed(() =>
    parseGrade(this.value().grade ?? '', (this.value().discipline ?? IndoorRoute.DisciplineEnum.Rope) as ClimbingDiscipline),
  );
  readonly gradeIndex = computed(() => (this.gradeParse().status === 'VALID' ? this.gradeParse().absoluteDifficultyIndex : null));

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    this.gymId.set(this.route.snapshot.parent?.paramMap.get('gymId') ?? '');

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((r) => r.id === idParam && !r.deleted);
      if (existing === undefined) {
        await this.navigateBack();
        return;
      }
      this.routeId.set(idParam);
      this.form.reset({
        name: existing.name,
        discipline: existing.discipline,
        grade: existing.grade,
        sector: existing.sector ?? null,
      });
    }
  }

  async save(): Promise<void> {
    const index = this.gradeIndex();
    if (this.form.invalid || index === null) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: IndoorRouteSaveInput = {
      id: this.routeId() ?? undefined,
      gymId: this.gymId(),
      name: v.name.trim(),
      discipline: v.discipline,
      grade: this.gradeParse().normalized,
      absoluteDifficultyIndex: index,
      sector: v.sector?.trim() ? v.sector.trim() : null,
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
      header: this.translate.instant('WORKOUT.CLIMBING.INDOOR_ROUTE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.INDOOR_ROUTE.DELETE_CONFIRM_MESSAGE'),
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
