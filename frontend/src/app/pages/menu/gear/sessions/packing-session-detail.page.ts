import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonItemDivider,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GearItem } from '../../../../api/model/gearItem';
import { PackingSessionDetail } from '../../../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../../../api/model/packingSessionItem';
import { GearItemRepository } from '../../../../core/data/gear-item.repository';
import { PackingSessionRepository } from '../../../../core/data/packing-session.repository';
import { GearItemPickerComponent } from '../../../../shared/gear-item-picker/gear-item-picker.component';
import {
  ACTIVE_STATUS_ORDER,
  StatusCycleCardComponent,
  StatusCycleItem,
} from '../../../../shared/status-cycle-card/status-cycle-card.component';
import { matchesSearch } from '../../../../shared/text-search';

interface SessionItemView {
  id: string;
  gearItemId: string;
  name: string;
  status: PackingSessionItem.StatusEnum;
  sortOrder: number;
}

const DONE_STATUSES: ReadonlySet<PackingSessionItem.StatusEnum> = new Set([
  PackingSessionItem.StatusEnum.Packed,
  PackingSessionItem.StatusEnum.NotNeeded,
]);

/**
 * documentation/Subfeatures/Pakolás.md: the main packing screen — destination editor, search,
 * status-sort, active/done sections, per-item status-cycle card, reorder (own up/down-arrow /
 * drag-and-drop implementation here rather than the shared ReorderList, since each row needs the
 * full StatusCycleCard, not a plain label — see the commit message for why this one stayed local),
 * "extra eszköz" picker, close ("Lezárás").
 */
@Component({
  selector: 'app-packing-session-detail',
  templateUrl: 'packing-session-detail.page.html',
  styleUrls: ['packing-session-detail.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonItemDivider,
    IonInput,
    IonIcon,
    IonReorderGroup,
    IonReorder,
    TranslatePipe,
    GearItemPickerComponent,
    StatusCycleCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingSessionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sessionRepository = inject(PackingSessionRepository);
  private readonly gearItemRepository = inject(GearItemRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  private readonly sessionId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly isNative = Capacitor.isNativePlatform();
  readonly query = signal('');
  readonly pickerOpen = signal(false);
  readonly items = signal<SessionItemView[]>([]);

  readonly destinationForm = this.fb.nonNullable.group({
    destination: this.fb.control<string | null>(null),
  });

  private readonly filteredItems = computed(() => {
    const query = this.query();
    return this.items().filter((item) => matchesSearch(query, item.name));
  });

  readonly activeItems = computed(() =>
    this.filteredItems()
      .filter((item) => !DONE_STATUSES.has(item.status))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  readonly doneItems = computed(() => this.filteredItems().filter((item) => DONE_STATUSES.has(item.status)));

  readonly excludedGearItemIds = computed(() => this.items().map((item) => item.gearItemId));

  async ngOnInit(): Promise<void> {
    await this.gearItemRepository.load();
    const detail = await this.sessionRepository.getDetail(this.sessionId);
    this.destinationForm.setValue({ destination: detail.destination ?? null });
    this.applyDetail(detail);
  }

  toStatusCycleItem(item: SessionItemView): StatusCycleItem {
    return { id: item.id, label: item.name, status: item.status };
  }

  async saveDestination(): Promise<void> {
    const value = this.destinationForm.getRawValue().destination?.trim() || null;
    await this.sessionRepository.updateDestination(this.sessionId, value);
  }

  async onStatusChange(item: SessionItemView, status: PackingSessionItem.StatusEnum): Promise<void> {
    const dto = this.toDto(item);
    const updated = await this.sessionRepository.updateItemStatus(dto, status);
    this.items.update((list) => list.map((entry) => (entry.id === item.id ? { ...entry, status: updated.status } : entry)));
  }

  sortActiveByStatus(): void {
    const rank = new Map(ACTIVE_STATUS_ORDER.map((status, index) => [status, index]));
    const reordered = this.activeItems()
      .slice()
      .sort((a, b) => (rank.get(a.status) ?? 0) - (rank.get(b.status) ?? 0));
    void this.persistActiveOrder(reordered);
  }

  async moveActiveItem(index: number, targetIndex: number): Promise<void> {
    const active = this.activeItems();
    if (targetIndex < 0 || targetIndex >= active.length) {
      return;
    }
    const reordered = active.slice();
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    await this.persistActiveOrder(reordered);
  }

  async onWebReorder(event: CustomEvent<ItemReorderEventDetail>): Promise<void> {
    const reordered = event.detail.complete(this.activeItems().slice()) as SessionItemView[];
    await this.persistActiveOrder(reordered);
  }

  togglePicker(): void {
    this.pickerOpen.set(!this.pickerOpen());
  }

  async onItemPicked(gearItem: GearItem): Promise<void> {
    const sortOrder = this.items().length;
    const added = await this.sessionRepository.addItem(this.sessionId, gearItem.id, sortOrder);
    this.items.update((list) => [...list, { id: added.id, gearItemId: added.gearItemId, name: gearItem.name, status: added.status, sortOrder: added.sortOrder }]);
    this.pickerOpen.set(false);
  }

  async close(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('GEAR.PACKING.CLOSE_CONFIRM_TITLE'),
      message: this.translate.instant('GEAR.PACKING.CLOSE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('GEAR.PACKING.CLOSE_BUTTON'), role: 'destructive', handler: () => void this.closeAndNavigateBack() },
      ],
    });
    await alert.present();
  }

  private async persistActiveOrder(reordered: SessionItemView[]): Promise<void> {
    await this.sessionRepository.reorderItems(reordered.map((item) => this.toDto(item)));
    this.items.update((list) => {
      const byId = new Map(list.map((item) => [item.id, item]));
      reordered.forEach((item, index) => {
        const existing = byId.get(item.id);
        if (existing !== undefined) {
          byId.set(item.id, { ...existing, sortOrder: index });
        }
      });
      return Array.from(byId.values());
    });
  }

  private async closeAndNavigateBack(): Promise<void> {
    await this.sessionRepository.close(this.sessionId);
    await this.router.navigateByUrl('/tabs/menu/gear/sessions');
  }

  private applyDetail(detail: PackingSessionDetail): void {
    const nameById = new Map(this.gearItemRepository.items().map((item) => [item.id, item.name]));
    this.items.set(
      detail.items
        .filter((item) => !item.deleted)
        .map((item) => ({
          id: item.id,
          gearItemId: item.gearItemId,
          name: nameById.get(item.gearItemId) ?? '—',
          status: item.status,
          sortOrder: item.sortOrder,
        })),
    );
  }

  private toDto(item: SessionItemView): PackingSessionItem {
    return { id: item.id, sessionId: this.sessionId, gearItemId: item.gearItemId, status: item.status, sortOrder: item.sortOrder, deleted: false };
  }
}
