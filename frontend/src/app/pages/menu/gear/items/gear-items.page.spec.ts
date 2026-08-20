import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { GearItem } from '../../../../api/model/gearItem';
import { GearItemRepository } from '../../../../core/data/gear-item.repository';
import { GearItemsPage } from './gear-items.page';

function item(overrides: Partial<GearItem> = {}): GearItem {
  return { id: 'g1', name: 'Kötél', notes: null, deleted: false, ...overrides };
}

describe('GearItemsPage', () => {
  let fixture: ComponentFixture<GearItemsPage>;
  let repository: jasmine.SpyObj<Pick<GearItemRepository, 'load' | 'save' | 'remove' | 'countReferences'>> & {
    items: ReturnType<typeof signal<GearItem[]>>;
  };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('GearItemRepository', ['load', 'save', 'remove', 'countReferences']) as never;
    repository.items = signal<GearItem[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [GearItemsPage],
      providers: [
        provideTranslateService(),
        { provide: GearItemRepository, useValue: repository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GearItemsPage);
  });

  it('documentation/Architektúra/Szöveges keresés.md: an accent-exact match ranks ahead of a fold-only match', () => {
    repository.items.set([item({ id: 'plain', name: 'Sor' }), item({ id: 'accented', name: 'Sör' })]);
    fixture.componentInstance.query.set('sör');

    expect(fixture.componentInstance.filteredItems().map((i) => i.id)).toEqual(['accented', 'plain']);
  });

  // Note: provideTranslateService() has no translation set loaded in the test environment, so
  // translate.instant() just echoes the key back untranslated (matching this codebase's established
  // testing convention of never asserting on translated text). These tests instead assert on which
  // i18n keys were composed into the confirmation message — the behavior under test.

  it('documentation/Subfeatures/Eszközök.md "Törlés UI": includes the cascade-hint key when the count is known and non-zero', async () => {
    repository.countReferences.and.resolveTo({ templateCount: 2, sessionCount: 1 });
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(item({ name: 'Kötél' }));

    const options = alertController.create.calls.mostRecent().args[0] as { message: string };
    expect(options.message).toContain('GEAR.ITEMS.DELETE_CONFIRM_MESSAGE');
    expect(options.message).toContain('GEAR.ITEMS.DELETE_CONFIRM_CASCADE');
  });

  it('omits the cascade-hint key when nothing references the item', async () => {
    repository.countReferences.and.resolveTo({ templateCount: 0, sessionCount: 0 });
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(item({ name: 'Kötél' }));

    const options = alertController.create.calls.mostRecent().args[0] as { message: string };
    expect(options.message).toBe('GEAR.ITEMS.DELETE_CONFIRM_MESSAGE');
  });

  it('omits the cascade-hint key when the count is unknown (web, no local store — countReferences() resolves null)', async () => {
    repository.countReferences.and.resolveTo(null);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(item({ name: 'Kötél' }));

    const options = alertController.create.calls.mostRecent().args[0] as { message: string };
    expect(options.message).toBe('GEAR.ITEMS.DELETE_CONFIRM_MESSAGE');
  });

  it('the delete confirmation handler removes the item via the repository', async () => {
    repository.countReferences.and.resolveTo(null);
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(item({ id: 'g1' }));
    const options = alertController.create.calls.mostRecent().args[0] as {
      buttons: { role: string; handler?: () => void }[];
    };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('g1');
  });
});
