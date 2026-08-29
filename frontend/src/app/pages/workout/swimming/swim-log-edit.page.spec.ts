import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { SwimLog } from '../../../api/model/swimLog';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { SwimLogRepository, SwimLogSaveInput } from '../../../core/data/swim-log.repository';
import { SwimLogEditPage } from './swim-log-edit.page';

describe('SwimLogEditPage', () => {
  let fixture: ComponentFixture<SwimLogEditPage>;
  let component: SwimLogEditPage;
  let saveSpy: jasmine.Spy<(input: SwimLogSaveInput) => Promise<SwimLog>>;

  async function setup(idParam = 'new'): Promise<void> {
    saveSpy = jasmine
      .createSpy('save')
      .and.resolveTo({ id: 's1', date: '2026-08-29', durationMinutes: 30, intensity: SwimLog.IntensityEnum.Casual, deleted: false });

    await TestBed.configureTestingModule({
      imports: [SwimLogEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: SwimLogRepository,
          useValue: { load: () => Promise.resolve(), loaded: signal(true), items: signal<SwimLog[]>([]), save: saveSpy, remove: () => Promise.resolve() },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 80 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(SwimLogEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('hides the pool fields and blocks the pool-pair error for OPEN_WATER', async () => {
    await setup();
    component.form.patchValue({ intensity: SwimLog.IntensityEnum.OpenWater, poolLengthMeters: 25 });
    expect(component.isOpenWater()).toBe(true);
    expect(component.form.errors?.['poolFieldsUnpaired']).toBeUndefined();
  });

  it('flags the form invalid when only one pool field is filled for a pool swim', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 40, poolLengthMeters: 25, lapCount: null });
    expect(component.form.errors?.['poolFieldsUnpaired']).toBe(true);
    expect(component.form.valid).toBe(false);
  });

  it('accepts a complete pool pair and previews the computed distance', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 40, poolLengthMeters: 25, lapCount: 32 });
    expect(component.form.errors).toBeNull();
    expect(component.previewDistanceMeters()).toBe(800);
  });

  it('save() forwards the form value to the repository', async () => {
    await setup();
    component.form.patchValue({ date: '2026-08-29', durationMinutes: 45, intensity: SwimLog.IntensityEnum.CrawlFreestyle });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ date: '2026-08-29', durationMinutes: 45, intensity: SwimLog.IntensityEnum.CrawlFreestyle }),
    );
  });

  it('save() does nothing while the required duration is missing', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: null });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
