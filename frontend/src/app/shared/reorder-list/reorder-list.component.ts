import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonReorder, IonReorderGroup, ItemReorderEventDetail } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

export interface ReorderableItem {
  id: string;
  label?: string;
}

/**
 * documentation/Subfeatures/Sablonok.md "Sorrend": manual reorder — web drag-and-drop, native
 * up/down arrows (mint a Pakolás / Recept mintára). Shared between Sablonok and Pakolás item lists,
 * and Recept's ingredient rows (via the `itemTemplate` content projection below — richer per-row
 * content than the default `label`, e.g. Recept's food name + quantity input).
 */
@Component({
  selector: 'app-reorder-list',
  templateUrl: 'reorder-list.component.html',
  styleUrls: ['reorder-list.component.scss'],
  imports: [IonList, IonItem, IonLabel, IonButton, IonIcon, IonReorderGroup, IonReorder, NgTemplateOutlet, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReorderListComponent<T extends ReorderableItem = ReorderableItem> {
  @Input({ required: true }) items: T[] = [];
  /** Optional per-row body, projected via `<ng-template let-item let-i="index">…</ng-template>`; falls back to `item.label`. */
  @ContentChild(TemplateRef) itemTemplate?: TemplateRef<{ $implicit: T; index: number }>;
  @Output() readonly reorder = new EventEmitter<T[]>();
  @Output() readonly remove = new EventEmitter<T>();

  readonly isNative = Capacitor.isNativePlatform();

  moveUp(index: number): void {
    if (index === 0) {
      return;
    }
    this.reorder.emit(swap(this.items, index, index - 1));
  }

  moveDown(index: number): void {
    if (index === this.items.length - 1) {
      return;
    }
    this.reorder.emit(swap(this.items, index, index + 1));
  }

  onIonReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    const reordered = event.detail.complete(this.items.slice()) as T[];
    this.reorder.emit(reordered);
  }
}

function swap<T>(items: readonly T[], a: number, b: number): T[] {
  const next = items.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
