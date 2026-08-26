import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodRepository } from '../../../core/data/food.repository';
import { FoodBarcodeScannerService } from './food-barcode-scanner.service';
import { FoodPrefillService } from './food-prefill.service';
import { FoodListPage } from './food-list.page';
import { OpenFoodFactsService } from './open-food-facts.service';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

describe('FoodListPage', () => {
  let fixture: ComponentFixture<FoodListPage>;
  let repository: jasmine.SpyObj<Pick<FoodRepository, 'load' | 'remove'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;
  let actionSheetController: jasmine.SpyObj<ActionSheetController>;
  let toastController: jasmine.SpyObj<ToastController>;
  let barcodeScanner: jasmine.SpyObj<FoodBarcodeScannerService>;
  let openFoodFacts: jasmine.SpyObj<OpenFoodFactsService>;
  let prefillService: jasmine.SpyObj<FoodPrefillService>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('FoodRepository', ['load', 'remove']) as never;
    repository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);
    actionSheetController = jasmine.createSpyObj('ActionSheetController', ['create']);
    toastController = jasmine.createSpyObj('ToastController', ['create']);
    barcodeScanner = jasmine.createSpyObj('FoodBarcodeScannerService', ['scan']);
    openFoodFacts = jasmine.createSpyObj('OpenFoodFactsService', ['lookup']);
    prefillService = jasmine.createSpyObj('FoodPrefillService', ['set', 'take']);

    await TestBed.configureTestingModule({
      imports: [FoodListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: FoodRepository, useValue: repository },
        { provide: AlertController, useValue: alertController },
        { provide: ActionSheetController, useValue: actionSheetController },
        { provide: ToastController, useValue: toastController },
        { provide: FoodBarcodeScannerService, useValue: barcodeScanner },
        { provide: OpenFoodFactsService, useValue: openFoodFacts },
        { provide: FoodPrefillService, useValue: prefillService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodListPage);
  });

  it('documentation/Architektúra/Szöveges keresés.md: an accent-exact match ranks ahead of a fold-only match', () => {
    repository.items.set([food({ id: 'plain', name: 'Sor' }), food({ id: 'accented', name: 'Sör' })]);
    fixture.componentInstance.query.set('sör');

    expect(fixture.componentInstance.filteredItems().map((i) => i.id)).toEqual(['accented', 'plain']);
  });

  it('subtitle(): joins brand and store, skipping missing parts', () => {
    expect(fixture.componentInstance.subtitle(food({ brand: 'Nestlé', store: 'Aldi' }))).toBe('Nestlé · Aldi');
    expect(fixture.componentInstance.subtitle(food({ brand: null, store: 'Aldi' }))).toBe('Aldi');
    expect(fixture.componentInstance.subtitle(food({ brand: null, store: null }))).toBe('');
  });

  it('delete(): the confirmation handler removes the food via the repository', async () => {
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(food());
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('f1');
  });

  it('edit(): navigates to the catalog edit route for the item', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.edit(food({ id: 'f2' }));

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/catalog', 'f2']);
  });

  it('addFood(): offers the three add channels, manual navigating straight to the new-item form', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    actionSheetController.create.and.resolveTo(created as never);

    await fixture.componentInstance.addFood();
    const options = actionSheetController.create.calls.mostRecent().args[0] as { buttons: { text: string; handler?: () => void }[] };
    expect(options.buttons.length).toBe(4); // manual, barcode, import, cancel
    await options.buttons[0].handler!();

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/catalog', 'new']);
  });

  it('scanBarcode(): a cancelled scan (null) does not call Open Food Facts or navigate', async () => {
    barcodeScanner.scan.and.resolveTo(null);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    await fixture.componentInstance.scanBarcode();

    expect(openFoodFacts.lookup).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('scanBarcode(): a hit prefills the barcode + mapped fields and navigates to the new-item form', async () => {
    barcodeScanner.scan.and.resolveTo('5901234123457');
    openFoodFacts.lookup.and.resolveTo({ name: 'Tejcsokoládé', energyKcal: 539 });
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    await fixture.componentInstance.scanBarcode();

    expect(prefillService.set).toHaveBeenCalledWith({ barcode: '5901234123457', name: 'Tejcsokoládé', energyKcal: 539 });
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/catalog', 'new']);
  });

  it('scanBarcode(): no OFF hit still prefills the barcode, shows a toast, and navigates', async () => {
    barcodeScanner.scan.and.resolveTo('0000000000000');
    openFoodFacts.lookup.and.resolveTo(null);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    toastController.create.and.resolveTo(created as never);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    await fixture.componentInstance.scanBarcode();

    expect(prefillService.set).toHaveBeenCalledWith({ barcode: '0000000000000' });
    expect(toastController.create).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/catalog', 'new']);
  });
});
