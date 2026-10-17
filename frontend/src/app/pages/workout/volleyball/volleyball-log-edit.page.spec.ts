import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { VolleyballLog } from '../../../api/model/volleyballLog';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { VolleyballLogRepository, VolleyballLogSaveInput } from '../../../core/data/volleyball-log.repository';
import { VolleyballLogEditPage } from './volleyball-log-edit.page';

describe('VolleyballLogEditPage', () => {
  let fixture: ComponentFixture<VolleyballLogEditPage>;
  let component: VolleyballLogEditPage;
  let saveSpy: jasmine.Spy<(input: VolleyballLogSaveInput) => Promise<VolleyballLog>>;

  async function setup(idParam = 'new'): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.resolveTo({ id: 'v1', date: '2026-10-17', durationMinutes: 60, deleted: false });

    await TestBed.configureTestingModule({
      imports: [VolleyballLogEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: VolleyballLogRepository,
          useValue: {
            load: () => Promise.resolve(),
            loaded: signal(true),
            items: signal<VolleyballLog[]>([]),
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 75 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(NavController), 'navigateBack').and.resolveTo(true);

    fixture = TestBed.createComponent(VolleyballLogEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('previews the conservative kcal regardless of the chosen intensity', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 90, intensity: VolleyballLog.IntensityEnum.Light });
    const light = component.previewKcal();
    component.form.patchValue({ intensity: VolleyballLog.IntensityEnum.Hard });
    expect(component.previewKcal()).toBe(light);
    expect(light).toBeCloseTo(225, 6);
  });

  it('rejects an on-court duration above the cap', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 241 });
    await component.save();
    expect(component.form.controls.durationMinutes.hasError('max')).toBe(true);
    expect(component.showDurationError()).toBe(true);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() forwards the form value to the repository', async () => {
    await setup();
    component.form.patchValue({
      date: '2026-10-17',
      durationMinutes: 75,
      intensity: VolleyballLog.IntensityEnum.Moderate,
      setsPlayed: 3,
      notes: 'edzőmeccs',
    });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        date: '2026-10-17',
        durationMinutes: 75,
        intensity: VolleyballLog.IntensityEnum.Moderate,
        setsPlayed: 3,
        notes: 'edzőmeccs',
      }),
    );
  });

  it('save() does nothing while the required duration is missing', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: null });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
