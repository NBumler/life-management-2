import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BikeRideLogRepository, BikeRideLogSaveInput } from '../../../core/data/bike-ride-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { BikeRideLogEditPage } from './bike-ride-log-edit.page';

describe('BikeRideLogEditPage', () => {
  let fixture: ComponentFixture<BikeRideLogEditPage>;
  let component: BikeRideLogEditPage;
  let saveSpy: jasmine.Spy<(input: BikeRideLogSaveInput) => Promise<BikeRideLog>>;

  async function setup(idParam = 'new'): Promise<void> {
    saveSpy = jasmine
      .createSpy('save')
      .and.resolveTo({ id: 'b1', date: '2026-08-29', durationMinutes: 60, intensity: BikeRideLog.IntensityEnum.City, deleted: false });

    await TestBed.configureTestingModule({
      imports: [BikeRideLogEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: BikeRideLogRepository,
          useValue: { load: () => Promise.resolve(), loaded: signal(true), items: signal<BikeRideLog[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 80 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(BikeRideLogEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('has no pool-pairing rule — a lone distance keeps the form valid', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 40, distanceKm: 12 });
    expect(component.form.valid).toBe(true);
  });

  it('rejects a negative elevation gain', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 40, elevationGainMeters: -5 });
    expect(component.form.valid).toBe(false);
  });

  it('computes the avg speed and suggests a category when it differs from the pick', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 60, distanceKm: 30, intensity: BikeRideLog.IntensityEnum.City });
    expect(component.avgSpeedKmH()).toBeCloseTo(30, 6);
    expect(component.suggestedIntensityKey()).toBe(`WORKOUT.BIKE.INTENSITY.${BikeRideLog.IntensityEnum.RoadVigorous}`);
  });

  it('hides the suggestion when the pick already matches the speed band', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 60, distanceKm: 12, intensity: BikeRideLog.IntensityEnum.City });
    expect(component.suggestedIntensityKey()).toBeNull();
  });

  it('save() forwards the form value to the repository', async () => {
    await setup();
    component.form.patchValue({ date: '2026-08-29', durationMinutes: 75, intensity: BikeRideLog.IntensityEnum.RoadLeisure, distanceKm: 24.5 });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ date: '2026-08-29', durationMinutes: 75, intensity: BikeRideLog.IntensityEnum.RoadLeisure, distanceKm: 24.5 }),
    );
  });

  it('save() does nothing while the required duration is missing', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: null });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
