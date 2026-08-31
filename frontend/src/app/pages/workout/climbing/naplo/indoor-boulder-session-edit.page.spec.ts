import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { ClimbingSession } from '../../../../api/model/climbingSession';
import { Gym } from '../../../../api/model/gym';
import { GymColorBand } from '../../../../api/model/gymColorBand';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { GymColorBandRepository } from '../../../../core/data/gym-color-band.repository';
import { GymRepository } from '../../../../core/data/gym.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { IndoorBoulderSessionEditPage } from './indoor-boulder-session-edit.page';

function boulderGym(): Gym {
  return { id: 'g1', name: 'Blokk', address: null, disciplines: [Gym.DisciplinesEnum.Boulder], defaultWallHeightMeters: null, availableSafetyStyles: null, deleted: false };
}

function band(): GymColorBand {
  return {
    id: 'b1',
    gymId: 'g1',
    name: 'Piros',
    hexColor: '#ff0000',
    variant: GymColorBand.VariantEnum.Neutral,
    gradeLower: '6A',
    gradeUpper: '6B',
    absoluteDifficultyIndexLower: 10,
    absoluteDifficultyIndexUpper: 12,
    deleted: false,
  };
}

describe('IndoorBoulderSessionEditPage', () => {
  let fixture: ComponentFixture<IndoorBoulderSessionEditPage>;
  let component: IndoorBoulderSessionEditPage;
  let saveSpy: jasmine.Spy<(draft: ClimbingSessionDraft) => Promise<ClimbingSession>>;

  async function setup(idParam = 'new'): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.callFake(async (d: ClimbingSessionDraft) => ({
      ...d,
      id: d.id || 's1',
      deleted: false,
      attempts: [],
    }));

    await TestBed.configureTestingModule({
      imports: [IndoorBoulderSessionEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: ClimbingSessionRepository,
          useValue: {
            load: () => Promise.resolve(),
            items: signal<ClimbingSession[]>([]),
            byId: () => undefined,
            forContext: () => [],
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        { provide: GymRepository, useValue: { load: () => Promise.resolve(), items: signal<Gym[]>([boulderGym()]) } },
        { provide: GymColorBandRepository, useValue: { load: () => Promise.resolve(), forGym: () => [band()] } },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 70 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(IndoorBoulderSessionEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts as a fresh session for the "new" route param', async () => {
    await setup();
    expect(component.sessionId()).toBeNull();
  });

  it('lists only boulder gyms in the picker', async () => {
    await setup();
    expect(component.boulderGyms().map((g) => g.id)).toEqual(['g1']);
  });

  it('save() does nothing while the required gym is missing', async () => {
    await setup();
    component.form.patchValue({ gymId: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() forwards the INDOOR + BOULDER context, the gym-name snapshot and a mapped attempt', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1', totalSessionDurationMinutes: 60 });
    component.addAttempt();
    const row = component.attempts()[0];
    row.isSuccess.set(true);
    row.userRawInput.set('6B');
    component.pickBand(row, 'b1');

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        locationType: ClimbingSession.LocationTypeEnum.Indoor,
        discipline: ClimbingSession.DisciplineEnum.Boulder,
        gymId: 'g1',
        gymName: 'Blokk',
      }),
    );
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts.length).toBe(1);
    expect(draft.attempts[0].isSuccess).toBe(true);
    expect(draft.attempts[0].colorName).toBe('Piros');
    // A valid free-text Font grade resolves a matrix index.
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
    expect(draft.attempts[0].pitches).toEqual([]);
  });

  it('an attempt with only a colour band takes the band mid index', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1' });
    component.addAttempt();
    component.pickBand(component.attempts()[0], 'b1');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].absoluteDifficultyIndex).toBe(11);
    expect(draft.attempts[0].gradeRange).toBe('6A–6B');
  });
});
