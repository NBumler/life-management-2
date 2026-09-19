import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Route } from '../../../../api/model/route';
import { Sector } from '../../../../api/model/sector';
import { RouteRepository, RouteSaveInput } from '../../../../core/data/route.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { RouteEditPage } from './route-edit.page';

describe('RouteEditPage', () => {
  let fixture: ComponentFixture<RouteEditPage>;
  let component: RouteEditPage;
  let saveSpy: jasmine.Spy<(input: RouteSaveInput) => Promise<Route>>;

  async function setup(
    routeIdParam = 'new',
    cragId = 'c1',
    sectorId = 's1',
    sectors: Sector[] = [],
  ): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.resolveTo({
      id: 'r1',
      sectorId,
      name: 'Sárkányfészek',
      guidebookGrade: '7b+',
      lengthInMeters: null,
      totalPitches: null,
      rockType: null,
      aspect: null,
      deleted: false,
    });

    await TestBed.configureTestingModule({
      imports: [RouteEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: RouteRepository,
          useValue: { load: () => Promise.resolve(), items: signal<Route[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        {
          provide: SectorRepository,
          useValue: { load: () => Promise.resolve(), items: signal<Sector[]>(sectors) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ cragId, sectorId, routeId: routeIdParam }) } },
        },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(RouteEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('reads the sector id from the route param', async () => {
    await setup('new', 'crag-1', 'sector-5');
    expect(component.sectorId()).toBe('sector-5');
  });

  it('backlog/113 — prefills the length from the sector default for a new route', async () => {
    const sector: Sector = { id: 's1', cragId: 'c1', name: 'Napos fal', defaultLengthInMeters: 25, deleted: false };
    await setup('new', 'c1', 's1', [sector]);
    expect(component.form.controls.lengthInMeters.value).toBe(25);
  });

  it('backlog/113 — leaves the length blank when the sector has no default', async () => {
    const sector: Sector = { id: 's1', cragId: 'c1', name: 'Napos fal', defaultLengthInMeters: null, deleted: false };
    await setup('new', 'c1', 's1', [sector]);
    expect(component.form.controls.lengthInMeters.value).toBeNull();
  });

  it('backlog/113 — does not touch the length prefill when editing an existing route', async () => {
    saveSpy = jasmine.createSpy('save');
    await TestBed.configureTestingModule({
      imports: [RouteEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: RouteRepository,
          useValue: {
            load: () => Promise.resolve(),
            items: signal<Route[]>([
              {
                id: 'r1',
                sectorId: 's1',
                name: 'Sárkányfészek',
                guidebookGrade: '7b+',
                lengthInMeters: null,
                totalPitches: null,
                rockType: null,
                aspect: null,
                deleted: false,
              },
            ]),
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        {
          provide: SectorRepository,
          useValue: {
            load: () => Promise.resolve(),
            items: signal<Sector[]>([{ id: 's1', cragId: 'c1', name: 'Napos fal', defaultLengthInMeters: 25, deleted: false }]),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ cragId: 'c1', sectorId: 's1', routeId: 'r1' }) } },
        },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(RouteEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();

    expect(component.form.controls.lengthInMeters.value).toBeNull();
  });

  it('save() forwards the guidebook grade verbatim, pinned to the sector', async () => {
    await setup();
    component.form.patchValue({ name: '  Sárkányfészek  ', guidebookGrade: '  8a/8a+ (?)  ' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ sectorId: 's1', name: 'Sárkányfészek', guidebookGrade: '8a/8a+ (?)' }),
    );
  });

  it('save() does nothing while the required grade is missing', async () => {
    await setup();
    component.form.patchValue({ name: 'Sárkányfészek', guidebookGrade: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() forwards a trimmed topo number, or null when blank (backlog/079)', async () => {
    await setup();
    component.form.patchValue({ name: 'Sárkányfészek', guidebookGrade: '7a', topoNumber: '  12  ' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({ topoNumber: '12' }));

    saveSpy.calls.reset();
    component.form.patchValue({ topoNumber: '   ' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({ topoNumber: null }));
  });
});
