import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { GymColorBand } from '../../../../api/model/gymColorBand';
import {
  GymColorBandHexConflictError,
  GymColorBandRepository,
  GymColorBandSaveInput,
} from '../../../../core/data/gym-color-band.repository';
import { GymColorBandEditPage } from './gym-color-band-edit.page';

describe('GymColorBandEditPage', () => {
  let fixture: ComponentFixture<GymColorBandEditPage>;
  let component: GymColorBandEditPage;
  let saveSpy: jasmine.Spy<(input: GymColorBandSaveInput) => Promise<GymColorBand>>;

  async function setup(idParam = 'new', gymId = 'g1'): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.resolveTo({
      id: 'b1',
      gymId,
      name: 'Piros',
      hexColor: '#ff00aa',
      variant: GymColorBand.VariantEnum.Neutral,
      gradeLower: '6A',
      gradeUpper: '6B',
      absoluteDifficultyIndexLower: 16,
      absoluteDifficultyIndexUpper: 18,
      deleted: false,
    });

    await TestBed.configureTestingModule({
      imports: [GymColorBandEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: GymColorBandRepository,
          useValue: { load: () => Promise.resolve(), items: signal<GymColorBand[]>([]), save: saveSpy, remove: () => Promise.resolve() },
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

    fixture = TestBed.createComponent(GymColorBandEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('reads the gym id from the parent route param', async () => {
    await setup('new', 'gym-42');
    expect(component.gymId()).toBe('gym-42');
  });

  it('save() forwards the canonical input with the parsed matrix indices', async () => {
    await setup();
    component.form.patchValue({ name: 'Piros', hexColor: '#F0A', gradeLower: '6A', gradeUpper: '6B' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        gymId: 'g1',
        name: 'Piros',
        absoluteDifficultyIndexLower: 16,
        absoluteDifficultyIndexUpper: 18,
      }),
    );
  });

  it('save() does nothing while a grade bound is unparseable', async () => {
    await setup();
    component.form.patchValue({ name: 'Piros', hexColor: '#F0A', gradeLower: 'nope', gradeUpper: '6B' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() does nothing while the hex fails the pattern', async () => {
    await setup();
    component.form.patchValue({ name: 'Piros', hexColor: 'red', gradeLower: '6A', gradeUpper: '6B' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() surfaces a hex conflict instead of throwing', async () => {
    await setup();
    saveSpy.and.rejectWith(new GymColorBandHexConflictError('other-band'));
    component.form.patchValue({ name: 'Piros', hexColor: '#F0A', gradeLower: '6A', gradeUpper: '6B' });
    await component.save();
    expect(component.hexConflict()).toBe(true);
  });
});
