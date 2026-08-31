import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Gym } from '../../../../api/model/gym';
import { GymColorBandRepository } from '../../../../core/data/gym-color-band.repository';
import { GymNameConflictError, GymRepository, GymSaveInput } from '../../../../core/data/gym.repository';
import { IndoorRouteRepository } from '../../../../core/data/indoor-route.repository';
import { GymEditPage } from './gym-edit.page';

describe('GymEditPage', () => {
  let fixture: ComponentFixture<GymEditPage>;
  let component: GymEditPage;
  let saveSpy: jasmine.Spy<(input: GymSaveInput) => Promise<Gym>>;

  async function setup(gymIdParam = 'new'): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.resolveTo({
      id: 'g1',
      name: 'Mászócentrum',
      address: null,
      disciplines: [Gym.DisciplinesEnum.Boulder],
      defaultWallHeightMeters: null,
      availableSafetyStyles: null,
      deleted: false,
    });

    await TestBed.configureTestingModule({
      imports: [GymEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: GymRepository,
          useValue: { load: () => Promise.resolve(), items: signal<Gym[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        { provide: GymColorBandRepository, useValue: { load: () => Promise.resolve(), forGym: () => [] } },
        { provide: IndoorRouteRepository, useValue: { load: () => Promise.resolve(), forGym: () => [] } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ gymId: gymIdParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(GymEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts as a fresh gym for the "new" route param', async () => {
    await setup();
    expect(component.gymId()).toBeNull();
  });

  it('save() forwards the trimmed name and the checked disciplines', async () => {
    await setup();
    component.form.patchValue({ name: '  Új terem  ', boulder: true, rope: false });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Új terem', disciplines: [Gym.DisciplinesEnum.Boulder] }),
    );
  });

  it('save() drops the rope-only fields when ROPE is not checked', async () => {
    await setup();
    component.form.patchValue({ name: 'Boulder terem', boulder: true, rope: false, defaultWallHeightMeters: 12, toprope: true });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ defaultWallHeightMeters: null, availableSafetyStyles: null }),
    );
  });

  it('save() carries the rope-only fields when ROPE is checked', async () => {
    await setup();
    component.form.patchValue({ name: 'Köteles terem', boulder: false, rope: true, defaultWallHeightMeters: 15, toprope: true, lead: false });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        disciplines: [Gym.DisciplinesEnum.Rope],
        defaultWallHeightMeters: 15,
        availableSafetyStyles: [Gym.AvailableSafetyStylesEnum.Toprope],
      }),
    );
  });

  it('save() does nothing when the required name is missing', async () => {
    await setup();
    component.form.patchValue({ name: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() does nothing when no discipline is checked', async () => {
    await setup();
    component.form.patchValue({ name: 'Névtelen', boulder: false, rope: false });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() surfaces a name conflict instead of throwing', async () => {
    await setup();
    saveSpy.and.rejectWith(new GymNameConflictError('other-id'));
    component.form.patchValue({ name: 'Ütköző' });
    await component.save();
    expect(component.nameConflict()).toBe(true);
  });
});
