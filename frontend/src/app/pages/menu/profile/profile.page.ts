import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { UserProfile } from '../../../api/model/userProfile';
import { WeightHistoryEntry } from '../../../api/model/weightHistoryEntry';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WeightHistoryRepository } from '../../../core/data/weight-history.repository';

function kgPerWeekRequiredValidator(control: AbstractControl): ValidationErrors | null {
  const goal = control.get('goal')?.value as UserProfile.GoalEnum | null;
  const kgPerWeek = control.get('kgPerWeek')?.value as number | null;
  const required = goal === UserProfile.GoalEnum.FatLoss || goal === UserProfile.GoalEnum.WeightGain;
  return required && (kgPerWeek === null || kgPerWeek === undefined) ? { kgPerWeekRequired: true } : null;
}

/**
 * documentation/Features/Profile.md: the weight fields map to `numeric(5,1)` columns. Reject more than
 * one decimal place on the client instead of leaning on the DB to truncate silently.
 */
function oneDecimalPlaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as number | string | null;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }
  const scaled = numeric * 10;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9 ? null : { oneDecimalPlace: true };
}

/** documentation/Features/Profile.md: one form, no live TDEE preview, plus the weight history CRUD list. */
@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonLabel,
    IonText,
    IonIcon,
    TranslatePipe,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly weightHistoryRepository = inject(WeightHistoryRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly SexEnum = UserProfile.SexEnum;
  readonly GoalEnum = UserProfile.GoalEnum;

  readonly form = this.fb.group(
    {
      birthDate: this.fb.control<string | null>(null),
      sex: this.fb.control<UserProfile.SexEnum | null>(null),
      heightCm: this.fb.control<number | null>(null, [Validators.min(100), Validators.max(250)]),
      currentWeightKg: this.fb.control<number | null>(null, [Validators.min(30), Validators.max(300), oneDecimalPlaceValidator]),
      goal: this.fb.control<UserProfile.GoalEnum | null>(null),
      kgPerWeek: this.fb.control<number | null>(null, [Validators.min(0.1), Validators.max(1.5)]),
      grossMonthlySalaryHuf: this.fb.control<number | null>(null, [Validators.min(0)]),
    },
    { validators: [kgPerWeekRequiredValidator] },
  );

  readonly goalValue = toSignal(this.form.controls.goal.valueChanges, { initialValue: this.form.controls.goal.value });
  readonly showKgPerWeek = computed(() => this.goalValue() !== UserProfile.GoalEnum.Maintenance);

  readonly savedRecently = signal(false);

  readonly entries = this.weightHistoryRepository.entries;
  readonly entryEditingId = signal<string | 'new' | null>(null);
  readonly entryForm = this.fb.group({
    recordedAt: this.fb.nonNullable.control<string>(nowForDatetimeLocal(), [Validators.required]),
    weightKg: this.fb.control<number | null>(null, [Validators.required, Validators.min(30), Validators.max(300), oneDecimalPlaceValidator]),
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.profileRepository.load(), this.weightHistoryRepository.load()]);
    const profile = this.profileRepository.profile();
    if (profile !== null) {
      this.form.patchValue(profile);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    await this.profileRepository.save({
      ...value,
      kgPerWeek: value.goal === UserProfile.GoalEnum.Maintenance ? null : value.kgPerWeek,
    });
    this.savedRecently.set(true);
    setTimeout(() => this.savedRecently.set(false), 2000);
  }

  startAddEntry(): void {
    this.entryForm.reset({ recordedAt: nowForDatetimeLocal(), weightKg: null });
    this.entryEditingId.set('new');
  }

  startEditEntry(entry: WeightHistoryEntry): void {
    this.entryForm.reset({ recordedAt: toDatetimeLocal(entry.recordedAt), weightKg: entry.weightKg });
    this.entryEditingId.set(entry.id);
  }

  cancelEntryEdit(): void {
    this.entryEditingId.set(null);
  }

  async saveEntry(): Promise<void> {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }
    const { recordedAt, weightKg } = this.entryForm.getRawValue();
    const editingId = this.entryEditingId();
    const isoRecordedAt = new Date(recordedAt).toISOString();
    if (editingId === 'new') {
      await this.weightHistoryRepository.add(isoRecordedAt, weightKg as number);
    } else if (editingId !== null) {
      await this.weightHistoryRepository.update(editingId, isoRecordedAt, weightKg as number);
    }
    this.entryEditingId.set(null);
  }

  async deleteEntry(entry: WeightHistoryEntry): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('PROFILE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('PROFILE.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.weightHistoryRepository.remove(entry.id) },
      ],
    });
    await alert.present();
  }
}

function nowForDatetimeLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
