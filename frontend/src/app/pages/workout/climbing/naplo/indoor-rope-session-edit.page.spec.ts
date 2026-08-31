import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AscentAttempt } from '../../../../api/model/ascentAttempt';
import { ClimbingSession } from '../../../../api/model/climbingSession';
import { Gym } from '../../../../api/model/gym';
import { IndoorRoute } from '../../../../api/model/indoorRoute';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { GymRepository } from '../../../../core/data/gym.repository';
import { IndoorRouteRepository } from '../../../../core/data/indoor-route.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { IndoorRopeSessionEditPage } from './indoor-rope-session-edit.page';

function ropeGym(overrides: Partial<Gym> = {}): Gym {
  return {
    id: 'g1',
    name: 'Fal',
    address: null,
    disciplines: [Gym.DisciplinesEnum.Rope],
    defaultWallHeightMeters: 15,
    availableSafetyStyles: null,
    deleted: false,
    ...overrides,
  };
}

function boulderGym(): Gym {
  return { id: 'gb', name: 'Blokk', address: null, disciplines: [Gym.DisciplinesEnum.Boulder], defaultWallHeightMeters: null, availableSafetyStyles: null, deleted: false };
}

function ropeRoute(): IndoorRoute {
  return {
    id: 'r1',
    gymId: 'g1',
    name: 'Sárga sáv',
    discipline: IndoorRoute.DisciplineEnum.Rope,
    grade: '6a',
    absoluteDifficultyIndex: 14,
    sector: null,
    deleted: false,
  };
}

describe('IndoorRopeSessionEditPage', () => {
  let fixture: ComponentFixture<IndoorRopeSessionEditPage>;
  let component: IndoorRopeSessionEditPage;
  let saveSpy: jasmine.Spy<(draft: ClimbingSessionDraft) => Promise<ClimbingSession>>;

  async function setup(idParam = 'new', gymList: Gym[] = [ropeGym(), boulderGym()]): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.callFake(async (d: ClimbingSessionDraft) => ({
      ...d,
      id: d.id || 's1',
      deleted: false,
      attempts: [],
    }));

    await TestBed.configureTestingModule({
      imports: [IndoorRopeSessionEditPage],
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
        { provide: GymRepository, useValue: { load: () => Promise.resolve(), items: signal<Gym[]>(gymList) } },
        { provide: IndoorRouteRepository, useValue: { load: () => Promise.resolve(), forGym: () => [ropeRoute()] } },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 70 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(IndoorRopeSessionEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts as a fresh session for the "new" route param', async () => {
    await setup();
    expect(component.sessionId()).toBeNull();
  });

  it('lists only rope gyms in the picker', async () => {
    await setup();
    expect(component.ropeGyms().map((g) => g.id)).toEqual(['g1']);
  });

  it('offers TOPROPE + LEAD by default', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1' });
    expect(component.safetyStyleOptions()).toEqual([
      AscentAttempt.SafetyStyleEnum.Toprope,
      AscentAttempt.SafetyStyleEnum.Lead,
    ]);
  });

  it('narrows the safety-style picker to the gym-configured subset', async () => {
    await setup('new', [ropeGym({ availableSafetyStyles: [Gym.AvailableSafetyStylesEnum.Toprope] })]);
    component.form.patchValue({ gymId: 'g1' });
    expect(component.safetyStyleOptions()).toEqual([AscentAttempt.SafetyStyleEnum.Toprope]);
  });

  it('save() does nothing while the required gym is missing', async () => {
    await setup();
    component.form.patchValue({ gymId: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() forwards the INDOOR + ROPE context, a LEAD attempt and the wall-height length default', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1', totalSessionDurationMinutes: 90 });
    component.addAttempt();
    const row = component.attempts()[0];
    row.isSuccess.set(true);
    row.userRawInput.set('6a+');

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        locationType: ClimbingSession.LocationTypeEnum.Indoor,
        discipline: ClimbingSession.DisciplineEnum.Rope,
        gymId: 'g1',
        gymName: 'Fal',
      }),
    );
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts.length).toBe(1);
    expect(draft.attempts[0].safetyStyle).toBe(AscentAttempt.SafetyStyleEnum.Lead);
    expect(draft.attempts[0].lengthInMeters).toBe(15);
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
    expect(draft.attempts[0].colorBandId).toBeNull();
    expect(draft.attempts[0].pitches).toEqual([]);
  });

  it('picking an indoor route snapshots its name + grade and resolves its stored index', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1' });
    component.addAttempt();
    const row = component.attempts()[0];
    component.pickRoute(row, 'r1');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].indoorRouteId).toBe('r1');
    expect(draft.attempts[0].routeName).toBe('Sárga sáv');
    expect(draft.attempts[0].absoluteDifficultyIndex).toBe(14);
  });

  it('keeps a typed failure point on a missed attempt and drops the ascent style', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1' });
    component.addAttempt();
    const row = component.attempts()[0];
    row.ascentStyle.set(AscentAttempt.AscentStyleEnum.Redpoint);
    row.failurePoint.set('kulcsmozdulat');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].isSuccess).toBe(false);
    expect(draft.attempts[0].ascentStyle).toBeNull();
    expect(draft.attempts[0].failurePoint).toBe('kulcsmozdulat');
  });
});
