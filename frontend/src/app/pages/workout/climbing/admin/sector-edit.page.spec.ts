import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Sector } from '../../../../api/model/sector';
import { BoulderProblemRepository } from '../../../../core/data/boulder-problem.repository';
import { RouteRepository } from '../../../../core/data/route.repository';
import { SectorRepository, SectorSaveInput } from '../../../../core/data/sector.repository';
import { SectorEditPage } from './sector-edit.page';

describe('SectorEditPage', () => {
  let fixture: ComponentFixture<SectorEditPage>;
  let component: SectorEditPage;
  let saveSpy: jasmine.Spy<(input: SectorSaveInput) => Promise<Sector>>;

  async function setup(sectorIdParam = 'new', cragId = 'c1'): Promise<void> {
    saveSpy = jasmine
      .createSpy('save')
      .and.resolveTo({ id: 's1', cragId, name: 'Főfal', defaultAspect: null, deleted: false });

    await TestBed.configureTestingModule({
      imports: [SectorEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: SectorRepository,
          useValue: { load: () => Promise.resolve(), items: signal<Sector[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        { provide: RouteRepository, useValue: { load: () => Promise.resolve(), forSector: () => [] } },
        { provide: BoulderProblemRepository, useValue: { load: () => Promise.resolve(), forSector: () => [] } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ cragId, sectorId: sectorIdParam }) } },
        },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(SectorEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('reads the crag id from the route param', async () => {
    await setup('new', 'crag-9');
    expect(component.cragId()).toBe('crag-9');
  });

  it('save() forwards the trimmed name pinned to the crag', async () => {
    await setup();
    component.form.patchValue({ name: '  Főfal  ', defaultAspect: 'észak' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ cragId: 'c1', name: 'Főfal', defaultAspect: 'észak' }),
    );
  });

  it('save() does nothing when the required name is missing', async () => {
    await setup();
    component.form.patchValue({ name: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
