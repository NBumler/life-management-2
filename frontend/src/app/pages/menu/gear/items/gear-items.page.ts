import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GearItem } from '../../../../api/model/gearItem';
import { GearItemNameConflictError, GearItemRepository } from '../../../../core/data/gear-item.repository';
import { compareRank, matchesSearch } from '../../../../shared/text-search';

/**
 * documentation/Subfeatures/Eszközök.md: catalog list with search, inline create/edit, and a soft
 * delete with a confirmation dialog. No separate edit route — the same pattern as Profile's inline
 * weight-history CRUD (a signal-tracked "which row is being edited" state).
 */
@Component({
  selector: 'app-gear-items',
  templateUrl: 'gear-items.page.html',
  styleUrls: ['gear-items.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonLabel,
    IonText,
    IonIcon,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GearItemsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(GearItemRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly query = signal('');
  readonly editingId = signal<string | 'new' | null>(null);
  readonly nameConflictError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    notes: this.fb.control<string | null>(null),
  });

  readonly filteredItems = computed(() => {
    const query = this.query();
    return this.repository
      .items()
      .filter((item) => matchesSearch(query, item.name))
      .sort((a, b) => a.name.localeCompare(b.name) || compareRank(query, a.name, b.name));
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  startAdd(): void {
    this.form.reset({ name: '', notes: null });
    this.nameConflictError.set(null);
    this.editingId.set('new');
  }

  startEdit(item: GearItem): void {
    this.form.reset({ name: item.name, notes: item.notes ?? null });
    this.nameConflictError.set(null);
    this.editingId.set(item.id);
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
    const { name, notes } = this.form.getRawValue();
    const editingId = this.editingId();
    try {
      await this.repository.save(name, notes, editingId === 'new' ? undefined : (editingId ?? undefined));
      this.editingId.set(null);
      this.nameConflictError.set(null);
    } catch (error) {
      if (error instanceof GearItemNameConflictError) {
        // documentation/Architektúra/Névegyediség.md: quote the user's own typed name back, not the normalized form.
        this.nameConflictError.set(this.translate.instant('GEAR.ITEMS.NAME_CONFLICT', { name }));
        return;
      }
      throw error;
    }
  }

  async delete(item: GearItem): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('GEAR.ITEMS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('GEAR.ITEMS.DELETE_CONFIRM_MESSAGE', { name: item.name }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(item.id) },
      ],
    });
    await alert.present();
  }
}
