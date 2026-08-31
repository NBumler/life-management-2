import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Crag } from '../../../../api/model/crag';
import { CragRepository, CragSaveInput } from '../../../../core/data/crag.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { CragEditPage } from './crag-edit.page';

describe('CragEditPage', () => {
  let fixture: ComponentFixture<CragEditPage>;
  let component: CragEditPage;
  let saveSpy: jasmine.Spy<(input: CragSaveInput) => Promise<Crag>>;

  async function setup(cragIdParam = 'new'): Promise<void> {
    saveSpy = jasmine
      .createSpy('save')
      .and.resolveTo({ id: 'c1', name: 'Sziklakert', latitude: null, longitude: null, defaultRockType: null, deleted: false });

    await TestBed.configureTestingModule({
      imports: [CragEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: CragRepository,
          useValue: { load: () => Promise.resolve(), items: signal<Crag[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        { provide: SectorRepository, useValue: { load: () => Promise.resolve(), forCrag: () => [] } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ cragId: cragIdParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(CragEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts as a fresh crag for the "new" route param', async () => {
    await setup();
    expect(component.cragId()).toBeNull();
  });

  it('save() forwards the trimmed name and the optional GPS', async () => {
    await setup();
    component.form.patchValue({ name: '  Sziklakert  ', latitude: 47.9, longitude: 20.4, defaultRockType: 'mészkő' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Sziklakert', latitude: 47.9, longitude: 20.4, defaultRockType: 'mészkő' }),
    );
  });

  it('save() does nothing when the required name is missing', async () => {
    await setup();
    component.form.patchValue({ name: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() does nothing when the latitude is out of range', async () => {
    await setup();
    component.form.patchValue({ name: 'Sziklakert', latitude: 120 });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
