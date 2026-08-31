import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { IndoorRoute } from '../../../../api/model/indoorRoute';
import { IndoorRouteRepository, IndoorRouteSaveInput } from '../../../../core/data/indoor-route.repository';
import { IndoorRouteEditPage } from './indoor-route-edit.page';

describe('IndoorRouteEditPage', () => {
  let fixture: ComponentFixture<IndoorRouteEditPage>;
  let component: IndoorRouteEditPage;
  let saveSpy: jasmine.Spy<(input: IndoorRouteSaveInput) => Promise<IndoorRoute>>;

  async function setup(idParam = 'new', gymId = 'g1'): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.resolveTo({
      id: 'r1',
      gymId,
      name: 'Sárga 12',
      discipline: IndoorRoute.DisciplineEnum.Rope,
      grade: '7a',
      absoluteDifficultyIndex: 40,
      sector: null,
      deleted: false,
    });

    await TestBed.configureTestingModule({
      imports: [IndoorRouteEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: IndoorRouteRepository,
          useValue: { load: () => Promise.resolve(), items: signal<IndoorRoute[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: idParam }), parent: { paramMap: convertToParamMap({ gymId }) } },
          },
        },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(IndoorRouteEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('reads the gym id from the parent route param', async () => {
    await setup('new', 'gym-7');
    expect(component.gymId()).toBe('gym-7');
  });

  it('save() forwards the input with the parsed matrix index for the row discipline', async () => {
    await setup();
    component.form.patchValue({ name: '  Sárga 12  ', discipline: IndoorRoute.DisciplineEnum.Rope, grade: '7a' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        gymId: 'g1',
        name: 'Sárga 12',
        discipline: IndoorRoute.DisciplineEnum.Rope,
        absoluteDifficultyIndex: jasmine.any(Number),
      }),
    );
  });

  it('save() does nothing while the grade is unparseable', async () => {
    await setup();
    component.form.patchValue({ name: 'Sárga 12', discipline: IndoorRoute.DisciplineEnum.Rope, grade: 'nope' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
