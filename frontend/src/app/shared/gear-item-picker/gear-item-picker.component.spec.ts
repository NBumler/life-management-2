import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';

import { GearItem } from '../../api/model/gearItem';
import { GearItemRepository } from '../../core/data/gear-item.repository';
import { GearItemPickerComponent } from './gear-item-picker.component';

function item(overrides: Partial<GearItem> = {}): GearItem {
  return { id: 'g1', name: 'Kötél', notes: null, deleted: false, ...overrides };
}

describe('GearItemPickerComponent', () => {
  let fixture: ComponentFixture<GearItemPickerComponent>;
  let repository: { items: ReturnType<typeof signal<GearItem[]>>; loaded: ReturnType<typeof signal<boolean>>; load: jasmine.Spy };

  function create(catalog: GearItem[], loaded = true): void {
    repository = { items: signal(catalog), loaded: signal(loaded), load: jasmine.createSpy('load').and.resolveTo() };
    TestBed.overrideProvider(GearItemRepository, { useValue: repository });
    fixture = TestBed.createComponent(GearItemPickerComponent);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GearItemPickerComponent],
      providers: [provideTranslateService(), { provide: GearItemRepository, useValue: {} }],
    }).compileComponents();
  });

  it('creates and renders without throwing', () => {
    create([item()]);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('documentation/Subfeatures/Eszközök.md "Megosztott picker": filters by the search query (accent/case-insensitive)', () => {
    create([item({ id: 'a', name: 'Kötél' }), item({ id: 'b', name: 'Sátor' })]);
    fixture.componentInstance.query.set('kotel');

    expect(fixture.componentInstance.sortedItems().map((i) => i.id)).toEqual(['a']);
  });

  it('documentation/Subfeatures/Sablonok.md: already-referenced items are shown disabled and sorted to the end', () => {
    create([
      item({ id: 'a', name: 'Alfa' }),
      item({ id: 'b', name: 'Béta' }), // excluded, would otherwise sort between Alfa and Gamma
      item({ id: 'c', name: 'Gamma' }),
    ]);
    fixture.componentRef.setInput('excludedIds', ['b']);

    expect(fixture.componentInstance.sortedItems().map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('documentation/Architektúra/Szöveges keresés.md: when the query has an accent, the accent-exact match ranks first', () => {
    create([item({ id: 'plain', name: 'Sor' }), item({ id: 'accented', name: 'Sör' })]);
    fixture.componentInstance.query.set('sör');

    expect(fixture.componentInstance.sortedItems().map((i) => i.id)).toEqual(['accented', 'plain']);
  });

  it('isExcluded(): reflects the excludedIds input', () => {
    create([item({ id: 'a' })]);
    fixture.componentRef.setInput('excludedIds', ['a']);

    expect(fixture.componentInstance.isExcluded(item({ id: 'a' }))).toBe(true);
    expect(fixture.componentInstance.isExcluded(item({ id: 'b' }))).toBe(false);
  });

  it('pick(): emits the item when it is not excluded', () => {
    create([item({ id: 'a' })]);
    const emitted: GearItem[] = [];
    fixture.componentInstance.picked.subscribe((picked) => emitted.push(picked));

    fixture.componentInstance.pick(item({ id: 'a' }));

    expect(emitted.map((i) => i.id)).toEqual(['a']);
  });

  it('pick(): does not emit for an excluded (already-added) item — "Pickerben a már a sablonban lévő elemek disabled"', () => {
    create([item({ id: 'a' })]);
    fixture.componentRef.setInput('excludedIds', ['a']);
    const emitted: GearItem[] = [];
    fixture.componentInstance.picked.subscribe((picked) => emitted.push(picked));

    fixture.componentInstance.pick(item({ id: 'a' }));

    expect(emitted).toEqual([]);
  });

  it('ngOnInit(): loads the catalog when not already loaded', async () => {
    create([], false);

    await fixture.componentInstance.ngOnInit();

    expect(repository.load).toHaveBeenCalled();
  });

  it('ngOnInit(): skips loading when the catalog is already loaded', async () => {
    create([item()], true);

    await fixture.componentInstance.ngOnInit();

    expect(repository.load).not.toHaveBeenCalled();
  });
});
