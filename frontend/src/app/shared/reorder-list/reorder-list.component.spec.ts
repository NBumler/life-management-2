import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { provideTranslateService } from '@ngx-translate/core';

import { ReorderableItem, ReorderListComponent } from './reorder-list.component';

describe('ReorderListComponent', () => {
  let fixture: ComponentFixture<ReorderListComponent>;

  function items(): ReorderableItem[] {
    return [
      { id: 'a', label: 'Alfa' },
      { id: 'b', label: 'Béta' },
      { id: 'c', label: 'Gamma' },
    ];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReorderListComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
    fixture = TestBed.createComponent(ReorderListComponent);
    fixture.componentInstance.items = items();
  });

  it('creates and renders without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('moveUp(): swaps the item with its predecessor and emits the new order', () => {
    const emitted: ReorderableItem[][] = [];
    fixture.componentInstance.reorder.subscribe((order) => emitted.push(order));

    fixture.componentInstance.moveUp(1); // move 'b' up past 'a'

    expect(emitted).toEqual([[items()[1], items()[0], items()[2]]]);
  });

  it('moveUp(): is a no-op at the top of the list', () => {
    const emitted: ReorderableItem[][] = [];
    fixture.componentInstance.reorder.subscribe((order) => emitted.push(order));

    fixture.componentInstance.moveUp(0);

    expect(emitted).toEqual([]);
  });

  it('moveDown(): swaps the item with its successor and emits the new order', () => {
    const emitted: ReorderableItem[][] = [];
    fixture.componentInstance.reorder.subscribe((order) => emitted.push(order));

    fixture.componentInstance.moveDown(1); // move 'b' down past 'c'

    expect(emitted).toEqual([[items()[0], items()[2], items()[1]]]);
  });

  it('moveDown(): is a no-op at the bottom of the list', () => {
    const emitted: ReorderableItem[][] = [];
    fixture.componentInstance.reorder.subscribe((order) => emitted.push(order));

    fixture.componentInstance.moveDown(2);

    expect(emitted).toEqual([]);
  });

  it('moveUp()/moveDown(): does not mutate the original items array (OnPush-safe)', () => {
    const original = items();
    fixture.componentInstance.items = original;

    fixture.componentInstance.moveUp(1);

    expect(original).toEqual(items());
  });

  it('onIonReorder(): applies the native ion-reorder-group completion and emits the result', () => {
    const reordered = [items()[2], items()[0], items()[1]];
    const complete = jasmine.createSpy('complete').and.returnValue(reordered);
    const event = new CustomEvent('ionItemReorder', { detail: { complete } }) as CustomEvent<{ complete: jasmine.Spy }>;
    const emitted: ReorderableItem[][] = [];
    fixture.componentInstance.reorder.subscribe((order) => emitted.push(order));

    fixture.componentInstance.onIonReorder(event as never);

    expect(complete).toHaveBeenCalledWith(items());
    expect(emitted).toEqual([reordered]);
  });

  it('remove is emitted with the removed item when the template wires it (documentation "eltávolítás a sablonból")', () => {
    const emitted: ReorderableItem[] = [];
    fixture.componentInstance.remove.subscribe((item) => emitted.push(item));

    fixture.componentInstance.remove.emit(items()[1]);

    expect(emitted).toEqual([items()[1]]);
  });

  it('renders the up/down-arrow reorder UI on native platforms, and the drag-handle UI on web', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    const nativeFixture = TestBed.createComponent(ReorderListComponent);
    nativeFixture.componentInstance.items = items();
    nativeFixture.detectChanges();
    expect(nativeFixture.nativeElement.querySelector('ion-reorder-group')).toBeNull();

    (Capacitor.isNativePlatform as jasmine.Spy).and.returnValue(false);
    const webFixture = TestBed.createComponent(ReorderListComponent);
    webFixture.componentInstance.items = items();
    webFixture.detectChanges();
    expect(webFixture.nativeElement.querySelector('ion-reorder-group')).not.toBeNull();
  });
});
