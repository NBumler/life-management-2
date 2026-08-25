import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { HouseholdTask } from '../../../api/model/householdTask';
import { HouseholdRoomNameConflictError, HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskNameConflictError, HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { today } from '../../../shared/local-date';

/**
 * documentation/Subfeatures/Háztartási feladatok.md "Feladat CRUD": create = room checklist (≥1) ->
 * N independent client-UUID tasks; edit = single room picker (the room is movable). Pipálás
 * ("complete") lives on the list page, not here — "ugyanaz a mutáció" from the calendar too.
 */
@Component({
  selector: 'app-household-task-edit',
  templateUrl: 'household-task-edit.page.html',
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
    IonCheckbox,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdTaskEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly taskRepository = inject(HouseholdTaskRepository);
  readonly roomRepository = inject(HouseholdRoomRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly EnergyLevelEnum = HouseholdTask.EnergyLevelEnum;
  readonly taskId = signal<string | null>(null);
  readonly selectedRoomIds = signal<ReadonlySet<string>>(new Set());
  readonly newRoomName = signal('');
  readonly newRoomError = signal<string | null>(null);
  readonly roomSelectionError = signal<string | null>(null);
  readonly nameConflictError = signal<string | null>(null);
  private existingLastCompletedAt: string | null = null;

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    energyLevel: this.fb.nonNullable.control<HouseholdTask.EnergyLevelEnum>(HouseholdTask.EnergyLevelEnum.Medium, [Validators.required]),
    estimatedMinutes: this.fb.nonNullable.control<number>(15, [Validators.required, Validators.min(1)]),
    intervalDays: this.fb.nonNullable.control<number>(7, [Validators.required, Validators.min(1)]),
    nextDue: this.fb.nonNullable.control<string>(today(), [Validators.required]),
    notes: this.fb.control<string | null>(null),
    roomId: this.fb.control<string | null>(null),
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.roomRepository.load(), this.taskRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.taskId.set(idParam);
      const existing = this.taskRepository.items().find((task) => task.id === idParam);
      if (existing !== undefined) {
        this.existingLastCompletedAt = existing.lastCompletedAt ?? null;
        this.form.reset({
          name: existing.name,
          energyLevel: existing.energyLevel,
          estimatedMinutes: existing.estimatedMinutes,
          intervalDays: existing.intervalDays,
          nextDue: existing.nextDue,
          notes: existing.notes ?? null,
          roomId: existing.roomId,
        });
      }
    }
  }

  toggleRoom(roomId: string): void {
    const next = new Set(this.selectedRoomIds());
    if (next.has(roomId)) {
      next.delete(roomId);
    } else {
      next.add(roomId);
    }
    this.selectedRoomIds.set(next);
    this.roomSelectionError.set(null);
  }

  async addInlineRoom(): Promise<void> {
    const name = this.newRoomName().trim();
    if (name === '') {
      return;
    }
    const rooms = this.roomRepository.items();
    const nextSortOrder = rooms.length === 0 ? 0 : Math.max(...rooms.map((room) => room.sortOrder)) + 1;
    try {
      const room = await this.roomRepository.save(name, nextSortOrder);
      this.newRoomName.set('');
      this.newRoomError.set(null);
      this.toggleRoom(room.id);
    } catch (error) {
      if (error instanceof HouseholdRoomNameConflictError) {
        this.newRoomError.set(this.translate.instant('TASKS.HOUSEHOLD.ROOM_NAME_CONFLICT', { name }));
        return;
      }
      throw error;
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, energyLevel, estimatedMinutes, intervalDays, nextDue, notes } = this.form.getRawValue();
    const id = this.taskId();

    if (id === null) {
      const roomIds = Array.from(this.selectedRoomIds());
      if (roomIds.length === 0) {
        this.roomSelectionError.set(this.translate.instant('TASKS.HOUSEHOLD.ROOM_REQUIRED_ERROR'));
        return;
      }
      const failedRoomNames: string[] = [];
      for (const roomId of roomIds) {
        try {
          await this.taskRepository.save({ roomId, name, energyLevel, estimatedMinutes, intervalDays, nextDue, lastCompletedAt: null, notes });
        } catch (error) {
          if (error instanceof HouseholdTaskNameConflictError) {
            const roomName = this.roomRepository.items().find((room) => room.id === roomId)?.name ?? roomId;
            failedRoomNames.push(roomName);
            continue;
          }
          throw error;
        }
      }
      if (failedRoomNames.length > 0) {
        // documentation/Subfeatures/Háztartási feladatok.md: "az a helyiség hibás, a többi létrejöhet".
        this.roomSelectionError.set(this.translate.instant('TASKS.HOUSEHOLD.TASK_NAME_CONFLICT_ROOMS', { rooms: failedRoomNames.join(', ') }));
        return;
      }
      await this.router.navigateByUrl('/tabs/tasks/household');
      return;
    }

    const roomId = this.form.controls.roomId.value;
    if (roomId === null) {
      return;
    }
    try {
      await this.taskRepository.save({
        id,
        roomId,
        name,
        energyLevel,
        estimatedMinutes,
        intervalDays,
        nextDue,
        lastCompletedAt: this.existingLastCompletedAt,
        notes,
      });
      await this.router.navigateByUrl('/tabs/tasks/household');
    } catch (error) {
      if (error instanceof HouseholdTaskNameConflictError) {
        this.nameConflictError.set(this.translate.instant('TASKS.HOUSEHOLD.NAME_CONFLICT', { name }));
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.taskId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.HOUSEHOLD.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('TASKS.HOUSEHOLD.DELETE_CONFIRM_MESSAGE', { name: this.form.controls.name.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.taskRepository.remove(id);
    await this.router.navigateByUrl('/tabs/tasks/household');
  }
}
