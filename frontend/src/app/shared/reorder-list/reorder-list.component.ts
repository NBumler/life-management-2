import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonReorder, IonReorderGroup, ItemReorderEventDetail } from '@ionic/angular/standalone';

export interface ReorderableItem {
  id: string;
  label: string;
}

/**
 * documentation/Subfeatures/Sablonok.md "Sorrend": manual reorder — web drag-and-drop, native
 * up/down arrows (mint a Pakolás / Recept mintára). Shared between Sablonok and Pakolás item lists.
 */
@Component({
  selector: 'app-reorder-list',
  templateUrl: 'reorder-list.component.html',
  imports: [IonList, IonItem, IonLabel, IonButton, IonIcon, IonReorderGroup, IonReorder],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReorderListComponent {
  @Input({ required: true }) items: ReorderableItem[] = [];
  @Output() readonly reorder = new EventEmitter<ReorderableItem[]>();
  @Output() readonly remove = new EventEmitter<ReorderableItem>();

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
    const reordered = event.detail.complete(this.items.slice()) as ReorderableItem[];
    this.reorder.emit(reordered);
  }
}

function swap<T>(items: readonly T[], a: number, b: number): T[] {
  const next = items.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
