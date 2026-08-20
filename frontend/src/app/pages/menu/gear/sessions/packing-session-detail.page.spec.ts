import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { GearItem } from '../../../../api/model/gearItem';
import { PackingSessionDetail } from '../../../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../../../api/model/packingSessionItem';
import { GearItemRepository } from '../../../../core/data/gear-item.repository';
import { PackingSessionRepository } from '../../../../core/data/packing-session.repository';
import { PackingSessionDetailPage } from './packing-session-detail.page';

const StatusEnum = PackingSessionItem.StatusEnum;

function sessionItem(overrides: Partial<PackingSessionItem> = {}): PackingSessionItem {
  return { id: 'i1', sessionId: 's1', gearItemId: 'g1', status: StatusEnum.NotPacked, sortOrder: 0, deleted: false, ...overrides };
}

function sessionDetail(overrides: Partial<PackingSessionDetail> = {}): PackingSessionDetail {
  return { id: 's1', destination: null, sourceTemplateIds: [], deleted: false, items: [], ...overrides };
}

function gearItem(overrides: Partial<GearItem> = {}): GearItem {
  return { id: 'g1', name: 'Kötél', notes: null, deleted: false, ...overrides };
}

describe('PackingSessionDetailPage', () => {
  let fixture: ComponentFixture<PackingSessionDetailPage>;
  let sessionRepository: jasmine.SpyObj<
    Pick<PackingSessionRepository, 'getDetail' | 'updateDestination' | 'updateItemStatus' | 'reorderItems' | 'addItem' | 'close'>
  >;
  let gearItemRepository: { items: ReturnType<typeof signal<GearItem[]>>; load: jasmine.Spy };

  async function createAndInit(detail: PackingSessionDetail, catalog: GearItem[]): Promise<void> {
    sessionRepository.getDetail.and.resolveTo(detail);
    gearItemRepository.items.set(catalog);
    fixture = TestBed.createComponent(PackingSessionDetailPage);
    await fixture.componentInstance.ngOnInit();
  }

  beforeEach(async () => {
    sessionRepository = jasmine.createSpyObj('PackingSessionRepository', [
      'getDetail',
      'updateDestination',
      'updateItemStatus',
      'reorderItems',
      'addItem',
      'close',
    ]);
    gearItemRepository = { items: signal<GearItem[]>([]), load: jasmine.createSpy('load').and.resolveTo() };

    await TestBed.configureTestingModule({
      imports: [PackingSessionDetailPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 's1' }) } } },
        { provide: PackingSessionRepository, useValue: sessionRepository },
        { provide: GearItemRepository, useValue: gearItemRepository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();
  });

  it('documentation/Subfeatures/Pakolás.md: item name is a live join to GearItem.name, not a snapshot copy', async () => {
    await createAndInit(
      sessionDetail({ items: [sessionItem({ id: 'i1', gearItemId: 'g1' })] }),
      [gearItem({ id: 'g1', name: 'Ereszkedő 8-as' })],
    );

    expect(fixture.componentInstance.activeItems()[0].name).toBe('Ereszkedő 8-as');
  });

  it('splits items into the active section (not PACKED/NOT_NEEDED) and the done section', async () => {
    await createAndInit(
      sessionDetail({
        items: [
          sessionItem({ id: 'i1', gearItemId: 'g1', status: StatusEnum.NotPacked }),
          sessionItem({ id: 'i2', gearItemId: 'g1', status: StatusEnum.Packed }),
          sessionItem({ id: 'i3', gearItemId: 'g1', status: StatusEnum.NotNeeded }),
          sessionItem({ id: 'i4', gearItemId: 'g1', status: StatusEnum.Prepared }),
        ],
      }),
      [gearItem()],
    );

    expect(fixture.componentInstance.activeItems().map((i) => i.id)).toEqual(['i1', 'i4']);
    expect(fixture.componentInstance.doneItems().map((i) => i.id).sort()).toEqual(['i2', 'i3']);
  });

  it('excludes soft-deleted items from both sections (they never appear in the running list)', async () => {
    await createAndInit(
      sessionDetail({ items: [sessionItem({ id: 'i1', deleted: true }), sessionItem({ id: 'i2', deleted: false })] }),
      [gearItem()],
    );

    expect(fixture.componentInstance.activeItems().map((i) => i.id)).toEqual(['i2']);
  });

  it('sortActiveByStatus(): orders the active section by NOT_PACKED→KNOWN_LOCATION→PREPARED→WEAR_ON_DEPARTURE→BUY_ON_THE_WAY and leaves the done section alone', async () => {
    sessionRepository.reorderItems.and.callFake(async (items) => items);
    await createAndInit(
      sessionDetail({
        items: [
          sessionItem({ id: 'buy', gearItemId: 'g1', status: StatusEnum.BuyOnTheWay, sortOrder: 0 }),
          sessionItem({ id: 'notpacked', gearItemId: 'g1', status: StatusEnum.NotPacked, sortOrder: 1 }),
          sessionItem({ id: 'prepared', gearItemId: 'g1', status: StatusEnum.Prepared, sortOrder: 2 }),
          sessionItem({ id: 'packed', gearItemId: 'g1', status: StatusEnum.Packed, sortOrder: 3 }),
        ],
      }),
      [gearItem()],
    );

    fixture.componentInstance.sortActiveByStatus();
    await Promise.resolve();
    await Promise.resolve();

    const [passedItems] = sessionRepository.reorderItems.calls.mostRecent().args;
    expect(passedItems.map((i) => i.id)).toEqual(['notpacked', 'prepared', 'buy']);
    // The done item must never be part of the status-sort call.
    expect(passedItems.some((i) => i.id === 'packed')).toBe(false);
  });

  it('onStatusChange(): persists the new status and updates only the changed item locally', async () => {
    sessionRepository.updateItemStatus.and.resolveTo(sessionItem({ id: 'i1', status: StatusEnum.Packed }));
    await createAndInit(
      sessionDetail({ items: [sessionItem({ id: 'i1', status: StatusEnum.NotPacked })] }),
      [gearItem()],
    );

    await fixture.componentInstance.onStatusChange(fixture.componentInstance.activeItems()[0], StatusEnum.Packed);

    expect(sessionRepository.updateItemStatus).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'i1', sessionId: 's1' }),
      StatusEnum.Packed,
    );
    expect(fixture.componentInstance.doneItems().map((i) => i.id)).toEqual(['i1']);
  });

  it('moveActiveItem(): swaps two active items and persists the new order', async () => {
    sessionRepository.reorderItems.and.callFake(async (items) => items);
    await createAndInit(
      sessionDetail({
        items: [
          sessionItem({ id: 'a', gearItemId: 'g1', sortOrder: 0 }),
          sessionItem({ id: 'b', gearItemId: 'g1', sortOrder: 1 }),
        ],
      }),
      [gearItem()],
    );

    await fixture.componentInstance.moveActiveItem(0, 1);

    const [passedItems] = sessionRepository.reorderItems.calls.mostRecent().args;
    expect(passedItems.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('moveActiveItem(): is a no-op when the target index is out of range', async () => {
    await createAndInit(sessionDetail({ items: [sessionItem({ id: 'a' })] }), [gearItem()]);

    await fixture.componentInstance.moveActiveItem(0, -1);
    await fixture.componentInstance.moveActiveItem(0, 5);

    expect(sessionRepository.reorderItems).not.toHaveBeenCalled();
  });

  it('documentation "Extra eszköz": onItemPicked() adds the item at the end of the list and closes the picker', async () => {
    sessionRepository.addItem.and.resolveTo(sessionItem({ id: 'new-1', gearItemId: 'g2', status: StatusEnum.NotPacked, sortOrder: 1 }));
    await createAndInit(sessionDetail({ items: [sessionItem({ id: 'i1', gearItemId: 'g1' })] }), [gearItem({ id: 'g1' }), gearItem({ id: 'g2', name: 'Sátor' })]);
    fixture.componentInstance.togglePicker();

    await fixture.componentInstance.onItemPicked(gearItem({ id: 'g2', name: 'Sátor' }));

    expect(sessionRepository.addItem).toHaveBeenCalledWith('s1', 'g2', 1);
    expect(fixture.componentInstance.activeItems().map((i) => i.gearItemId)).toEqual(['g1', 'g2']);
    expect(fixture.componentInstance.pickerOpen()).toBe(false);
  });

  it('excludedGearItemIds(): reflects every current item, so the picker disables already-added gear', async () => {
    await createAndInit(
      sessionDetail({ items: [sessionItem({ id: 'i1', gearItemId: 'g1' }), sessionItem({ id: 'i2', gearItemId: 'g2' })] }),
      [gearItem({ id: 'g1' }), gearItem({ id: 'g2' })],
    );

    expect(fixture.componentInstance.excludedGearItemIds()).toEqual(['g1', 'g2']);
  });
});
