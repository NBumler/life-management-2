import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
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
  IonReorder,
  IonReorderGroup,
  IonText,
  IonTitle,
  IonToolbar,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdRoomNameConflictError, HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';

/**
 * documentation/Subfeatures/Háztartási feladatok.md "Helyiségkezelő": lista, átnevezés, reorder,
 * törlés a cascade-listás confirmationnel. "manuális sorrend (web drag-and-drop; telefon fel / le
 * nyilak — Sablonok / Pakolás mintára)". Inline rename needs a row the shared `ReorderListComponent`
 * can't render (label-as-input), so this page mirrors that component's native-vs-web branch itself
 * instead of pulling it in — up/down arrows on native, `ion-reorder-group` drag-and-drop on web.
 */
@Component({
  selector: 'app-household-room-manager',
  templateUrl: 'household-room-manager.page.html',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonLabel,
    IonText,
    IonIcon,
    IonReorderGroup,
    IonReorder,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdRoomManagerPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roomRepository = inject(HouseholdRoomRepository);
  private readonly taskRepository = inject(HouseholdTaskRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly isNative = Capacitor.isNativePlatform();

  readonly editingId = signal<string | 'new' | null>(null);
  readonly nameConflictError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
  });

  readonly rooms = computed(() => this.roomRepository.items().slice().sort((a, b) => a.sortOrder - b.sortOrder));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.roomRepository.load(), this.taskRepository.load()]);
  }

  startAdd(): void {
    this.form.reset({ name: '' });
    this.nameConflictError.set(null);
    this.editingId.set('new');
  }

  startEdit(room: HouseholdRoom): void {
    this.form.reset({ name: room.name });
    this.nameConflictError.set(null);
    this.editingId.set(room.id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.nameConflictError.set(null);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name } = this.form.getRawValue();
    const editingId = this.editingId();
    const isNew = editingId === 'new';
    const sortOrder = isNew ? this.nextSortOrder() : (this.rooms().find((room) => room.id === editingId)?.sortOrder ?? 0);
    try {
      await this.roomRepository.save(name, sortOrder, isNew ? undefined : (editingId ?? undefined));
      this.editingId.set(null);
      this.nameConflictError.set(null);
    } catch (error) {
      if (error instanceof HouseholdRoomNameConflictError) {
        // documentation/Architektúra/Névegyediség.md: quote the user's own typed name back, not the normalized form.
        this.nameConflictError.set(this.translate.instant('TASKS.HOUSEHOLD.ROOM_NAME_CONFLICT', { name }));
        return;
      }
      throw error;
    }
  }

  moveUp(index: number): void {
    void this.swapAndPersist(index, index - 1);
  }

  moveDown(index: number): void {
    void this.swapAndPersist(index, index + 1);
  }

  onIonReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    const reordered = event.detail.complete(this.rooms().slice()) as HouseholdRoom[];
    void this.roomRepository.reorder(reordered.map((room, index) => ({ id: room.id, sortOrder: index })));
  }

  async delete(room: HouseholdRoom): Promise<void> {
    const affectedNames = this.taskRepository
      .items()
      .filter((task) => task.roomId === room.id)
      .map((task) => task.name);
    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.HOUSEHOLD.DELETE_ROOM_CONFIRM_TITLE'),
      message: this.buildDeleteConfirmMessage(room.name, affectedNames),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.roomRepository.remove(room.id) },
      ],
    });
    await alert.present();
  }

  private async swapAndPersist(a: number, b: number): Promise<void> {
    const rooms = this.rooms();
    if (b < 0 || b >= rooms.length) {
      return;
    }
    await this.roomRepository.reorder([
      { id: rooms[a].id, sortOrder: rooms[b].sortOrder },
      { id: rooms[b].id, sortOrder: rooms[a].sortOrder },
    ]);
  }

  private nextSortOrder(): number {
    const rooms = this.rooms();
    return rooms.length === 0 ? 0 : Math.max(...rooms.map((room) => room.sortOrder)) + 1;
  }

  /** documentation/Subfeatures/Háztartási feladatok.md "Törlés": a dialógus név szerint felsorolja a törlődő feladatokat. */
  private buildDeleteConfirmMessage(name: string, affectedTaskNames: string[]): string {
    const base = this.translate.instant('TASKS.HOUSEHOLD.DELETE_ROOM_CONFIRM_MESSAGE', { name });
    if (affectedTaskNames.length === 0) {
      return base;
    }
    const cascadeHint = this.translate.instant('TASKS.HOUSEHOLD.DELETE_ROOM_CONFIRM_CASCADE', {
      tasks: affectedTaskNames.join(', '),
    });
    return `${base} ${cascadeHint}`;
  }
}
