import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Route } from '../../../../api/model/route';
import { RouteRepository, RouteSaveInput } from '../../../../core/data/route.repository';
import { RouteEditPage } from './route-edit.page';

describe('RouteEditPage', () => {
  let fixture: ComponentFixture<RouteEditPage>;
  let component: RouteEditPage;
  let saveSpy: jasmine.Spy<(input: RouteSaveInput) => Promise<Route>>;

  async function setup(routeIdParam = 'new', cragId = 'c1', sectorId = 's1'): Promise<void> {
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
});
