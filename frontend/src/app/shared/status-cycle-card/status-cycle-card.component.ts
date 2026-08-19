import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { PackingSessionItem } from '../../api/model/packingSessionItem';

export interface StatusCycleItem {
  id: string;
  label: string;
  status: PackingSessionItem.StatusEnum;
}

/** documentation/Subfeatures/Pakolás.md "Ciklus sorrend" — the cycle order tap-to-advance follows. */
export const STATUS_CYCLE_ORDER: readonly PackingSessionItem.StatusEnum[] = [
  PackingSessionItem.StatusEnum.NotPacked,
  PackingSessionItem.StatusEnum.KnownLocation,
  PackingSessionItem.StatusEnum.Prepared,
  PackingSessionItem.StatusEnum.WearOnDeparture,
  PackingSessionItem.StatusEnum.BuyOnTheWay,
  PackingSessionItem.StatusEnum.Packed,
  PackingSessionItem.StatusEnum.NotNeeded,
];

/** Only the "active" statuses (documentation/Subfeatures/Pakolás.md "Rendezés" — PACKED/NOT_NEEDED are a separate section, never sorted here). */
export const ACTIVE_STATUS_ORDER: readonly PackingSessionItem.StatusEnum[] = STATUS_CYCLE_ORDER.slice(0, 5);

export function nextStatus(current: PackingSessionItem.StatusEnum): PackingSessionItem.StatusEnum {
  const index = STATUS_CYCLE_ORDER.indexOf(current);
  return STATUS_CYCLE_ORDER[(index + 1) % STATUS_CYCLE_ORDER.length];
}

const STATUS_I18N_KEYS: Record<PackingSessionItem.StatusEnum, string> = {
  [PackingSessionItem.StatusEnum.NotPacked]: 'GEAR.PACKING.STATUS_NOT_PACKED',
  [PackingSessionItem.StatusEnum.KnownLocation]: 'GEAR.PACKING.STATUS_KNOWN_LOCATION',
  [PackingSessionItem.StatusEnum.Prepared]: 'GEAR.PACKING.STATUS_PREPARED',
  [PackingSessionItem.StatusEnum.WearOnDeparture]: 'GEAR.PACKING.STATUS_WEAR_ON_DEPARTURE',
  [PackingSessionItem.StatusEnum.BuyOnTheWay]: 'GEAR.PACKING.STATUS_BUY_ON_THE_WAY',
  [PackingSessionItem.StatusEnum.Packed]: 'GEAR.PACKING.STATUS_PACKED',
  [PackingSessionItem.StatusEnum.NotNeeded]: 'GEAR.PACKING.STATUS_NOT_NEEDED',
};

export function statusI18nKey(status: PackingSessionItem.StatusEnum): string {
  return STATUS_I18N_KEYS[status];
}

/**
 * documentation/Subfeatures/Pakolás.md "Státusz / elem interakció": 7-chip status row + name/status
 * body, card background = current status color, tap the card (not a chip) → next in cycle.
 */
@Component({
  selector: 'app-status-cycle-card',
  templateUrl: 'status-cycle-card.component.html',
  styleUrls: ['status-cycle-card.component.scss'],
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCycleCardComponent {
  @Input({ required: true }) item!: StatusCycleItem;
  @Output() readonly statusChange = new EventEmitter<PackingSessionItem.StatusEnum>();

  readonly statuses = STATUS_CYCLE_ORDER;

  statusClass(status: PackingSessionItem.StatusEnum): string {
    return `status-${status.toLowerCase().replace(/_/g, '-')}`;
  }

  statusLabelKey(status: PackingSessionItem.StatusEnum): string {
    return statusI18nKey(status);
  }

  selectStatus(status: PackingSessionItem.StatusEnum): void {
    if (status !== this.item.status) {
      this.statusChange.emit(status);
    }
  }

  cycleNext(): void {
    this.statusChange.emit(nextStatus(this.item.status));
  }
}
