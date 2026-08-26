import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodRepository } from '../../../core/data/food.repository';
import { FoodImportPage } from './food-import.page';

function row(overrides: Record<number, string> = {}): string {
  const cells = new Array(22).fill('');
  for (const [index, value] of Object.entries(overrides)) {
    cells[Number(index)] = value;
  }
  return cells.join('\t');
}

describe('FoodImportPage', () => {
  let fixture: ComponentFixture<FoodImportPage>;
  let repository: jasmine.SpyObj<Pick<FoodRepository, 'load' | 'save'>> & { items: ReturnType<typeof signal<Food[]>> };
  let toastController: jasmine.SpyObj<ToastController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('FoodRepository', ['load', 'save']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<Food[]>([]);
    toastController = jasmine.createSpyObj('ToastController', ['create']);
    toastController.create.and.resolveTo({ present: jasmine.createSpy('present').and.resolveTo() } as never);

    await TestBed.configureTestingModule({
      imports: [FoodImportPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: FoodRepository, useValue: repository },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodImportPage);
    await fixture.componentInstance.ngOnInit();
  });

  it('classifies pasted rows live as the text changes', () => {
    fixture.componentInstance.text.set([row({ 1: 'Tej' }), row({ 0: 'Aldi' })].join('\n')); // second is missing the required name

    expect(fixture.componentInstance.newRows().length).toBe(1);
    expect(fixture.componentInstance.invalidRows().length).toBe(1);
  });

  it('import(): saves only the new rows, clears the textbox, and navigates back to the catalog', async () => {
    fixture.componentInstance.text.set([row({ 1: 'Tej' }), row({ 1: 'Tej' })].join('\n')); // second is a batch-internal duplicate
    repository.save.and.resolveTo({ id: 'x', name: 'Tej', deleted: false });
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.import();

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.text()).toBe('');
    expect(toastController.create).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/catalog');
  });

  it('import(): does nothing when there are no new rows', async () => {
    fixture.componentInstance.text.set(row({})); // missing name -> invalid, nothing to import

    await fixture.componentInstance.import();

    expect(repository.save).not.toHaveBeenCalled();
  });
});
