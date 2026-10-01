import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { today } from '../../../shared/local-date';
import { computeDefaultTimedTimes } from './event-time-defaults';

/**
 * documentation/Features/Események.md + documentation/Subfeatures/Új esemény hozzáadása.md:
 * create + edit in one page. Editing always applies to the whole series
 * ("Modell: egy sor = egy sorozat") — there is no "just this occurrence".
 */
@Component({
  selector: 'app-event-edit',
  templateUrl: 'event-edit.page.html',
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
    IonToggle,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(CalendarEventRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly FrequencyEnum = CalendarEvent.FrequencyEnum;
  readonly ActivityTypeEnum = CalendarEvent.ActivityTypeEnum;
  readonly eventId = signal<string | null>(null);
  readonly timeRangeError = signal<string | null>(null);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    allDay: this.fb.nonNullable.control<boolean>(false),
    date: this.fb.nonNullable.control<string>(today(), [Validators.required]),
    startTime: this.fb.control<string | null>(null),
    endTime: this.fb.control<string | null>(null),
    frequency: this.fb.control<CalendarEvent.FrequencyEnum | null>(null),
    interval: this.fb.nonNullable.control<number>(1, [Validators.min(1)]),
    location: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
    activityType: this.fb.control<CalendarEvent.ActivityTypeEnum | null>(null),
  });

  readonly allDayValue = toSignal(this.form.controls.allDay.valueChanges, { initialValue: this.form.controls.allDay.value });
  readonly frequencyValue = toSignal(this.form.controls.frequency.valueChanges, { initialValue: this.form.controls.frequency.value });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.eventId.set(idParam);
      const existing = this.repository.items().find((event) => event.id === idParam);
      if (existing !== undefined) {
        this.form.reset({
          title: existing.title,
          allDay: existing.allDay,
          date: existing.date,
          startTime: existing.startTime ?? null,
          endTime: existing.endTime ?? null,
          frequency: existing.frequency ?? null,
          interval: existing.interval,
          location: existing.location ?? null,
          notes: existing.notes ?? null,
          activityType: existing.activityType ?? null,
        });
      }
      return;
    }
    const now = new Date();
    const defaults = computeDefaultTimedTimes(now.getHours(), now.getMinutes());
    this.form.patchValue({ startTime: defaults.startTime, endTime: defaults.endTime });
    // backlog/143 — `?type=CLIMBING&date=…` (Heti terv) opens a prefilled planned-climb form.
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    if (dateParam !== null && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      this.form.patchValue({ date: dateParam });
    }
    if (this.route.snapshot.queryParamMap.get('type') === CalendarEvent.ActivityTypeEnum.Climbing) {
      this.setActivityType(CalendarEvent.ActivityTypeEnum.Climbing);
    }
  }

  /**
   * backlog/143 — "Típus: Esemény / Mászás". Switching to Mászás on a new event prefills the title
   * (only when still empty) and makes it all-day; an existing event keeps its fields.
   */
  setActivityType(value: CalendarEvent.ActivityTypeEnum | null): void {
    this.form.controls.activityType.setValue(value);
    if (value === CalendarEvent.ActivityTypeEnum.Climbing && this.eventId() === null) {
      if (this.form.controls.title.value.trim() === '') {
        this.form.controls.title.setValue(this.translate.instant('TASKS.EVENTS.CLIMBING_TITLE'));
      }
      this.form.controls.allDay.setValue(true);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, allDay, date, startTime, endTime, frequency, interval, location, notes, activityType } = this.form.getRawValue();
    if (!allDay) {
      if (startTime === null || endTime === null || endTime <= startTime) {
        this.timeRangeError.set(this.translate.instant('TASKS.EVENTS.TIME_RANGE_ERROR'));
        return;
      }
    }
    this.timeRangeError.set(null);
    await this.repository.save({
      id: this.eventId() ?? undefined,
      title,
      location,
      notes,
      allDay,
      date,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      frequency,
      interval: frequency === null ? 1 : interval,
      activityType,
    });
    await this.router.navigateByUrl('/tabs/tasks/events');
  }

  async delete(): Promise<void> {
    const id = this.eventId();
    if (id === null) {
      return;
    }
    const isRecurring = this.form.controls.frequency.value !== null;
    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.EVENTS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant(
        isRecurring ? 'TASKS.EVENTS.DELETE_CONFIRM_MESSAGE_RECURRING' : 'TASKS.EVENTS.DELETE_CONFIRM_MESSAGE',
        { title: this.form.controls.title.value },
      ),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/tasks/events');
  }
}
