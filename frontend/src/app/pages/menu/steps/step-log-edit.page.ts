import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { DailyStepLogRepository } from '../../../core/data/daily-step-log.repository';
import { today } from '../../../shared/local-date';

const TRACKER_URL = '/tabs/menu/steps';

/**
 * documentation/Subfeatures/Lépésszám kézzel manuálisan megadása.md — the per-day manual editor.
 * A manual save always overwrites the stored `stepCount` for the chosen date, larger or smaller.
 * `?date=YYYY-MM-DD` selects the day (default: today).
 */
@Component({
  selector: 'app-step-log-edit',
  templateUrl: 'step-log-edit.page.html',
  imports: [
    FormsModule,
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
export class StepLogEditPage implements OnInit, ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(DailyStepLogRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly todayIso = today();
  readonly date = signal(today());
  readonly stepCount = signal<number | null>(null);
  readonly saving = signal(false);

  readonly existingRow = computed(() => this.repository.items().find((log) => !log.deleted && log.date === this.date()) ?? null);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    this.applyDate(dateParam ?? today());
  }

  ionViewWillEnter(): void {
    void this.ngOnInit();
  }

  private applyDate(date: string): void {
    this.date.set(date);
    // storedStepsForDay (not `stepsForDay(date) || null`) so a day explicitly saved with 0 steps
    // loads as 0, editable and re-savable, instead of a blank input indistinguishable from "no entry".
    this.stepCount.set(this.repository.storedStepsForDay(date));
  }

  onDateChange(value: string): void {
    if (value) {
      this.applyDate(value);
    }
  }

  setStepCount(value: string | number | null | undefined): void {
    this.stepCount.set(value === null || value === undefined || value === '' ? null : Number(value));
  }

  get canSave(): boolean {
    const value = this.stepCount();
    return value !== null && Number.isFinite(value) && value >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(this.date());
  }

  async save(): Promise<void> {
    const value = this.stepCount();
    if (value === null || !this.canSave || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await this.repository.saveManual(this.date(), value);
      await this.router.navigateByUrl(TRACKER_URL);
    } finally {
      this.saving.set(false);
    }
  }

  async delete(): Promise<void> {
    const row = this.existingRow();
    if (row === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('STEPS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('STEPS.DELETE_CONFIRM_MESSAGE', { date: this.date() }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.deleteAndBack(row.id),
        },
      ],
    });
    await alert.present();
  }

  private async deleteAndBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl(TRACKER_URL);
  }
}
