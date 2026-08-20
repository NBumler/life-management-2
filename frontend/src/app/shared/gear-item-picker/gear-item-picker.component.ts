import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { IonIcon, IonItem, IonLabel, IonList, IonSearchbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { GearItem } from '../../api/model/gearItem';
import { GearItemRepository } from '../../core/data/gear-item.repository';
import { compareRank, matchesSearch } from '../text-search';

/**
 * documentation/Subfeatures/Eszközök.md "Megosztott picker": search + list of live GearItem rows.
 * Already-referenced items (per `excludedIds`) are shown disabled and sorted to the end, matching
 * the Sablonok / Pakolás spec ("disabled + lista végére rendezve"). Reused by both.
 */
@Component({
  selector: 'app-gear-item-picker',
  templateUrl: 'gear-item-picker.component.html',
  imports: [IonSearchbar, IonList, IonItem, IonLabel, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GearItemPickerComponent implements OnInit {
  private readonly repository = inject(GearItemRepository);

  @Input() excludedIds: readonly string[] = [];
  @Output() readonly picked = new EventEmitter<GearItem>();

  readonly query = signal('');

  readonly sortedItems = computed(() => {
    const excluded = new Set(this.excludedIds);
    const q = this.query();
    const available: GearItem[] = [];
    const disabled: GearItem[] = [];
    for (const item of this.repository.items()) {
      if (!matchesSearch(q, item.name)) {
        continue;
      }
      (excluded.has(item.id) ? disabled : available).push(item);
    }
    available.sort((a, b) => compareRank(q, a.name, b.name) || a.name.localeCompare(b.name));
    disabled.sort((a, b) => a.name.localeCompare(b.name));
    return [...available, ...disabled];
  });

  async ngOnInit(): Promise<void> {
    if (!this.repository.loaded()) {
      await this.repository.load();
    }
  }

  isExcluded(item: GearItem): boolean {
    return this.excludedIds.includes(item.id);
  }

  pick(item: GearItem): void {
    if (!this.isExcluded(item)) {
      this.picked.emit(item);
    }
  }
}
