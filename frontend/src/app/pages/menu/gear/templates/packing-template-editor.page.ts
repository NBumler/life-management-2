import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GearItem } from '../../../../api/model/gearItem';
import { GearItemRepository } from '../../../../core/data/gear-item.repository';
import { PackingTemplateNameConflictError, PackingTemplateRepository } from '../../../../core/data/packing-template.repository';
import { uuidV4 } from '../../../../core/sync/uuid';
import { GearItemPickerComponent } from '../../../../shared/gear-item-picker/gear-item-picker.component';
import { ReorderableItem, ReorderListComponent } from '../../../../shared/reorder-list/reorder-list.component';

interface DraftItem {
  id: string;
  gearItemId: string;
  sortOrder: number;
}

/**
 * documentation/Subfeatures/Sablonok.md: create + edit in one page (route param `id` is either an
 * existing template's uuid or the literal `new`) — name/notes form, reorderable item list, picker
 * to add existing GearItem rows, delete (existing only).
 */
@Component({
  selector: 'app-packing-template-editor',
  templateUrl: 'packing-template-editor.page.html',
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
    IonText,
    TranslatePipe,
    GearItemPickerComponent,
    ReorderListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingTemplateEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(PackingTemplateRepository);
  private readonly gearItemRepository = inject(GearItemRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly templateId = signal<string | null>(null);
  readonly items = signal<DraftItem[]>([]);
  readonly pickerOpen = signal(false);
  readonly nameConflictError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    notes: this.fb.control<string | null>(null),
  });

  private readonly gearItemNameById = computed(() => new Map(this.gearItemRepository.items().map((item) => [item.id, item.name])));

  readonly reorderableItems = computed<ReorderableItem[]>(() =>
    this.items()
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ id: item.id, label: this.gearItemNameById().get(item.gearItemId) ?? '—' })),
  );

  readonly excludedGearItemIds = computed(() => this.items().map((item) => item.gearItemId));

  async ngOnInit(): Promise<void> {
    await this.gearItemRepository.load();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.templateId.set(idParam);
      const detail = await this.repository.getDetail(idParam);
      this.form.reset({ name: detail.name, notes: detail.notes ?? null });
      this.items.set(
        detail.items.filter((item) => !item.deleted).map((item) => ({ id: item.id, gearItemId: item.gearItemId, sortOrder: item.sortOrder })),
      );
    }
  }

  togglePicker(): void {
    this.pickerOpen.set(!this.pickerOpen());
  }

  onItemPicked(gearItem: GearItem): void {
    this.items.update((list) => [...list, { id: uuidV4(), gearItemId: gearItem.id, sortOrder: list.length }]);
    this.pickerOpen.set(false);
  }

  onReorder(reordered: ReorderableItem[]): void {
    // reordered is always a permutation of the current items — every id is guaranteed present.
    const byId = new Map(this.items().map((item) => [item.id, item]));
    this.items.set(reordered.map((entry, index) => ({ ...byId.get(entry.id)!, sortOrder: index })));
  }

  onRemoveItem(item: ReorderableItem): void {
    this.items.update((list) => list.filter((entry) => entry.id !== item.id).map((entry, index) => ({ ...entry, sortOrder: index })));
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, notes } = this.form.getRawValue();
    try {
      const saved = await this.repository.save({
        id: this.templateId() ?? undefined,
        name,
        notes,
        items: this.items().map((item) => ({ id: item.id, gearItemId: item.gearItemId, sortOrder: item.sortOrder })),
      });
      this.nameConflictError.set(null);
      const wasNew = this.templateId() === null;
      this.templateId.set(saved.id);
      if (wasNew) {
        await this.router.navigate(['/tabs/menu/gear/templates', saved.id], { replaceUrl: true });
      }
    } catch (error) {
      if (error instanceof PackingTemplateNameConflictError) {
        // documentation/Architektúra/Névegyediség.md: quote the user's own typed name back, not the normalized form.
        this.nameConflictError.set(this.translate.instant('GEAR.TEMPLATES.NAME_CONFLICT', { name }));
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.templateId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('GEAR.TEMPLATES.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('GEAR.TEMPLATES.DELETE_CONFIRM_MESSAGE', { name: this.form.controls.name.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/menu/gear/templates');
  }
}
