import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { STATUS_CYCLE_ORDER, StatusCycleCardComponent, nextStatus } from './status-cycle-card.component';

const StatusEnum = PackingSessionItem.StatusEnum;

describe('STATUS_CYCLE_ORDER / nextStatus', () => {
  it('documentation/Subfeatures/Pakolás.md "Ciklus sorrend": is exactly the 7 statuses in the specified order', () => {
    expect(STATUS_CYCLE_ORDER).toEqual([
      StatusEnum.NotPacked,
      StatusEnum.KnownLocation,
      StatusEnum.Prepared,
      StatusEnum.WearOnDeparture,
      StatusEnum.BuyOnTheWay,
      StatusEnum.Packed,
      StatusEnum.NotNeeded,
    ]);
  });

  it('advances to the next status in the cycle', () => {
    expect(nextStatus(StatusEnum.NotPacked)).toBe(StatusEnum.KnownLocation);
    expect(nextStatus(StatusEnum.Prepared)).toBe(StatusEnum.WearOnDeparture);
    expect(nextStatus(StatusEnum.Packed)).toBe(StatusEnum.NotNeeded);
  });

  it('wraps from the last status (NOT_NEEDED) back to the first (NOT_PACKED)', () => {
    expect(nextStatus(StatusEnum.NotNeeded)).toBe(StatusEnum.NotPacked);
  });
});

describe('StatusCycleCardComponent', () => {
  let fixture: ComponentFixture<StatusCycleCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusCycleCardComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusCycleCardComponent);
    fixture.componentRef.setInput('item', { id: 'i1', label: 'Kötél', status: StatusEnum.NotPacked });
  });

  it('creates and renders without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('selectStatus(): emits the tapped status immediately (documentation "Bármely státuszra tap → azonnal arra a státuszra áll")', () => {
    const emitted: PackingSessionItem.StatusEnum[] = [];
    fixture.componentInstance.statusChange.subscribe((status) => emitted.push(status));

    fixture.componentInstance.selectStatus(StatusEnum.Packed);

    expect(emitted).toEqual([StatusEnum.Packed]);
  });

  it('selectStatus(): does not emit when tapping the already-active status', () => {
    const emitted: PackingSessionItem.StatusEnum[] = [];
    fixture.componentInstance.statusChange.subscribe((status) => emitted.push(status));

    fixture.componentInstance.selectStatus(StatusEnum.NotPacked); // same as the current status set in beforeEach

    expect(emitted).toEqual([]);
  });

  it('cycleNext(): emits the next status in the cycle relative to the current one (tap on card body)', () => {
    fixture.componentRef.setInput('item', { id: 'i1', label: 'Kötél', status: StatusEnum.Prepared });
    const emitted: PackingSessionItem.StatusEnum[] = [];
    fixture.componentInstance.statusChange.subscribe((status) => emitted.push(status));

    fixture.componentInstance.cycleNext();

    expect(emitted).toEqual([StatusEnum.WearOnDeparture]);
  });

  it('statusClass(): maps a multi-word status to a kebab-case CSS class', () => {
    expect(fixture.componentInstance.statusClass(StatusEnum.WearOnDeparture)).toBe('status-wear-on-departure');
    expect(fixture.componentInstance.statusClass(StatusEnum.NotPacked)).toBe('status-not-packed');
  });

  it('tapping a status chip in the DOM selects that status directly, not the cycle-next one', () => {
    fixture.componentRef.setInput('item', { id: 'i1', label: 'Kötél', status: StatusEnum.NotPacked });
    fixture.detectChanges();
    const emitted: PackingSessionItem.StatusEnum[] = [];
    fixture.componentInstance.statusChange.subscribe((status) => emitted.push(status));

    const chips = fixture.nativeElement.querySelectorAll('.status-chip') as NodeListOf<HTMLButtonElement>;
    // 6th chip (index 5) is PACKED per STATUS_CYCLE_ORDER — tapping it must select PACKED, not NOT_PACKED's cycle-next (KNOWN_LOCATION).
    chips[5].click();

    expect(emitted).toEqual([StatusEnum.Packed]);
  });
});
