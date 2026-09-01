import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { stepKcalForDay } from '../../../core/data/activity-kcal';
import { DailyStepLogRepository } from '../../../core/data/daily-step-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { ActivityStepSyncService } from '../../../core/health/activity-step-sync.service';
import { today } from '../../../shared/local-date';

/**
 * documentation/Features/Lépésszám követés.md — the step-tracking shell screen (Menü tab). The
 * today value is highlighted and editable inline with an explicit save; past days are listed and
 * open the per-day editor. There is no tracking on/off switch.
 */
@Component({
  selector: 'app-step-tracker',
  templateUrl: 'step-tracker.page.html',
  imports: [
    DatePipe,
    FormsModule,
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
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepTrackerPage implements OnInit, ViewWillEnter {
  private readonly repository = inject(DailyStepLogRepository);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly stepSync = inject(ActivityStepSyncService);
  private readonly router = inject(Router);

  readonly syncPermission = this.stepSync.permission;
  readonly lastSyncAt = this.stepSync.lastSyncAt;

  readonly todayIso = today();
  readonly todayInput = signal<number | null>(null);
  readonly saving = signal(false);

  readonly pastDays = computed(() =>
    this.repository
      .items()
      .filter((log) => !log.deleted && log.date !== this.todayIso)
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  /** Today's step-calorie contribution to the Étkezés allowance, or null when profile weight is missing. */
  readonly todayKcal = computed(() => {
    const weight = this.profileRepository.profile()?.currentWeightKg ?? null;
    if (weight === null || weight <= 0) {
      return null;
    }
    return Math.round(stepKcalForDay(this.repository.items(), this.todayIso, weight));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.profileRepository.load()]);
    // storedStepsForDay, not `stepsForDay(...) || null`: a stored 0 must prefill as 0, not blank.
    this.todayInput.set(this.repository.storedStepsForDay(this.todayIso));
  }

  ionViewWillEnter(): void {
    void this.ngOnInit();
  }

  setTodayInput(value: string | number | null | undefined): void {
    this.todayInput.set(value === null || value === undefined || value === '' ? null : Number(value));
  }

  get canSaveToday(): boolean {
    const value = this.todayInput();
    return value !== null && Number.isFinite(value) && value >= 0;
  }

  async saveToday(): Promise<void> {
    const value = this.todayInput();
    if (value === null || !this.canSaveToday || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await this.repository.saveManual(this.todayIso, value);
    } finally {
      this.saving.set(false);
    }
  }

  async grantHealthConnect(): Promise<void> {
    await this.stepSync.requestPermission();
  }

  editDay(date: string): void {
    void this.router.navigate(['/tabs/menu/steps/edit'], { queryParams: { date } });
  }

  addOtherDay(): void {
    void this.router.navigate(['/tabs/menu/steps/edit']);
  }
}
