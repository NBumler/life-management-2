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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { LifePlan } from '../../../api/model/lifePlan';
import { LifePlanRepository } from '../../../core/data/life-plan.repository';

/**
 * documentation/Subfeatures/Élet tervek.md: create + edit in one page (route param `id` is either
 * an existing plan's uuid or the literal `new`) — title/status/targetDate/notes form, delete
 * (existing only). Mirrors PackingTemplateEditorPage's route/title/delete pattern.
 */
@Component({
  selector: 'app-life-plan-edit',
  templateUrl: 'life-plan-edit.page.html',
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifePlanEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(LifePlanRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly StatusEnum = LifePlan.StatusEnum;
  readonly planId = signal<string | null>(null);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    status: this.fb.nonNullable.control<LifePlan.StatusEnum>(LifePlan.StatusEnum.Planned, [Validators.required]),
    targetDate: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.planId.set(idParam);
      const existing = this.repository.items().find((plan) => plan.id === idParam);
      if (existing !== undefined) {
        this.form.reset({
          title: existing.title,
          status: existing.status,
          targetDate: existing.targetDate ?? null,
          notes: existing.notes ?? null,
        });
      }
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, status, targetDate, notes } = this.form.getRawValue();
    await this.repository.save({ id: this.planId() ?? undefined, title, status, targetDate: targetDate ?? null, notes: notes ?? null });
    await this.router.navigateByUrl('/tabs/tasks/life-plans');
  }

  async delete(): Promise<void> {
    const id = this.planId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.LIFE_PLANS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('TASKS.LIFE_PLANS.DELETE_CONFIRM_MESSAGE', { title: this.form.controls.title.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/tasks/life-plans');
  }
}
