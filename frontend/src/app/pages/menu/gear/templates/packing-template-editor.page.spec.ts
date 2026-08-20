import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { GearItem } from '../../../../api/model/gearItem';
import { PackingTemplateDetail } from '../../../../api/model/packingTemplateDetail';
import { GearItemRepository } from '../../../../core/data/gear-item.repository';
import { PackingTemplateRepository } from '../../../../core/data/packing-template.repository';
import { PackingTemplateEditorPage } from './packing-template-editor.page';

function templateDetail(overrides: Partial<PackingTemplateDetail> = {}): PackingTemplateDetail {
  return { id: 't1', name: 'Tél', notes: null, deleted: false, items: [], ...overrides };
}

describe('PackingTemplateEditorPage', () => {
  let fixture: ComponentFixture<PackingTemplateEditorPage>;
  let repository: jasmine.SpyObj<Pick<PackingTemplateRepository, 'getDetail' | 'save' | 'remove'>>;
  let gearItemRepository: { items: ReturnType<typeof signal<GearItem[]>>; load: jasmine.Spy };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('PackingTemplateRepository', ['getDetail', 'save', 'remove']);
    gearItemRepository = { items: signal<GearItem[]>([]), load: jasmine.createSpy('load').and.resolveTo() };

    await TestBed.configureTestingModule({
      imports: [PackingTemplateEditorPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: PackingTemplateRepository, useValue: repository },
        { provide: GearItemRepository, useValue: gearItemRepository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackingTemplateEditorPage);
  }

  it(
    'documentation/Subfeatures/Sablonok.md "Új sablon mentése után": creating a new template redirects to the ' +
      'template list with ?highlight=<id>, not to the editor',
    async () => {
      await createFixture('new');
      await fixture.componentInstance.ngOnInit();
      repository.save.and.resolveTo(templateDetail({ id: 'new-1' }));
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
      fixture.componentInstance.form.setValue({ name: 'Tél', notes: null });

      await fixture.componentInstance.save();

      expect(navigateSpy).toHaveBeenCalledWith(['/tabs/menu/gear/templates'], {
        queryParams: { highlight: 'new-1' },
        replaceUrl: true,
      });
    },
  );

  it('saving an existing template does not navigate away from the editor', async () => {
    await createFixture('t1');
    repository.getDetail.and.resolveTo(templateDetail({ id: 't1', name: 'Tél' }));
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(templateDetail({ id: 't1', name: 'Tél 2' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.componentInstance.form.setValue({ name: 'Tél 2', notes: null });

    await fixture.componentInstance.save();

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
